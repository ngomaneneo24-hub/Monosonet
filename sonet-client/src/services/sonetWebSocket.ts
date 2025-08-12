import {SONET_WS_BASE} from '#/env'
import {EventEmitter} from 'events'

export interface SonetWebSocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'user_online' | 'user_offline' | 'chat_update'
  payload: any
  timestamp: string
  message_id?: string
}

export interface SonetTypingEvent {
  chat_id: string
  user_id: string
  is_typing: boolean
  timestamp: string
}

export interface SonetReadReceipt {
  message_id: string
  user_id: string
  read_at: string
}

export interface SonetUserStatus {
  user_id: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

export class SonetWebSocket extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private token: string | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastHeartbeat = 0

  constructor() {
    super()
    this.setMaxListeners(100) // Allow many listeners for different event types
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        reject(new Error('Connection already in progress'))
        return
      }

      this.token = token
      this.isConnecting = true
      this.reconnectAttempts = 0

      try {
        const wsUrl = `${SONET_WS_BASE}/messaging/ws?token=${token}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data: SonetWebSocketMessage = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          this.isConnecting = false
          this.stopHeartbeat()
          this.emit('disconnected', event.code, event.reason)
          
          if (event.code !== 1000) { // Not a normal closure
            this.handleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          this.isConnecting = false
          this.emit('error', error)
          reject(error)
        }

        // Set connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false
            this.ws?.close()
            reject(new Error('Connection timeout'))
          }
        }, 10000)

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnect')
      this.ws = null
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.emit('reconnecting', this.reconnectAttempts)
      
      if (this.token) {
        this.connect(this.token).catch(() => {
          // Reconnect will be handled by the next attempt
        })
      }
    }, delay)
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendHeartbeat()
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private sendHeartbeat(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const heartbeat = {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        message_id: `heartbeat_${Date.now()}`
      }
      
      this.ws.send(JSON.stringify(heartbeat))
      this.lastHeartbeat = Date.now()
    }
  }

  private handleMessage(data: SonetWebSocketMessage): void {
    switch (data.type) {
      case 'message':
        this.emit('message', data.payload)
        break
      case 'typing':
        this.emit('typing', data.payload as SonetTypingEvent)
        break
      case 'read_receipt':
        this.emit('read_receipt', data.payload as SonetReadReceipt)
        break
      case 'user_online':
      case 'user_offline':
        this.emit('user_status', data.payload as SonetUserStatus)
        break
      case 'chat_update':
        this.emit('chat_update', data.payload)
        break
      case 'heartbeat':
        // Respond to server heartbeat
        this.lastHeartbeat = Date.now()
        break
      default:
        console.warn('Unknown WebSocket message type:', data.type)
    }
  }

  // Public methods for sending messages
  sendTyping(chatId: string, isTyping: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'typing',
        payload: {
          chat_id: chatId,
          is_typing: isTyping,
          timestamp: new Date().toISOString()
        }
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  sendReadReceipt(messageId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'read_receipt',
        payload: {
          message_id: messageId,
          timestamp: new Date().toISOString()
        }
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'closed'
      default: return 'unknown'
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }
}

// Export singleton instance
export const sonetWebSocket = new SonetWebSocket()