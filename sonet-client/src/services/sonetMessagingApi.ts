import {SONET_API_BASE} from '#/env'
import {sonetCrypto} from './sonetCrypto'
import {sonetWebSocket} from './sonetWebSocket'
import {EventEmitter} from 'events'

function genMessageId(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(16))
  return 'msg_' + Array.from(rnd).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface SonetChat {
  id: string
  name: string
  type: 'direct' | 'group'
  participants: SonetUser[]
  lastMessage?: SonetMessage
  unreadCount: number
  createdAt: string
  updatedAt: string
  isEncrypted: boolean
  encryptionKeyId?: string
}

export interface SonetUser {
  id: string
  username: string
  displayName: string
  avatar?: string
  isOnline: boolean
  lastSeen?: string
  publicKey?: string
}

export interface SonetMessage {
  id: string
  chatId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  timestamp: string
  isEncrypted: boolean
  encryptionData?: {
    keyId: string
    algorithm: string
    iv: string
    authTag: string
  }
  attachments?: SonetAttachment[]
  replyTo?: string
  reactions: SonetReaction[]
  readBy: string[]
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

export interface SonetAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  isEncrypted: boolean
  encryptionData?: {
    keyId: string
    algorithm: string
    iv: string
    authTag: string
  }
}

export interface SonetReaction {
  emoji: string
  userId: string
  timestamp: string
}

export interface CreateChatRequest {
  type: 'direct' | 'group'
  participantIds: string[]
  name?: string
  isEncrypted?: boolean
}

export interface SendMessageRequest {
  chatId: string
  content: string
  type?: 'text' | 'image' | 'file'
  replyTo?: string
  attachments?: File[]
  encrypt?: boolean
}

export interface ChatUpdateEvent {
  type: 'message' | 'participant_joined' | 'participant_left' | 'chat_renamed' | 'encryption_enabled'
  data: any
  timestamp: string
}

export class SonetMessagingApi extends EventEmitter {
  private baseUrl: string
  private authToken: string | null = null
  private isConnected = false
  private chatCache = new Map<string, SonetChat>()
  private messageCache = new Map<string, SonetMessage[]>()
  private userCache = new Map<string, SonetUser>()

  constructor() {
    super()
    this.baseUrl = SONET_API_BASE
    this.setupWebSocketListeners()
  }

  // Authentication
  async authenticate(token: string): Promise<void> {
    this.authToken = token
    
    // Initialize crypto with user ID from token
    const userId = this.extractUserIdFromToken(token)
    if (userId) {
      await sonetCrypto.getOrCreateKeyPair()
    }

    // Connect WebSocket
    try {
      await sonetWebSocket.connect(token, userId || undefined)
      this.isConnected = true
      this.emit('authenticated')
    } catch (error) {
      console.error('Failed to authenticate WebSocket:', error)
      throw error
    }
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      // In a real implementation, you'd decode the JWT token
      // For now, we'll use a simple approach
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub || payload.user_id
    } catch {
      return null
    }
  }

  // Chat Management
  async createChat(request: CreateChatRequest): Promise<SonetChat> {
    try {
      const response = await this.apiRequest('/messaging/chats', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      const chat: SonetChat = response.data
      this.chatCache.set(chat.id, chat)
      
      // If encryption is enabled, perform key exchange
      if (request.isEncrypted) {
        await this.performKeyExchange(chat.id, request.participantIds)
      }

      this.emit('chat_created', chat)
      return chat
    } catch (error) {
      console.error('Failed to create chat:', error)
      throw error
    }
  }

  async getChats(): Promise<SonetChat[]> {
    try {
      const response = await this.apiRequest('/messaging/chats')
      const chats: SonetChat[] = response.data
      
      // Update cache
      chats.forEach(chat => this.chatCache.set(chat.id, chat))
      
      return chats
    } catch (error) {
      console.error('Failed to get chats:', error)
      throw error
    }
  }

  async getChat(chatId: string): Promise<SonetChat> {
    // Check cache first
    if (this.chatCache.has(chatId)) {
      return this.chatCache.get(chatId)!
    }

    try {
      const response = await this.apiRequest(`/messaging/chats/${chatId}`)
      const chat: SonetChat = response.data
      this.chatCache.set(chatId, chat)
      return chat
    } catch (error) {
      console.error('Failed to get chat:', error)
      throw error
    }
  }

  // Message Management
  async sendMessage(request: SendMessageRequest): Promise<SonetMessage> {
    try {
      let encryptedContent = request.content
      let encryptionData: any = undefined
      const clientMsgId = genMessageId()

      // Encrypt message if requested and chat supports encryption
      if (request.encrypt !== false) {
        const chat = await this.getChat(request.chatId)
        if (chat.isEncrypted) {
          const recipient = chat.participants.find(p => p.id !== this.extractUserIdFromToken(this.authToken!))
          if (recipient?.publicKey) {
            const publicKey = await sonetCrypto.importPublicKey(recipient.publicKey)
            const encrypted = await sonetCrypto.encryptMessage(request.content, request.chatId, publicKey)
            
            encryptedContent = encrypted.encryptedContent
            encryptionData = {
              keyId: encrypted.keyId,
              algorithm: encrypted.algorithm,
              iv: encrypted.iv,
              authTag: encrypted.authTag
            }
          }
        }
      }

      const messageData: any = {
        chatId: request.chatId,
        content: encryptedContent,
        type: request.type || 'text',
        replyTo: request.replyTo,
        encrypt: request.encrypt !== false,
        clientMessageId: clientMsgId,
      }

      if (encryptionData) {
        messageData.encryption = {
          v: 1,
          alg: encryptionData.algorithm,
          keyId: encryptionData.keyId,
          iv: encryptionData.iv,
          tag: encryptionData.authTag,
        }
      }

      const response = await this.apiRequest('/messaging/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      const message: SonetMessage = response.data
      
      // Add to cache
      if (!this.messageCache.has(request.chatId)) {
        this.messageCache.set(request.chatId, [])
      }
      this.messageCache.get(request.chatId)!.push(message)

      // Emit real-time event
      this.emit('message_sent', message)
      
      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  async getMessages(chatId: string, limit: number = 50, before?: string): Promise<SonetMessage[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(before && { before })
      })

      const response = await this.apiRequest(`/messaging/chats/${chatId}/messages?${params}`)
      const messages: SonetMessage[] = response.data

      // Decrypt messages if needed
      const decryptedMessages = await Promise.all(
        messages.map(async (message) => {
          if (message.isEncrypted && message.encryptionData) {
            try {
              const decryptedContent = await sonetCrypto.decryptMessage(
                {
                  encryptedContent: message.content,
                  iv: message.encryptionData.iv,
                  authTag: message.encryptionData.authTag,
                  keyId: message.encryptionData.keyId,
                  algorithm: message.encryptionData.algorithm,
                  timestamp: message.timestamp
                },
                chatId
              )
              return { ...message, content: decryptedContent }
            } catch (error) {
              console.error('Failed to decrypt message:', error)
              return { ...message, content: '[Encrypted]' }
            }
          }
          return message
        })
      )

      // Update cache
      if (!this.messageCache.has(chatId)) {
        this.messageCache.set(chatId, [])
      }
      this.messageCache.get(chatId)!.push(...decryptedMessages)

      return decryptedMessages
    } catch (error) {
      console.error('Failed to get messages:', error)
      throw error
    }
  }

  // Real-time Features
  private setupWebSocketListeners(): void {
    sonetWebSocket.on('message', (messageData) => {
      this.handleIncomingMessage(messageData)
    })

    sonetWebSocket.on('typing', (typingData) => {
      this.emit('typing', typingData)
    })

    sonetWebSocket.on('read_receipt', (receiptData) => {
      this.emit('read_receipt', receiptData)
    })

    sonetWebSocket.on('user_status', (statusData) => {
      this.emit('user_status', statusData)
    })

    sonetWebSocket.on('chat_update', (updateData) => {
      this.emit('chat_update', updateData)
    })
  }

  private async handleIncomingMessage(messageData: any): Promise<void> {
    try {
      const message: SonetMessage = messageData
      
      // Decrypt if needed
      if (message.isEncrypted && message.encryptionData) {
        try {
          const decryptedContent = await sonetCrypto.decryptMessage(
            {
              encryptedContent: message.content,
              iv: message.encryptionData.iv,
              authTag: message.encryptionData.authTag,
              keyId: message.encryptionData.keyId,
              algorithm: message.encryptionData.algorithm,
              timestamp: message.timestamp
            },
            message.chatId
          )
          message.content = decryptedContent
        } catch (error) {
          console.error('Failed to decrypt incoming message:', error)
          message.content = '[Encrypted]'
        }
      }

      // Add to cache
      if (!this.messageCache.has(message.chatId)) {
        this.messageCache.set(message.chatId, [])
      }
      this.messageCache.get(message.chatId)!.push(message)

      // Emit event
      this.emit('message_received', message)
    } catch (error) {
      console.error('Failed to handle incoming message:', error)
    }
  }

  // Typing and Read Receipts
  sendTyping(chatId: string, isTyping: boolean): void {
    sonetWebSocket.sendTyping(chatId, isTyping)
  }

  sendReadReceipt(messageId: string): void {
    sonetWebSocket.sendReadReceipt(messageId)
  }

  // Key Exchange
  private async performKeyExchange(chatId: string, participantIds: string[]): Promise<void> {
    try {
      const keyExchangeMessage = await sonetCrypto.createKeyExchangeMessage()
      
      // Send key exchange message to all participants
      await this.apiRequest('/messaging/key-exchange', {
        method: 'POST',
        body: JSON.stringify({
          chatId,
          participantIds,
          keyExchangeMessage
        })
      })

      this.emit('key_exchange_completed', { chatId, participantIds })
    } catch (error) {
      console.error('Failed to perform key exchange:', error)
      throw error
    }
  }

  // File Attachments
  async uploadAttachment(file: File, chatId: string, encrypt: boolean = true): Promise<SonetAttachment> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chatId', chatId)
      formData.append('encrypt', encrypt.toString())

      const response = await this.apiRequest('/messaging/attachments', {
        method: 'POST',
        body: formData
      })

      return response.data
    } catch (error) {
      console.error('Failed to upload attachment:', error)
      throw error
    }
  }

  // Utility Methods
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.authToken) {
      throw new Error('Not authenticated')
    }

    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
      delete config.headers!['Content-Type']
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Cache Management
  clearCache(): void {
    this.chatCache.clear()
    this.messageCache.clear()
    this.userCache.clear()
  }

  getCachedChat(chatId: string): SonetChat | undefined {
    return this.chatCache.get(chatId)
  }

  getCachedMessages(chatId: string): SonetMessage[] | undefined {
    return this.messageCache.get(chatId)
  }

  // Connection Status
  isWebSocketConnected(): boolean {
    return sonetWebSocket.isConnected()
  }

  getConnectionState(): string {
    return sonetWebSocket.getConnectionState()
  }

  disconnect(): void {
    sonetWebSocket.disconnect()
    this.isConnected = false
    this.authToken = null
    this.clearCache()
  }
}

// Export singleton instance
export const sonetMessagingApi = new SonetMessagingApi()