import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { Redis } from 'ioredis'
import { Database } from '../database/connection'
import { logger } from '../utils/logger'
import { rateLimiter } from '../middleware/rate-limiter'
import { encryptionService } from '../services/encryption-service'

// View-once message types
export type ViewOnceType = 'image' | 'video' | 'audio' | 'document' | 'voice-note'

// View-once message interface
export interface ViewOnceMessage {
  id: string
  conversationId: string
  senderId: string
  recipientIds: string[]
  messageType: ViewOnceType
  encryptedContent: string
  encryptedMetadata: string
  encryptionKey: string
  iv: string
  tag: string
  expiresAt: Date
  maxViews: number
  currentViews: Map<string, number> // recipientId -> view count
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  auditTrail: ViewOnceAuditEvent[]
}

// Audit events for view-once messages
export interface ViewOnceAuditEvent {
  id: string
  eventType: 'created' | 'viewed' | 'expired' | 'deleted' | 'failed_access'
  userId: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

// View-once message service
export class ViewOnceMessageService {
  private redis: Redis
  private db: Database
  private readonly VIEW_ONCE_PREFIX = 'view_once:'
  private readonly EXPIRY_CHECK_INTERVAL = 60000 // 1 minute
  private readonly MAX_VIEW_ONCE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly MAX_VIEW_ONCE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

  constructor(redis: Redis, db: Database) {
    this.redis = redis
    this.db = db
    this.startExpiryCleanup()
  }

  /**
   * Create a new view-once message
   */
  async createViewOnceMessage(
    conversationId: string,
    senderId: string,
    recipientIds: string[],
    messageType: ViewOnceType,
    content: Buffer,
    metadata: Record<string, any>,
    options: {
      maxViews?: number
      expiresIn?: number // milliseconds
      maxDuration?: number // milliseconds
    } = {}
  ): Promise<ViewOnceMessage> {
    try {
      // Rate limiting check
      const rateLimitKey = `view_once_create:${senderId}`
      const isRateLimited = await rateLimiter.checkLimit(rateLimitKey, 10, 60000) // 10 per minute
      if (isRateLimited) {
        throw new Error('Rate limit exceeded for view-once message creation')
      }

      // Content size validation
      if (content.length > this.MAX_VIEW_ONCE_SIZE) {
        throw new Error(`Content size ${content.length} exceeds maximum allowed size ${this.MAX_VIEW_ONCE_SIZE}`)
      }

      // Generate encryption key and IV
      const encryptionKey = crypto.randomBytes(32)
      const iv = crypto.randomBytes(16)

      // Encrypt content
      const encryptedContent = await encryptionService.encrypt(content, encryptionKey, iv)
      
      // Encrypt metadata
      const metadataString = JSON.stringify(metadata)
      const encryptedMetadata = await encryptionService.encrypt(
        Buffer.from(metadataString, 'utf8'),
        encryptionKey,
        iv
      )

      // Calculate expiry time
      const expiresIn = options.expiresIn || 24 * 60 * 60 * 1000 // Default: 24 hours
      const maxDuration = options.maxDuration || this.MAX_VIEW_ONCE_DURATION
      const actualExpiresIn = Math.min(expiresIn, maxDuration)
      const expiresAt = new Date(Date.now() + actualExpiresIn)

      // Create view-once message
      const viewOnceMessage: ViewOnceMessage = {
        id: uuidv4(),
        conversationId,
        senderId,
        recipientIds,
        messageType,
        encryptedContent: encryptedContent.toString('base64'),
        encryptedMetadata: encryptedMetadata.toString('base64'),
        encryptionKey: encryptionKey.toString('base64'),
        iv: iv.toString('base64'),
        tag: crypto.randomBytes(16).toString('base64'),
        expiresAt,
        maxViews: options.maxViews || 1,
        currentViews: new Map(),
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        auditTrail: [{
          id: uuidv4(),
          eventType: 'created',
          userId: senderId,
          timestamp: new Date(),
          metadata: { messageType, contentSize: content.length }
        }]
      }

      // Store in database
      await this.db.viewOnceMessages.create({
        data: {
          id: viewOnceMessage.id,
          conversationId: viewOnceMessage.conversationId,
          senderId: viewOnceMessage.senderId,
          recipientIds: viewOnceMessage.recipientIds,
          messageType: viewOnceMessage.messageType,
          encryptedContent: viewOnceMessage.encryptedContent,
          encryptedMetadata: viewOnceMessage.encryptedMetadata,
          encryptionKey: viewOnceMessage.encryptionKey,
          iv: viewOnceMessage.iv,
          tag: viewOnceMessage.tag,
          expiresAt: viewOnceMessage.expiresAt,
          maxViews: viewOnceMessage.maxViews,
          currentViews: JSON.stringify(Array.from(viewOnceMessage.currentViews.entries())),
          isDeleted: viewOnceMessage.isDeleted,
          createdAt: viewOnceMessage.createdAt,
          updatedAt: viewOnceMessage.updatedAt,
          auditTrail: JSON.stringify(viewOnceMessage.auditTrail)
        }
      })

      // Store in Redis for fast access
      const redisKey = `${this.VIEW_ONCE_PREFIX}${viewOnceMessage.id}`
      await this.redis.setex(
        redisKey,
        Math.ceil(actualExpiresIn / 1000),
        JSON.stringify(viewOnceMessage)
      )

      // Schedule automatic deletion
      this.scheduleMessageDeletion(viewOnceMessage.id, actualExpiresIn)

      logger.info(`View-once message created: ${viewOnceMessage.id}`, {
        messageId: viewOnceMessage.id,
        conversationId,
        senderId,
        messageType,
        contentSize: content.length,
        expiresAt: viewOnceMessage.expiresAt
      })

      return viewOnceMessage
    } catch (error) {
      logger.error('Failed to create view-once message', {
        error: error.message,
        conversationId,
        senderId,
        messageType
      })
      throw error
    }
  }

  /**
   * Retrieve and view a view-once message (triggers deletion)
   */
  async viewMessage(
    messageId: string,
    userId: string,
    requestInfo: {
      ipAddress?: string
      userAgent?: string
    } = {}
  ): Promise<{
    content: Buffer
    metadata: Record<string, any>
    messageType: ViewOnceType
    isDeleted: boolean
  }> {
    try {
      // Get message from Redis first, then database
      let message = await this.getFromRedis(messageId)
      if (!message) {
        message = await this.getFromDatabase(messageId)
      }

      if (!message) {
        throw new Error('View-once message not found')
      }

      // Check if message is expired
      if (new Date() > message.expiresAt) {
        await this.deleteMessage(messageId, 'expired')
        throw new Error('View-once message has expired')
      }

      // Check if message is deleted
      if (message.isDeleted) {
        throw new Error('View-once message has been deleted')
      }

      // Check if user is a recipient
      if (!message.recipientIds.includes(userId)) {
        await this.auditEvent(messageId, 'failed_access', userId, requestInfo)
        throw new Error('Access denied to view-once message')
      }

      // Check view count limit
      const currentViewCount = message.currentViews.get(userId) || 0
      if (currentViewCount >= message.maxViews) {
        await this.auditEvent(messageId, 'failed_access', userId, {
          ...requestInfo,
          reason: 'max_views_exceeded',
          currentViews: currentViewCount,
          maxViews: message.maxViews
        })
        throw new Error('Maximum view count exceeded for this message')
      }

      // Decrypt content
      const encryptionKey = Buffer.from(message.encryptionKey, 'base64')
      const iv = Buffer.from(message.iv, 'base64')
      
      const content = await encryptionService.decrypt(
        Buffer.from(message.encryptedContent, 'base64'),
        encryptionKey,
        iv
      )

      const metadata = await encryptionService.decrypt(
        Buffer.from(message.encryptedMetadata, 'base64'),
        encryptionKey,
        iv
      )

      const metadataObj = JSON.parse(metadata.toString('utf8'))

      // Increment view count
      message.currentViews.set(userId, currentViewCount + 1)
      message.updatedAt = new Date()

      // Add audit event
      await this.auditEvent(messageId, 'viewed', userId, {
        ...requestInfo,
        viewCount: currentViewCount + 1
      })

      // Check if message should be deleted (all recipients have viewed or max views reached)
      const shouldDelete = this.shouldDeleteMessage(message)
      if (shouldDelete) {
        await this.deleteMessage(messageId, 'all_views_consumed')
      } else {
        // Update message in database and Redis
        await this.updateMessage(message)
      }

      logger.info(`View-once message viewed: ${messageId}`, {
        messageId,
        userId,
        viewCount: currentViewCount + 1,
        isDeleted: shouldDelete
      })

      return {
        content,
        metadata: metadataObj,
        messageType: message.messageType,
        isDeleted: shouldDelete
      }
    } catch (error) {
      logger.error('Failed to view message', {
        error: error.message,
        messageId,
        userId
      })
      throw error
    }
  }

  /**
   * Delete a view-once message
   */
  async deleteMessage(messageId: string, reason: string = 'manual'): Promise<void> {
    try {
      const message = await this.getFromRedis(messageId) || await this.getFromDatabase(messageId)
      if (!message) {
        return
      }

      // Mark as deleted
      message.isDeleted = true
      message.updatedAt = new Date()

      // Add audit event
      await this.auditEvent(messageId, 'deleted', message.senderId, { reason })

      // Update database
      await this.db.viewOnceMessages.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
          auditTrail: JSON.stringify(message.auditTrail)
        }
      })

      // Remove from Redis
      const redisKey = `${this.VIEW_ONCE_PREFIX}${messageId}`
      await this.redis.del(redisKey)

      // Delete actual content from storage (if applicable)
      await this.deleteContentFromStorage(message)

      logger.info(`View-once message deleted: ${messageId}`, {
        messageId,
        reason,
        senderId: message.senderId
      })
    } catch (error) {
      logger.error('Failed to delete view-once message', {
        error: error.message,
        messageId
      })
      throw error
    }
  }

  /**
   * Get message from Redis
   */
  private async getFromRedis(messageId: string): Promise<ViewOnceMessage | null> {
    try {
      const redisKey = `${this.VIEW_ONCE_PREFIX}${messageId}`
      const data = await this.redis.get(redisKey)
      if (!data) return null

      const message = JSON.parse(data)
      // Convert Map back from serialized form
      message.currentViews = new Map(JSON.parse(message.currentViews))
      message.auditTrail = JSON.parse(message.auditTrail)
      return message
    } catch (error) {
      logger.warn('Failed to get message from Redis', { messageId, error: error.message })
      return null
    }
  }

  /**
   * Get message from database
   */
  private async getFromDatabase(messageId: string): Promise<ViewOnceMessage | null> {
    try {
      const dbMessage = await this.db.viewOnceMessages.findUnique({
        where: { id: messageId }
      })

      if (!dbMessage) return null

      // Convert to ViewOnceMessage format
      const message: ViewOnceMessage = {
        ...dbMessage,
        currentViews: new Map(JSON.parse(dbMessage.currentViews)),
        auditTrail: JSON.parse(dbMessage.auditTrail),
        createdAt: new Date(dbMessage.createdAt),
        updatedAt: new Date(dbMessage.updatedAt),
        expiresAt: new Date(dbMessage.expiresAt)
      }

      // Cache in Redis for future access
      const redisKey = `${this.VIEW_ONCE_PREFIX}${messageId}`
      const ttl = Math.ceil((message.expiresAt.getTime() - Date.now()) / 1000)
      if (ttl > 0) {
        await this.redis.setex(redisKey, ttl, JSON.stringify(message))
      }

      return message
    } catch (error) {
      logger.error('Failed to get message from database', { messageId, error: error.message })
      return null
    }
  }

  /**
   * Update message in both database and Redis
   */
  private async updateMessage(message: ViewOnceMessage): Promise<void> {
    try {
      // Update database
      await this.db.viewOnceMessages.update({
        where: { id: message.id },
        data: {
          currentViews: JSON.stringify(Array.from(message.currentViews.entries())),
          updatedAt: message.updatedAt,
          auditTrail: JSON.stringify(message.auditTrail)
        }
      })

      // Update Redis
      const redisKey = `${this.VIEW_ONCE_PREFIX}${message.id}`
      const ttl = Math.ceil((message.expiresAt.getTime() - Date.now()) / 1000)
      if (ttl > 0) {
        await this.redis.setex(redisKey, ttl, JSON.stringify(message))
      }
    } catch (error) {
      logger.error('Failed to update message', { messageId: message.id, error: error.message })
      throw error
    }
  }

  /**
   * Check if message should be deleted
   */
  private shouldDeleteMessage(message: ViewOnceMessage): boolean {
    // Check if all recipients have viewed the message
    const allRecipientsViewed = message.recipientIds.every(recipientId => {
      const viewCount = message.currentViews.get(recipientId) || 0
      return viewCount >= message.maxViews
    })

    return allRecipientsViewed
  }

  /**
   * Add audit event
   */
  private async auditEvent(
    messageId: string,
    eventType: ViewOnceAuditEvent['eventType'],
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: ViewOnceAuditEvent = {
        id: uuidv4(),
        eventType,
        userId,
        timestamp: new Date(),
        metadata
      }

      // Update message audit trail
      const message = await this.getFromRedis(messageId) || await this.getFromDatabase(messageId)
      if (message) {
        message.auditTrail.push(event)
        await this.updateMessage(message)
      }

      // Log audit event
      logger.info('View-once audit event', {
        messageId,
        eventType,
        userId,
        metadata
      })
    } catch (error) {
      logger.error('Failed to add audit event', {
        error: error.message,
        messageId,
        eventType,
        userId
      })
    }
  }

  /**
   * Delete content from storage
   */
  private async deleteContentFromStorage(message: ViewOnceMessage): Promise<void> {
    try {
      // This would integrate with your file storage service
      // For now, we just log the deletion
      logger.info('Content deletion requested from storage', {
        messageId: message.id,
        messageType: message.messageType
      })
    } catch (error) {
      logger.error('Failed to delete content from storage', {
        error: error.message,
        messageId: message.id
      })
    }
  }

  /**
   * Schedule message deletion
   */
  private scheduleMessageDeletion(messageId: string, delayMs: number): void {
    setTimeout(async () => {
      try {
        await this.deleteMessage(messageId, 'expired')
      } catch (error) {
        logger.error('Failed to delete expired message', {
          error: error.message,
          messageId
        })
      }
    }, delayMs)
  }

  /**
   * Start periodic cleanup of expired messages
   */
  private startExpiryCleanup(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredMessages()
      } catch (error) {
        logger.error('Failed to cleanup expired messages', { error: error.message })
      }
    }, this.EXPIRY_CHECK_INTERVAL)
  }

  /**
   * Cleanup expired messages
   */
  private async cleanupExpiredMessages(): Promise<void> {
    try {
      const expiredMessages = await this.db.viewOnceMessages.findMany({
        where: {
          expiresAt: { lt: new Date() },
          isDeleted: false
        },
        select: { id: true }
      })

      for (const message of expiredMessages) {
        await this.deleteMessage(message.id, 'expired')
      }

      if (expiredMessages.length > 0) {
        logger.info(`Cleaned up ${expiredMessages.length} expired view-once messages`)
      }
    } catch (error) {
      logger.error('Failed to cleanup expired messages', { error: error.message })
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats(messageId: string): Promise<{
    totalViews: number
    recipientViews: Record<string, number>
    isDeleted: boolean
    expiresAt: Date
    auditTrail: ViewOnceAuditEvent[]
  } | null> {
    try {
      const message = await this.getFromRedis(messageId) || await this.getFromDatabase(messageId)
      if (!message) return null

      const totalViews = Array.from(message.currentViews.values()).reduce((sum, count) => sum + count, 0)
      const recipientViews = Object.fromEntries(message.currentViews)

      return {
        totalViews,
        recipientViews,
        isDeleted: message.isDeleted,
        expiresAt: message.expiresAt,
        auditTrail: message.auditTrail
      }
    } catch (error) {
      logger.error('Failed to get message stats', { error: error.message, messageId })
      return null
    }
  }
}

// Export singleton instance
export const viewOnceMessageService = new ViewOnceMessageService(
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
  new Database()
)