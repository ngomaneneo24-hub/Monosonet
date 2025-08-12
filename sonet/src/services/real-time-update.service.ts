// Real-Time Update Service - WebSocket connections and live updates
import {Logger} from '../utils/logger'
import {EventEmitter} from 'events'

export interface RealTimeConnection {
  id: string
  userId?: string
  feedType: string
  algorithm: string
  socket: any // WebSocket instance
  lastPing: Date
  isActive: boolean
  subscriptions: string[]
}

export interface RealTimeMessage {
  type: 'engagement_update' | 'feed_refresh' | 'new_video' | 'trending_update' | 'personalization_update' | 'ping' | 'pong'
  payload: any
  timestamp: Date
  userId?: string
  feedType?: string
}

export interface EngagementUpdate {
  videoId: string
  eventType: string
  count: number
  userId?: string
  timestamp: Date
}

export interface FeedRefreshTrigger {
  feedType: string
  algorithm: string
  reason: 'new_content' | 'trending_change' | 'user_preference_update' | 'manual_refresh'
  affectedUserIds?: string[]
  timestamp: Date
}

export class RealTimeUpdateService extends EventEmitter {
  private logger: Logger
  private connections: Map<string, RealTimeConnection>
  private userConnections: Map<string, string[]> // userId -> connectionIds
  private feedSubscriptions: Map<string, string[]> // feedType -> connectionIds
  private heartbeatInterval: NodeJS.Timeout
  private cleanupInterval: NodeJS.Timeout

  constructor(logger: Logger) {
    super()
    this.logger = logger
    this.connections = new Map()
    this.userConnections = new Map()
    this.feedSubscriptions = new Map()
    
    // Start heartbeat and cleanup intervals
    this.startHeartbeat()
    this.startCleanup()
  }

  // Connection Management
  async addConnection(
    connectionId: string,
    socket: any,
    userId?: string,
    feedType: string = 'general',
    algorithm: string = 'default'
  ): Promise<void> {
    try {
      const connection: RealTimeConnection = {
        id: connectionId,
        userId,
        feedType,
        algorithm,
        socket,
        lastPing: new Date(),
        isActive: true,
        subscriptions: []
      }

      this.connections.set(connectionId, connection)

      // Track user connections
      if (userId) {
        if (!this.userConnections.has(userId)) {
          this.userConnections.set(userId, [])
        }
        this.userConnections.get(userId)!.push(connectionId)
      }

      // Track feed subscriptions
      if (!this.feedSubscriptions.has(feedType)) {
        this.feedSubscriptions.set(feedType, [])
      }
      this.feedSubscriptions.get(feedType)!.push(connectionId)

      this.logger.info('Added real-time connection', {connectionId, userId, feedType})
      this.emit('connection_added', connection)

    } catch (error) {
      this.logger.error('Error adding real-time connection', {error, connectionId})
      throw error
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId)
      if (!connection) return

      // Remove from user connections
      if (connection.userId) {
        const userConnections = this.userConnections.get(connection.userId)
        if (userConnections) {
          const index = userConnections.indexOf(connectionId)
          if (index > -1) {
            userConnections.splice(index, 1)
          }
          if (userConnections.length === 0) {
            this.userConnections.delete(connection.userId)
          }
        }
      }

      // Remove from feed subscriptions
      const feedConnections = this.feedSubscriptions.get(connection.feedType)
      if (feedConnections) {
        const index = feedConnections.indexOf(connectionId)
        if (index > -1) {
          feedConnections.splice(index, 1)
        }
        if (feedConnections.length === 0) {
          this.feedSubscriptions.delete(connection.feedType)
        }
      }

      // Close socket and remove connection
      if (connection.socket && connection.socket.readyState === 1) {
        connection.socket.close()
      }
      
      this.connections.delete(connectionId)
      this.logger.info('Removed real-time connection', {connectionId})
      this.emit('connection_removed', connection)

    } catch (error) {
      this.logger.error('Error removing real-time connection', {error, connectionId})
    }
  }

  async updateConnection(
    connectionId: string,
    updates: Partial<RealTimeConnection>
  ): Promise<void> {
    try {
      const connection = this.connections.get(connectionId)
      if (!connection) return

      // Update connection properties
      Object.assign(connection, updates)
      connection.lastPing = new Date()

      this.logger.debug('Updated real-time connection', {connectionId, updates})
      this.emit('connection_updated', connection)

    } catch (error) {
      this.logger.error('Error updating real-time connection', {error, connectionId})
    }
  }

  // Message Broadcasting
  async broadcastToFeed(
    feedType: string,
    message: RealTimeMessage
  ): Promise<void> {
    try {
      const connections = this.feedSubscriptions.get(feedType) || []
      const activeConnections = connections.filter(id => {
        const conn = this.connections.get(id)
        return conn && conn.isActive && conn.socket.readyState === 1
      })

      this.logger.info(`Broadcasting to ${activeConnections.length} connections for feed ${feedType}`, {message})

      for (const connectionId of activeConnections) {
        await this.sendMessage(connectionId, message)
      }

    } catch (error) {
      this.logger.error('Error broadcasting to feed', {error, feedType, message})
    }
  }

  async broadcastToUser(
    userId: string,
    message: RealTimeMessage
  ): Promise<void> {
    try {
      const connectionIds = this.userConnections.get(userId) || []
      const activeConnections = connectionIds.filter(id => {
        const conn = this.connections.get(id)
        return conn && conn.isActive && conn.socket.readyState === 1
      })

      this.logger.info(`Broadcasting to ${activeConnections.length} connections for user ${userId}`, {message})

      for (const connectionId of activeConnections) {
        await this.sendMessage(connectionId, message)
      }

    } catch (error) {
      this.logger.error('Error broadcasting to user', {error, userId, message})
    }
  }

  async broadcastToAll(message: RealTimeMessage): Promise<void> {
    try {
      const activeConnections = Array.from(this.connections.values()).filter(
        conn => conn.isActive && conn.socket.readyState === 1
      )

      this.logger.info(`Broadcasting to ${activeConnections.length} total connections`, {message})

      for (const connection of activeConnections) {
        await this.sendMessage(connection.id, message)
      }

    } catch (error) {
      this.logger.error('Error broadcasting to all', {error, message})
    }
  }

  // Specific Update Types
  async broadcastEngagementUpdate(update: EngagementUpdate): Promise<void> {
    const message: RealTimeMessage = {
      type: 'engagement_update',
      payload: update,
      timestamp: new Date(),
      userId: update.userId
    }

    // Broadcast to all connections (engagement updates are public)
    await this.broadcastToAll(message)
  }

  async broadcastFeedRefresh(trigger: FeedRefreshTrigger): Promise<void> {
    const message: RealTimeMessage = {
      type: 'feed_refresh',
      payload: trigger,
      timestamp: new Date(),
      feedType: trigger.feedType
    }

    // Broadcast to specific feed subscribers
    await this.broadcastToFeed(trigger.feedType, message)

    // Also notify specific users if specified
    if (trigger.affectedUserIds) {
      for (const userId of trigger.affectedUserIds) {
        await this.broadcastToUser(userId, message)
      }
    }
  }

  async broadcastNewVideo(videoData: any, feedTypes: string[]): Promise<void> {
    const message: RealTimeMessage = {
      type: 'new_video',
      payload: videoData,
      timestamp: new Date()
    }

    // Broadcast to relevant feeds
    for (const feedType of feedTypes) {
      await this.broadcastToFeed(feedType, message)
    }
  }

  async broadcastTrendingUpdate(
    trendingData: any,
    feedType: string = 'video'
  ): Promise<void> {
    const message: RealTimeMessage = {
      type: 'trending_update',
      payload: trendingData,
      timestamp: new Date(),
      feedType
    }

    await this.broadcastToFeed(feedType, message)
  }

  async broadcastPersonalizationUpdate(
    userId: string,
    personalizationData: any
  ): Promise<void> {
    const message: RealTimeMessage = {
      type: 'personalization_update',
      payload: personalizationData,
      timestamp: new Date(),
      userId
    }

    await this.broadcastToUser(userId, message)
  }

  // Connection Health
  async pingConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId)
      if (!connection || !connection.isActive) return false

      const pingMessage: RealTimeMessage = {
        type: 'ping',
        payload: {timestamp: Date.now()},
        timestamp: new Date()
      }

      const success = await this.sendMessage(connectionId, pingMessage)
      if (success) {
        connection.lastPing = new Date()
      }
      
      return success

    } catch (error) {
      this.logger.error('Error pinging connection', {error, connectionId})
      return false
    }
  }

  async handlePong(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId)
      if (connection) {
        connection.lastPing = new Date()
        this.logger.debug('Received pong from connection', {connectionId})
      }
    } catch (error) {
      this.logger.error('Error handling pong', {error, connectionId})
    }
  }

  // Utility Methods
  async sendMessage(connectionId: string, message: RealTimeMessage): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId)
      if (!connection || !connection.isActive) return false

      if (connection.socket.readyState === 1) { // WebSocket.OPEN
        connection.socket.send(JSON.stringify(message))
        return true
      } else {
        // Mark connection as inactive
        connection.isActive = false
        return false
      }

    } catch (error) {
      this.logger.error('Error sending message', {error, connectionId, message})
      return false
    }
  }

  getConnectionStats(): {
    totalConnections: number
    activeConnections: number
    userConnections: number
    feedSubscriptions: Record<string, number>
  } {
    const totalConnections = this.connections.size
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => conn.isActive && conn.socket.readyState === 1
    ).length

    const feedSubscriptions: Record<string, number> = {}
    for (const [feedType, connections] of this.feedSubscriptions.entries()) {
      feedSubscriptions[feedType] = connections.length
    }

    return {
      totalConnections,
      activeConnections,
      userConnections: this.userConnections.size,
      feedSubscriptions
    }
  }

  // Private Methods
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const connections = Array.from(this.connections.keys())
        
        for (const connectionId of connections) {
          const isAlive = await this.pingConnection(connectionId)
          
          if (!isAlive) {
            // Connection is dead, remove it
            await this.removeConnection(connectionId)
          }
        }

        this.logger.debug('Heartbeat completed', this.getConnectionStats())

      } catch (error) {
        this.logger.error('Error in heartbeat', {error})
      }
    }, 30000) // 30 seconds
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const now = new Date()
        const staleThreshold = 5 * 60 * 1000 // 5 minutes

        const connections = Array.from(this.connections.values())
        
        for (const connection of connections) {
          const timeSincePing = now.getTime() - connection.lastPing.getTime()
          
          if (timeSincePing > staleThreshold) {
            this.logger.warn('Removing stale connection', {connectionId: connection.id, timeSincePing})
            await this.removeConnection(connection.id)
          }
        }

      } catch (error) {
        this.logger.error('Error in cleanup', {error})
      }
    }, 60000) // 1 minute
  }

  // Cleanup
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Real-Time Update Service')

      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval)
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
      }

      // Close all connections
      const connectionIds = Array.from(this.connections.keys())
      for (const connectionId of connectionIds) {
        await this.removeConnection(connectionId)
      }

      this.logger.info('Real-Time Update Service shutdown complete')

    } catch (error) {
      this.logger.error('Error during shutdown', {error})
    }
  }
}