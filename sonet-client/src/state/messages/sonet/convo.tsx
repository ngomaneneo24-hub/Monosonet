import React, {createContext, useContext, useReducer, useCallback, useEffect, useRef} from 'react'
import {nanoid} from 'nanoid/non-secure'
import {useSonetApi} from '#/state/session/sonet'
import {SonetMessagingApi} from '#/services/sonetMessagingApi'
import type {
  SonetConvoState,
  SonetConvoItem,
  SonetConvoDispatch,
  SonetConvoEvent,
  SonetSendMessageParams,
  SonetGetMessagesParams,
} from './types'
import type {SonetMessage, SonetChat} from '#/services/sonetMessagingApi'

const initialState: SonetConvoState = {
  status: 'uninitialized',
  messages: [],
  hasMore: false,
  isLoadingMore: false,
  typingUsers: new Set(),
  unreadCount: 0,
}

function convoReducer(state: SonetConvoState, action: SonetConvoDispatch): SonetConvoState {
  switch (action.type) {
    case 'init':
      return {...initialState, status: 'loading'}
    
    case 'set_chat':
      return {...state, chat: action.chat, status: 'ready'}
    
    case 'add_message':
      return {
        ...state,
        messages: [...state.messages, action.message],
        unreadCount: state.unreadCount + 1,
      }
    
    case 'update_message':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.message_id === action.message.message_id ? action.message : msg
        ),
      }
    
    case 'remove_message':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.message_id !== action.messageId),
      }
    
    case 'set_messages':
      return {
        ...state,
        messages: action.messages,
        hasMore: action.hasMore,
        isLoadingMore: false,
      }
    
    case 'add_messages':
      return {
        ...state,
        messages: [...action.messages, ...state.messages],
        hasMore: action.hasMore,
        isLoadingMore: false,
      }
    
    case 'set_typing':
      const newTypingUsers = new Set(state.typingUsers)
      if (action.isTyping) {
        newTypingUsers.add(action.userId)
      } else {
        newTypingUsers.delete(action.userId)
      }
      return {...state, typingUsers: newTypingUsers}
    
    case 'set_error':
      return {...state, status: 'error', error: action.error}
    
    case 'set_loading':
      return {...state, isLoadingMore: action.loading}
    
    case 'set_has_more':
      return {...state, hasMore: action.hasMore}
    
    case 'mark_read':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.message_id === action.messageId 
            ? {...msg, status: 'read', read_at: new Date().toISOString()}
            : msg
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }
    
    default:
      return state
  }
}

interface SonetConvoContextValue {
  state: SonetConvoState
  dispatch: React.Dispatch<SonetConvoDispatch>
  sendMessage: (params: SonetSendMessageParams) => Promise<SonetMessage>
  loadMessages: (params: SonetGetMessagesParams) => Promise<void>
  loadMoreMessages: () => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  setTyping: (isTyping: boolean) => Promise<void>
}

const SonetConvoContext = createContext<SonetConvoContextValue | null>(null)

interface SonetConvoProviderProps {
  children: React.ReactNode
  chatId: string
  initialChat?: SonetChat
}

export function SonetConvoProvider({children, chatId, initialChat}: SonetConvoProviderProps) {
  const [state, dispatch] = useReducer(convoReducer, initialState)
  const sonetApi = useSonetApi()
  const messagingApi = useRef<SonetMessagingApi>()
  const eventListeners = useRef<Set<(event: SonetConvoEvent) => void>>(new Set())

  // Initialize messaging API
  useEffect(() => {
    messagingApi.current = new SonetMessagingApi(sonetApi)
  }, [sonetApi])

  // Initialize conversation
  useEffect(() => {
    dispatch({type: 'init'})
    if (initialChat) {
      dispatch({type: 'set_chat', chat: initialChat})
    }
  }, [chatId, initialChat])

  const sendMessage = useCallback(async (params: SonetSendMessageParams): Promise<SonetMessage> => {
    if (!messagingApi.current) throw new Error('Messaging API not initialized')
    
    const message = await messagingApi.current.sendMessage(params)
    dispatch({type: 'add_message', message})
    
    // Emit event
    eventListeners.current.forEach(listener => 
      listener({type: 'message_sent', data: message})
    )
    
    return message
  }, [])

  const loadMessages = useCallback(async (params: SonetGetMessagesParams): Promise<void> => {
    if (!messagingApi.current) throw new Error('Messaging API not initialized')
    
    dispatch({type: 'set_loading', loading: true})
    
    try {
      const result = await messagingApi.current.getMessages(params)
      dispatch({
        type: 'set_messages',
        messages: result.messages,
        hasMore: result.pagination.has_more,
      })
    } catch (error) {
      dispatch({type: 'set_error', error: error instanceof Error ? error.message : 'Unknown error'})
    }
  }, [])

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.isLoadingMore || !state.messages.length) return
    
    const lastMessage = state.messages[state.messages.length - 1]
    await loadMessages({
      chat_id: chatId,
      limit: 20,
      before: lastMessage.created_at,
    })
  }, [state.hasMore, state.isLoadingMore, state.messages, chatId, loadMessages])

  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    if (!messagingApi.current) throw new Error('Messaging API not initialized')
    
    await messagingApi.current.markAsRead(messageId)
    dispatch({type: 'mark_read', messageId})
  }, [])

  const setTyping = useCallback(async (isTyping: boolean): Promise<void> => {
    if (!messagingApi.current) throw new Error('Messaging API not initialized')
    
    await messagingApi.current.setTyping(chatId, isTyping)
    // Note: We don't dispatch typing for self, only for others
  }, [chatId])

  const value: SonetConvoContextValue = {
    state,
    dispatch,
    sendMessage,
    loadMessages,
    loadMoreMessages,
    markAsRead,
    setTyping,
  }

  return (
    <SonetConvoContext.Provider value={value}>
      {children}
    </SonetConvoContext.Provider>
  )
}

export function useSonetConvo(): SonetConvoContextValue {
  const context = useContext(SonetConvoContext)
  if (!context) {
    throw new Error('useSonetConvo must be used within a SonetConvoProvider')
  }
  return context
}

export function useSonetConvoState(): SonetConvoState {
  return useSonetConvo().state
}

export function useSonetConvoDispatch(): React.Dispatch<SonetConvoDispatch> {
  return useSonetConvo().dispatch
}