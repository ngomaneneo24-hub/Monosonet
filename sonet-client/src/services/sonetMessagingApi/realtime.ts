import {EventEmitter} from 'events'
import type {SonetChat, SonetMessage, SonetUser} from './types'

export interface RealtimeMessage {
  id: string
  chatId: string
  content: string
  senderId: string
  timestamp: string
  type: 'text' | 'file' | 'voice' | 'reaction'
  metadata?: {
    fileId?: string
    fileName?: string
    fileSize?: number
    fileType?: string
    voiceDuration?: number
    reactionType?: string
    replyTo?: string
  }
  encryptionStatus: 'encrypted' | 'decrypted' | 'failed'
}

export interface RealtimeEvent {
  type: 'message' | 'typing' | 'online' | 'offline' | 'read_receipt' | 'reaction'
  data: any
  timestamp: string
}

export interface TypingIndicator {
  chatId: string
  userId: string
  userName: string
  isTyping: boolean
  timestamp: string
}

export interface ReadReceipt {
  chatId: string
  userId: string
  messageId: string
  timestamp: string
}

export interface OnlineStatus {
  userId: string
  isOnline: boolean
  lastSeen: string
  status?: 'online' | 'away' | 'busy' | 'offline'
}

export class SonetRealtimeMessaging extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnected = false
  private messageQueue: RealtimeMessage[] = []
  private typingIndicators = new Map<string, TypingIndicator>()
  private onlineStatuses = new Map<string, OnlineStatus>()

  constructor(private apiUrl: string, private authToken: string) {
    super()
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.on('message', this.handleMessage.bind(this))
    this.on('typing', this.handleTyping.bind(this))
    this.on('online_status', this.handleOnlineStatus.bind(this))
    this.on('read_receipt', this.handleReadReceipt.bind(this))
    this.on('reaction', this.handleReaction.bind(this))
  }

  // Connect to real-time messaging service
  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(`${this.apiUrl}/realtime?token=${this.authToken}`)
      
      this.ws.onopen = () => {
        // Debug logging removed for production
        this.isConnected = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.processMessageQueue()
        this.emit('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleRealtimeEvent(data)
        } catch (error) {
          console.error('Failed to parse real-time message:', error)
        }
      }

      this.ws.onclose = () => {
        // Debug logging removed for production
        this.isConnected = false
        this.stopHeartbeat()
        this.emit('disconnected')
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('Sonet real-time connection error:', error)
        this.emit('error', error)
      }
    } catch (error) {
      console.error('Failed to establish real-time connection:', error)
      throw error
    }
  }

  // Disconnect from real-time service
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.stopHeartbeat()
  }

  // Send message through real-time connection
  async sendMessage(message: RealtimeMessage): Promise<void> {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify({
          type: 'message',
          data: message
        }))
        this.emit('message_sent', message)
      } catch (error) {
        console.error('Failed to send real-time message:', error)
        // Queue message for later if connection is lost
        this.messageQueue.push(message)
        throw error
      }
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
      throw new Error('Real-time connection not available')
    }
  }

  // Send typing indicator
  sendTypingIndicator(chatId: string, isTyping: boolean): void {
    if (this.isConnected && this.ws) {
      const typingIndicator: TypingIndicator = {
        chatId,
        userId: 'current_user', // Will be replaced with actual user ID
        userName: 'Current User', // Will be replaced with actual user name
        isTyping,
        timestamp: new Date().toISOString()
      }

      this.ws.send(JSON.stringify({
        type: 'typing',
        data: typingIndicator
      }))
    }
  }

  // Send read receipt
  sendReadReceipt(chatId: string, messageId: string): void {
    if (this.isConnected && this.ws) {
      const readReceipt: ReadReceipt = {
        chatId,
        userId: 'current_user', // Will be replaced with actual user ID
        messageId,
        timestamp: new Date().toISOString()
      }

      this.ws.send(JSON.stringify({
        type: 'read_receipt',
        data: readReceipt
      }))
    }
  }

  // Send reaction
  sendReaction(chatId: string, messageId: string, reactionType: string): void {
    if (this.isConnected && this.ws) {
      const reaction: RealtimeMessage = {
        id: `reaction_${Date.now()}`,
        chatId,
        content: reactionType,
        senderId: 'current_user', // Will be replaced with actual user ID
        timestamp: new Date().toISOString(),
        type: 'reaction',
        metadata: {
          reactionType,
          replyTo: messageId
        },
        encryptionStatus: 'encrypted'
      }

      this.ws.send(JSON.stringify({
        type: 'reaction',
        data: reaction
      }))
    }
  }

  // Join chat room for real-time updates
  joinChat(chatId: string): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'join_chat',
        data: { chatId }
      }))
    }
  }

  // Leave chat room
  leaveChat(chatId: string): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'leave_chat',
        data: { chatId }
      }))
    }
  }

  // Username incoming real-time events
  private handleRealtimeEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'message':
        this.emit('message', event.data)
        break
      case 'typing':
        this.emit('typing', event.data)
        break
      case 'online_status':
        this.emit('online_status', event.data)
        break
      case 'read_receipt':
        this.emit('read_receipt', event.data)
        break
      case 'reaction':
        this.emit('reaction', event.data)
        break
      default:
        console.warn('Unknown real-time event type:', event.type)
    }
  }

  // Handle incoming messages
  private handleMessage(message: RealtimeMessage): void {
    // Update typing indicators
    if (message.type === 'text') {
      this.clearTypingIndicator(message.chatId, message.senderId)
    }
    
    this.emit('new_message', message)
  }

  // Handle typing indicators
  private handleTyping(typingIndicator: TypingIndicator): void {
    const key = `${typingIndicator.chatId}_${typingIndicator.userId}`
    
    if (typingIndicator.isTyping) {
      this.typingIndicators.set(key, typingIndicator)
    } else {
      this.typingIndicators.delete(key)
    }
    
    this.emit('typing_update', typingIndicator)
  }

  // Username online status updates
  private handleOnlineStatus(status: OnlineStatus): void {
    this.onlineStatuses.set(status.userId, status)
    this.emit('online_status_update', status)
  }

  // Username read receipts
  private handleReadReceipt(receipt: ReadReceipt): void {
    this.emit('read_receipt_update', receipt)
  }

  // Username reactions
  private handleReaction(reaction: RealtimeMessage): void {
    this.emit('reaction_update', reaction)
  }

  // Clear typing indicator for a user in a chat
  private clearTypingIndicator(chatId: string, userId: string): void {
    const key = `${chatId}_${userId}`
    this.typingIndicators.delete(key)
  }

  // Get current typing indicators for a chat
  getTypingIndicators(chatId: string): TypingIndicator[] {
    return Array.from(this.typingIndicators.values())
      .filter(indicator => indicator.chatId === chatId)
  }

  // Get online status for a user
  getUserOnlineStatus(userId: string): OnlineStatus | undefined {
    return this.onlineStatuses.get(userId)
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() }
        }))
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Process queued messages
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.sendMessage(message).catch(error => {
          console.error('Failed to send queued message:', error)
          // Put message back in queue
          this.messageQueue.unshift(message)
        })
      }
    }
  }

  // Attempt to reconnect
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      // Debug logging removed for production
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached')
      this.emit('reconnect_failed')
    }
  }

  // Check connection status
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      messageQueueLength: this.messageQueue.length,
      typingIndicatorsCount: this.typingIndicators.size,
      onlineStatusesCount: this.onlineStatuses.size
    }
  }
}