import type {
  SonetConvoState,
  SonetConvoActionTypes,
  DEFAULT_PAGE_SIZE,
  TYPING_TIMEOUT,
  STALE_THRESHOLD
} from './types'

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialSonetConvoState: SonetConvoState = {
  // Chat information
  chat: null,
  chatId: null,
  
  // Message state
  messages: [],
  hasMore: false,
  isLoadingMore: false,
  isLoading: false,
  
  // UI state
  typingUsers: new Set(),
  unreadCount: 0,
  
  // Connection state
  isConnected: false,
  connectionStatus: 'disconnected',
  
  // Encryption state
  encryptionStatus: 'disabled',
  encryptionError: undefined,
  
  // Error handling
  error: null,
  status: 'uninitialized',
  
  // Pagination
  cursor: null,
  pageSize: DEFAULT_PAGE_SIZE,
  
  // Cache management
  lastUpdated: null,
  isStale: false
}

// =============================================================================
// REDUCER
// =============================================================================

export function sonetConvoReducer(
  state: SonetConvoState,
  action: SonetConvoActionTypes
): SonetConvoState {
  switch (action.type) {
    // ========================================================================
    // CHAT ACTIONS
    // ========================================================================
    
    case 'SET_CHAT': {
      const {chat, chatId} = action.payload
      return {
        ...state,
        chat,
        chatId,
        encryptionStatus: chat.isEncrypted ? 'enabled' : 'disabled',
        encryptionError: undefined,
        status: 'ready',
        error: null,
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    case 'UPDATE_CHAT': {
      if (!state.chat) return state
      
      const updatedChat = {...state.chat, ...action.payload}
      return {
        ...state,
        chat: updatedChat,
        encryptionStatus: updatedChat.isEncrypted ? 'enabled' : 'disabled',
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    case 'CLEAR_CHAT': {
      return {
        ...initialSonetConvoState,
        chatId: state.chatId,
        pageSize: state.pageSize
      }
    }
    
    // ========================================================================
    // MESSAGE ACTIONS
    // ========================================================================
    
    case 'SET_MESSAGES': {
      const {messages, replace = false} = action.payload
      
      if (replace) {
        return {
          ...state,
          messages: [...messages],
          status: 'ready',
          error: null,
          lastUpdated: new Date().toISOString(),
          isStale: false
        }
      } else {
        // Merge messages, avoiding duplicates
        const existingIds = new Set(state.messages.map(m => m.id))
        const newMessages = messages.filter(m => !existingIds.has(m.id))
        
        return {
          ...state,
          messages: [...state.messages, ...newMessages],
          status: 'ready',
          error: null,
          lastUpdated: new Date().toISOString(),
          isStale: false
        }
      }
    }
    
    case 'ADD_MESSAGE': {
      const message = action.payload
      
      // Check if message already exists
      if (state.messages.some(m => m.id === message.id)) {
        return state
      }
      
      // Add to beginning for newest messages
      const updatedMessages = [message, ...state.messages]
      
      // Update unread count if message is from someone else
      const currentUserId = state.chat?.participants.find(p => p.id === message.senderId)?.id
      const isOwnMessage = currentUserId === message.senderId
      const newUnreadCount = isOwnMessage ? state.unreadCount : state.unreadCount + 1
      
      return {
        ...state,
        messages: updatedMessages,
        unreadCount: newUnreadCount,
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    case 'UPDATE_MESSAGE': {
      const {messageId, updates} = action.payload
      
      const updatedMessages = state.messages.map(message =>
        message.id === messageId ? {...message, ...updates} : message
      )
      
      return {
        ...state,
        messages: updatedMessages,
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    case 'REMOVE_MESSAGE': {
      const messageId = action.payload
      
      const updatedMessages = state.messages.filter(message => message.id !== messageId)
      
      return {
        ...state,
        messages: updatedMessages,
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    case 'MARK_MESSAGE_AS_READ': {
      const messageId = action.payload
      
      const updatedMessages = state.messages.map(message =>
        message.id === messageId
          ? {...message, readBy: [...(message.readBy || []), 'current_user']}
          : message
      )
      
      // Decrease unread count
      const newUnreadCount = Math.max(0, state.unreadCount - 1)
      
      return {
        ...state,
        messages: updatedMessages,
        unreadCount: newUnreadCount,
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    // ========================================================================
    // PAGINATION ACTIONS
    // ========================================================================
    
    case 'SET_HAS_MORE': {
      return {
        ...state,
        hasMore: action.payload
      }
    }
    
    case 'SET_CURSOR': {
      return {
        ...state,
        cursor: action.payload
      }
    }
    
    case 'SET_PAGE_SIZE': {
      const pageSize = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, action.payload))
      return {
        ...state,
        pageSize
      }
    }
    
    // ========================================================================
    // LOADING STATE ACTIONS
    // ========================================================================
    
    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
        status: action.payload ? 'loading' : state.status === 'loading' ? 'ready' : state.status
      }
    }
    
    case 'SET_LOADING_MORE': {
      return {
        ...state,
        isLoadingMore: action.payload
      }
    }
    
    case 'SET_STATUS': {
      return {
        ...state,
        status: action.payload
      }
    }
    
    // ========================================================================
    // TYPING AND PRESENCE ACTIONS
    // ========================================================================
    
    case 'SET_TYPING': {
      const {userId, isTyping} = action.payload
      const updatedTypingUsers = new Set(state.typingUsers)
      
      if (isTyping) {
        updatedTypingUsers.add(userId)
      } else {
        updatedTypingUsers.delete(userId)
      }
      
      return {
        ...state,
        typingUsers: updatedTypingUsers
      }
    }
    
    case 'CLEAR_TYPING': {
      const userId = action.payload
      const updatedTypingUsers = new Set(state.typingUsers)
      updatedTypingUsers.delete(userId)
      
      return {
        ...state,
        typingUsers: updatedTypingUsers
      }
    }
    
    case 'SET_UNREAD_COUNT': {
      return {
        ...state,
        unreadCount: Math.max(0, action.payload)
      }
    }
    
    // ========================================================================
    // CONNECTION ACTIONS
    // ========================================================================
    
    case 'SET_CONNECTION_STATUS': {
      return {
        ...state,
        connectionStatus: action.payload,
        isConnected: action.payload === 'connected'
      }
    }
    
    case 'SET_CONNECTED': {
      return {
        ...state,
        isConnected: action.payload,
        connectionStatus: action.payload ? 'connected' : 'disconnected'
      }
    }
    
    // ========================================================================
    // ENCRYPTION ACTIONS
    // ========================================================================
    
    case 'SET_ENCRYPTION_STATUS': {
      const {status, error} = action.payload
      return {
        ...state,
        encryptionStatus: status,
        encryptionError: error,
        lastUpdated: new Date().toISOString(),
        isStale: false
      }
    }
    
    case 'ENABLE_ENCRYPTION': {
      return {
        ...state,
        encryptionStatus: 'pending',
        encryptionError: undefined
      }
    }
    
    case 'DISABLE_ENCRYPTION': {
      return {
        ...state,
        encryptionStatus: 'disabled',
        encryptionError: undefined
      }
    }
    
    // ========================================================================
    // ERROR HANDLING ACTIONS
    // ========================================================================
    
    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload,
        status: action.payload ? 'error' : 'ready'
      }
    }
    
    case 'CLEAR_ERROR': {
      return {
        ...state,
        error: null,
        status: state.status === 'error' ? 'ready' : state.status
      }
    }
    
    // ========================================================================
    // CACHE MANAGEMENT ACTIONS
    // ========================================================================
    
    case 'SET_LAST_UPDATED': {
      return {
        ...state,
        lastUpdated: action.payload,
        isStale: false
      }
    }
    
    case 'SET_STALE': {
      return {
        ...state,
        isStale: action.payload
      }
    }
    
    // ========================================================================
    // RESET ACTION
    // ========================================================================
    
    case 'RESET': {
      return {
        ...initialSonetConvoState,
        chatId: state.chatId,
        pageSize: state.pageSize
      }
    }
    
    // ========================================================================
    // DEFAULT CASE
    // ========================================================================
    
    default: {
      console.warn(`Unknown action type: ${(action as any).type}`)
      return state
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isStale(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true
  
  const lastUpdateTime = new Date(lastUpdated).getTime()
  const now = Date.now()
  
  return (now - lastUpdateTime) > STALE_THRESHOLD
}

export function shouldRefresh(state: SonetConvoState): boolean {
  return state.isStale || state.status === 'uninitialized'
}

export function canLoadMore(state: SonetConvoState): boolean {
  return state.hasMore && !state.isLoadingMore && !state.isLoading
}

export function getTypingUsers(state: SonetConvoState): string[] {
  return Array.from(state.typingUsers)
}

export function getUnreadMessages(state: SonetConvoState): SonetMessage[] {
  return state.messages.filter(message => {
    // Filter messages that haven't been read by current user
    return !message.readBy?.includes('current_user')
  })
}