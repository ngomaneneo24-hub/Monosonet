import type {SonetMessage, SonetChat, SonetTypingIndicator, SonetReadReceipt} from '#/services/sonetMessagingApi'

// Sonet messaging state types
export interface SonetConvoState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error'
  error?: string
  chat?: SonetChat
  messages: SonetMessage[]
  hasMore: boolean
  isLoadingMore: boolean
  typingUsers: Set<string>
  unreadCount: number
}

export interface SonetConvoItem {
  type: 'message' | 'typing' | 'system'
  id: string
  message?: SonetMessage
  typing?: SonetTypingIndicator
  system?: {
    type: 'date' | 'info'
    content: string
    timestamp: string
  }
}

export interface SonetConvoDispatch {
  type: 
    | 'init'
    | 'set_chat'
    | 'add_message'
    | 'update_message'
    | 'remove_message'
    | 'set_messages'
    | 'add_messages'
    | 'set_typing'
    | 'set_error'
    | 'set_loading'
    | 'set_has_more'
    | 'mark_read'
}

export interface SonetConvoEvent {
  type: 'message_sent' | 'message_received' | 'typing_started' | 'typing_stopped' | 'read_receipt'
  data: any
}

// Sonet messaging query types
export interface SonetListChatsQuery {
  chats: SonetChat[]
  hasMore: boolean
  cursor?: string
}

export interface SonetGetMessagesQuery {
  messages: SonetMessage[]
  hasMore: boolean
  cursor?: string
}

// Sonet messaging API types
export interface SonetSendMessageParams {
  chat_id: string
  content: string
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system'
  attachment_ids?: string[]
  reply_to_message_id?: string
  encryption?: 'none' | 'aes256' | 'e2e'
}

export interface SonetGetMessagesParams {
  chat_id: string
  limit?: number
  cursor?: string
  before?: string
  after?: string
}

export interface SonetGetChatsParams {
  user_id: string
  type?: 'direct' | 'group' | 'channel'
  limit?: number
  cursor?: string
}

export interface SonetCreateChatParams {
  name: string
  description?: string
  type: 'direct' | 'group' | 'channel'
  participant_ids: string[]
  avatar_url?: string
}