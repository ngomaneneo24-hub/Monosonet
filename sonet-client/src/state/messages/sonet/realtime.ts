import React from 'react'
import EventEmitter from 'eventemitter3'
import {USE_SONET_REALTIME} from '#/env'
import {useSonetApi} from '#/state/session/sonet'
import type {SonetMessage, SonetTypingIndicator, SonetReadReceipt} from '#/services/sonetMessagingApi'

export interface SonetRealtimeEvent {
  type: 'message' | 'typing' | 'read_receipt' | 'status_update'
  data: SonetMessage | SonetTypingIndicator | SonetReadReceipt | any
}

export interface SonetRealtimeConfig {
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
}

const DEFAULT_CONFIG: SonetRealtimeConfig = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
}

export class SonetRealtimeManager {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private isConnecting = false
  private isDisconnecting = false
  private config: SonetRealtimeConfig
  private baseUrl: string
  private accessToken: string | null = null
  
  public events = new EventEmitter<{
    message: [SonetMessage]
    typing: [SonetTypingIndicator]
    read_receipt: [SonetReadReceipt]
    status_update: [any]
    connected: []
    disconnected: []
    error: [Error]
  }>()

  constructor(baseUrl: string, config: Partial<SonetRealtimeConfig> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.config = {...DEFAULT_CONFIG, ...config}
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Reconnect with new token
      this.disconnect()
      this.connect()
    }
  }

  connect(chatId?: string) {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (!USE_SONET_REALTIME) {
      console.log('Sonet real-time messaging disabled')
      return
    }

    this.isConnecting = true
    this.isDisconnecting = false

    try {
      const wsUrl = chatId 
        ? `${this.baseUrl.replace('http', 'ws')}/v1/messages/ws/${chatId}`
        : `${this.baseUrl.replace('http', 'ws')}/v1/messages/ws`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('Sonet WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        // Send authentication
        if (this.accessToken) {
          this.send({type: 'auth', token: this.accessToken})
        }
        
        // Start heartbeat
        this.startHeartbeat()
        
        this.events.emit('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('Sonet WebSocket disconnected:', event.code, event.reason)
        this.isConnecting = false
        this.stopHeartbeat()
        
        if (!this.isDisconnecting && event.code !== 1000) {
          this.scheduleReconnect()
        }
        
        this.events.emit('disconnected')
      }

      this.ws.onerror = (error) => {
        console.error('Sonet WebSocket error:', error)
        this.isConnecting = false
        this.events.emit('error', new Error('WebSocket connection failed'))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting = false
      this.events.emit('error', error as Error)
    }
  }

  disconnect() {
    this.isDisconnecting = true
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }

  sendTyping(chatId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      chat_id: chatId,
      is_typing: isTyping,
    })
  }

  sendReadReceipt(messageId: string) {
    this.send({
      type: 'read_receipt',
      message_id: messageId,
    })
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'message':
        this.events.emit('message', data.message as SonetMessage)
        break
      case 'typing':
        this.events.emit('typing', data.typing as SonetTypingIndicator)
        break
      case 'read_receipt':
        this.events.emit('read_receipt', data.receipt as SonetReadReceipt)
        break
      case 'status_update':
        this.events.emit('status_update', data.status)
        break
      case 'pong':
        // Heartbeat response
        break
      default:
        console.log('Unknown WebSocket message type:', data.type)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send({type: 'ping'})
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get connectionState(): number {
    return this.ws?.readyState || WebSocket.CLOSED
  }
}

// React hook for using the real-time manager
export function useSonetRealtimeManager() {
  const sonetApi = useSonetApi()
  const [manager] = React.useState(() => {
    const baseUrl = sonetApi.baseUrl || 'http://localhost:3000'
    return new SonetRealtimeManager(baseUrl)
  })

  React.useEffect(() => {
    // Set access token when it changes
    const token = sonetApi.tokens?.accessToken || null
    manager.setAccessToken(token)
  }, [manager, sonetApi.tokens?.accessToken])

  React.useEffect(() => {
    return () => {
      manager.disconnect()
    }
  }, [manager])

  return manager
}

// Hook for connecting to a specific chat
export function useSonetChatRealtime(chatId: string) {
  const manager = useSonetRealtimeManager()
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const handleConnected = () => setIsConnected(true)
    const handleDisconnected = () => setIsConnected(false)

    manager.events.on('connected', handleConnected)
    manager.events.on('disconnected', handleDisconnected)

    manager.connect(chatId)

    return () => {
      manager.events.off('connected', handleConnected)
      manager.events.off('disconnected', handleDisconnected)
    }
  }, [manager, chatId])

  return {
    manager,
    isConnected,
    sendTyping: (isTyping: boolean) => manager.sendTyping(chatId, isTyping),
    sendReadReceipt: (messageId: string) => manager.sendReadReceipt(messageId),
  }
}