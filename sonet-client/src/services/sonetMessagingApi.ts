import {SONET_API_BASE} from '#/env'
import {SonetApi} from './sonetApi'

export interface SonetMessage {
  message_id: string
  chat_id: string
  sender_id: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  encryption: 'none' | 'aes256' | 'e2e'
  encrypted_content?: string
  attachments?: string[]
  reply_to_message_id?: string
  is_edited: boolean
  created_at: string
  updated_at: string
  delivered_at?: string
  read_at?: string
}

export interface SonetChat {
  chat_id: string
  name: string
  description: string
  type: 'direct' | 'group' | 'channel'
  creator_id: string
  participant_ids: string[]
  last_message_id?: string
  last_activity: string
  is_archived: boolean
  is_muted: boolean
  avatar_url?: string
  settings: Record<string, string>
  created_at: string
  updated_at: string
}

export interface SonetTypingIndicator {
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

export interface SonetAttachment {
  attachment_id: string
  filename: string
  content_type: string
  size: number
  url: string
  thumbnail_url?: string
  metadata: Record<string, string>
}

export interface SendMessageRequest {
  chat_id: string
  content: string
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system'
  attachment_ids?: string[]
  reply_to_message_id?: string
  encryption?: 'none' | 'aes256' | 'e2e'
}

export interface GetMessagesRequest {
  chat_id: string
  limit?: number
  cursor?: string
  before?: string
  after?: string
}

export interface GetChatsRequest {
  user_id: string
  type?: 'direct' | 'group' | 'channel'
  limit?: number
  cursor?: string
}

export interface CreateChatRequest {
  name: string
  description?: string
  type: 'direct' | 'group' | 'channel'
  participant_ids: string[]
  avatar_url?: string
}

export class SonetMessagingApi {
  private api: SonetApi

  constructor(api: SonetApi) {
    this.api = api
  }

  // Send a message
  async sendMessage(request: SendMessageRequest): Promise<SonetMessage> {
    const response = await this.api.fetchJson('/v1/messages', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.message
  }

  // Get messages for a chat
  async getMessages(request: GetMessagesRequest): Promise<{
    messages: SonetMessage[]
    pagination: {cursor?: string; has_more: boolean}
  }> {
    const params = new URLSearchParams()
    if (request.limit) params.append('limit', request.limit.toString())
    if (request.cursor) params.append('cursor', request.cursor)
    if (request.before) params.append('before', request.before)
    if (request.after) params.append('after', request.after)

    const response = await this.api.fetchJson(`/v1/messages/${request.chat_id}?${params}`)
    return {
      messages: response.messages || [],
      pagination: response.pagination || {has_more: false},
    }
  }

  // Get user's chats
  async getChats(request: GetChatsRequest): Promise<{
    chats: SonetChat[]
    pagination: {cursor?: string; has_more: boolean}
  }> {
    const params = new URLSearchParams()
    if (request.type) params.append('type', request.type)
    if (request.limit) params.append('limit', request.limit.toString())
    if (request.cursor) params.append('cursor', request.cursor)

    const response = await this.api.fetchJson(`/v1/messages/conversations?${params}`)
    return {
      chats: response.conversations || [],
      pagination: response.pagination || {has_more: false},
    }
  }

  // Create a new chat
  async createChat(request: CreateChatRequest): Promise<SonetChat> {
    const response = await this.api.fetchJson('/v1/chats', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    return response.chat
  }

  // Upload attachment
  async uploadAttachment(file: Blob, filename: string, mime: string): Promise<SonetAttachment> {
    const form = new FormData()
    form.append('file', file, filename)
    form.append('content_type', mime)

    const response = await this.api.fetchForm('/v1/messages/attachments', form)
    return response.attachment
  }

  // Set typing indicator
  async setTyping(chat_id: string, is_typing: boolean): Promise<void> {
    await this.api.fetchJson('/v1/messages/typing', {
      method: 'POST',
      body: JSON.stringify({chat_id, is_typing}),
    })
  }

  // Mark message as read
  async markAsRead(message_id: string): Promise<void> {
    await this.api.fetchJson(`/v1/messages/${message_id}/read`, {
      method: 'POST',
    })
  }

  // Search messages
  async searchMessages(query: string, chat_id?: string, limit = 20): Promise<{
    messages: SonetMessage[]
    pagination: {cursor?: string; has_more: boolean}
  }> {
    const params = new URLSearchParams({q: query, limit: limit.toString()})
    if (chat_id) params.append('chat_id', chat_id)

    const response = await this.api.fetchJson(`/v1/messages/search?${params}`)
    return {
      messages: response.messages || [],
      pagination: response.pagination || {has_more: false},
    }
  }

  // Delete message
  async deleteMessage(message_id: string): Promise<void> {
    await this.api.fetchJson(`/v1/messages/${message_id}`, {
      method: 'DELETE',
    })
  }

  // Edit message
  async editMessage(message_id: string, content: string): Promise<SonetMessage> {
    const response = await this.api.fetchJson(`/v1/messages/${message_id}`, {
      method: 'PATCH',
      body: JSON.stringify({content}),
    })
    return response.message
  }
}