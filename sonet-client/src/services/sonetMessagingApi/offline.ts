import AsyncStorage from '@react-native-async-storage/async-storage'
import type {RealtimeMessage} from './realtime'

export interface OfflineMessage extends RealtimeMessage {
  offlineId: string
  retryCount: number
  maxRetries: number
  createdAt: string
  lastAttempt: string
}

export interface OfflineQueueStats {
  totalMessages: number
  pendingMessages: number
  failedMessages: number
  retryCount: number
}

export class SonetOfflineQueue {
  private static readonly STORAGE_KEY = 'sonet_offline_messages'
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 5000 // 5 seconds

  // Add message to offline queue
  static async addMessage(message: RealtimeMessage): Promise<void> {
    try {
      const offlineMessage: OfflineMessage = {
        ...message,
        offlineId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        createdAt: new Date().toISOString(),
        lastAttempt: new Date().toISOString()
      }

      const existingMessages = await this.getOfflineMessages()
      existingMessages.push(offlineMessage)
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(existingMessages)
      )

      console.log('Message added to offline queue:', offlineMessage.offlineId)
    } catch (error) {
      console.error('Failed to add message to offline queue:', error)
      throw error
    }
  }

  // Get all offline messages
  static async getOfflineMessages(): Promise<OfflineMessage[]> {
    try {
      const messagesJson = await AsyncStorage.getItem(this.STORAGE_KEY)
      if (messagesJson) {
        return JSON.parse(messagesJson)
      }
      return []
    } catch (error) {
      console.error('Failed to get offline messages:', error)
      return []
    }
  }

  // Get pending messages (not failed)
  static async getPendingMessages(): Promise<OfflineMessage[]> {
    const messages = await this.getOfflineMessages()
    return messages.filter(msg => msg.retryCount < msg.maxRetries)
  }

  // Get failed messages
  static async getFailedMessages(): Promise<OfflineMessage[]> {
    const messages = await this.getOfflineMessages()
    return messages.filter(msg => msg.retryCount >= msg.maxRetries)
  }

  // Remove message from offline queue
  static async removeMessage(offlineId: string): Promise<void> {
    try {
      const messages = await this.getOfflineMessages()
      const filteredMessages = messages.filter(msg => msg.offlineId !== offlineId)
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(filteredMessages)
      )

      console.log('Message removed from offline queue:', offlineId)
    } catch (error) {
      console.error('Failed to remove message from offline queue:', error)
      throw error
    }
  }

  // Update message retry count
  static async updateRetryCount(offlineId: string, retryCount: number): Promise<void> {
    try {
      const messages = await this.getOfflineMessages()
      const messageIndex = messages.findIndex(msg => msg.offlineId === offlineId)
      
      if (messageIndex !== -1) {
        messages[messageIndex].retryCount = retryCount
        messages[messageIndex].lastAttempt = new Date().toISOString()
        
        await AsyncStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(messages)
        )
      }
    } catch (error) {
      console.error('Failed to update retry count:', error)
      throw error
    }
  }

  // Mark message as sent successfully
  static async markMessageSent(offlineId: string): Promise<void> {
    await this.removeMessage(offlineId)
  }

  // Mark message as failed
  static async markMessageFailed(offlineId: string): Promise<void> {
    try {
      const messages = await this.getOfflineMessages()
      const messageIndex = messages.findIndex(msg => msg.offlineId === offlineId)
      
      if (messageIndex !== -1) {
        messages[messageIndex].retryCount = messages[messageIndex].maxRetries
        messages[messageIndex].lastAttempt = new Date().toISOString()
        
        await AsyncStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(messages)
        )
      }
    } catch (error) {
      console.error('Failed to mark message as failed:', error)
      throw error
    }
  }

  // Clear all offline messages
  static async clearAllMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY)
      console.log('All offline messages cleared')
    } catch (error) {
      console.error('Failed to clear offline messages:', error)
      throw error
    }
  }

  // Clear failed messages
  static async clearFailedMessages(): Promise<void> {
    try {
      const messages = await this.getOfflineMessages()
      const pendingMessages = messages.filter(msg => msg.retryCount < msg.maxRetries)
      
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(pendingMessages)
      )

      console.log('Failed messages cleared')
    } catch (error) {
      console.error('Failed to clear failed messages:', error)
      throw error
    }
  }

  // Get queue statistics
  static async getQueueStats(): Promise<OfflineQueueStats> {
    try {
      const messages = await this.getOfflineMessages()
      const pendingMessages = messages.filter(msg => msg.retryCount < msg.maxRetries)
      const failedMessages = messages.filter(msg => msg.retryCount >= msg.maxRetries)
      const totalRetries = messages.reduce((sum, msg) => sum + msg.retryCount, 0)

      return {
        totalMessages: messages.length,
        pendingMessages: pendingMessages.length,
        failedMessages: failedMessages.length,
        retryCount: totalRetries
      }
    } catch (error) {
      console.error('Failed to get queue stats:', error)
      return {
        totalMessages: 0,
        pendingMessages: 0,
        failedMessages: 0,
        retryCount: 0
      }
    }
  }

  // Check if message should be retried
  static shouldRetryMessage(message: OfflineMessage): boolean {
    if (message.retryCount >= message.maxRetries) {
      return false
    }

    const lastAttempt = new Date(message.lastAttempt)
    const now = new Date()
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime()
    
    // Exponential backoff: 5s, 10s, 20s
    const retryDelay = this.RETRY_DELAY * Math.pow(2, message.retryCount)
    
    return timeSinceLastAttempt >= retryDelay
  }

  // Get next retry time for a message
  static getNextRetryTime(message: OfflineMessage): Date | null {
    if (message.retryCount >= message.maxRetries) {
      return null
    }

    const lastAttempt = new Date(message.lastAttempt)
    const retryDelay = this.RETRY_DELAY * Math.pow(2, message.retryCount)
    
    return new Date(lastAttempt.getTime() + retryDelay)
  }

  // Get messages ready for retry
  static async getMessagesReadyForRetry(): Promise<OfflineMessage[]> {
    const messages = await this.getPendingMessages()
    return messages.filter(msg => this.shouldRetryMessage(msg))
  }

  // Batch operations for better performance
  static async batchUpdateMessages(updates: Array<{
    offlineId: string
    retryCount?: number
    remove?: boolean
  }>): Promise<void> {
    try {
      const messages = await this.getOfflineMessages()
      let hasChanges = false

      for (const update of updates) {
        if (update.remove) {
          const index = messages.findIndex(msg => msg.offlineId === update.offlineId)
          if (index !== -1) {
            messages.splice(index, 1)
            hasChanges = true
          }
        } else if (update.retryCount !== undefined) {
          const message = messages.find(msg => msg.offlineId === update.offlineId)
          if (message) {
            message.retryCount = update.retryCount
            message.lastAttempt = new Date().toISOString()
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        await AsyncStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(messages)
        )
      }
    } catch (error) {
      console.error('Failed to batch update messages:', error)
      throw error
    }
  }

  // Export offline messages for debugging
  static async exportMessages(): Promise<string> {
    try {
      const messages = await this.getOfflineMessages()
      return JSON.stringify(messages, null, 2)
    } catch (error) {
      console.error('Failed to export messages:', error)
      return '[]'
    }
  }

  // Import offline messages (for testing/debugging)
  static async importMessages(messagesJson: string): Promise<void> {
    try {
      const messages = JSON.parse(messagesJson)
      await AsyncStorage.setItem(this.STORAGE_KEY, messagesJson)
      console.log('Messages imported successfully')
    } catch (error) {
      console.error('Failed to import messages:', error)
      throw error
    }
  }
}