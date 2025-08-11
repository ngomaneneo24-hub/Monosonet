import React, {createContext, useContext, useMemo} from 'react'
import {USE_SONET_MESSAGING} from '#/env'
import {useConvo, useConvoState, useConvoDispatch} from './convo'
import {useSonetConvo, useSonetConvoState, useSonetConvoDispatch} from './sonet/convo'
import type {ConvoParams} from './convo/types'
import type {SonetSendMessageParams, SonetGetMessagesParams} from './sonet/types'

// Unified interface for both AT Protocol and Sonet messaging
export interface UnifiedConvoState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error'
  error?: string
  messages: any[]
  hasMore: boolean
  isLoadingMore: boolean
  typingUsers: Set<string>
  unreadCount: number
  chat?: any
}

export interface UnifiedConvoApi {
  sendMessage: (params: any) => Promise<any>
  loadMessages: (params: any) => Promise<void>
  loadMoreMessages: () => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  setTyping: (isTyping: boolean) => Promise<void>
  dispatch: any
}

interface UnifiedConvoContextValue {
  state: UnifiedConvoState
  api: UnifiedConvoApi
  isSonet: boolean
}

const UnifiedConvoContext = createContext<UnifiedConvoContextValue | null>(null)

interface UnifiedConvoProviderProps {
  children: React.ReactNode
  convoId: string
  initialChat?: any
}

export function UnifiedConvoProvider({children, convoId, initialChat}: UnifiedConvoProviderProps) {
  const isSonet = USE_SONET_MESSAGING

  if (isSonet) {
    return (
      <SonetConvoProvider chatId={convoId} initialChat={initialChat}>
        <UnifiedConvoProviderInner isSonet={true} />
      </SonetConvoProvider>
    )
  } else {
    return (
      <ConvoProvider convoId={convoId} placeholderData={initialChat}>
        <UnifiedConvoProviderInner isSonet={false} />
      </ConvoProvider>
    )
  }
}

function UnifiedConvoProviderInner({isSonet}: {isSonet: boolean}) {
  const atprotoConvo = useConvo()
  const atprotoState = useConvoState()
  const atprotoDispatch = useConvoDispatch()
  
  const sonetConvo = useSonetConvo()
  const sonetState = useSonetConvoState()
  const sonetDispatch = useSonetConvoDispatch()

  const unifiedState: UnifiedConvoState = useMemo(() => {
    if (isSonet) {
      return {
        status: sonetState.status,
        error: sonetState.error,
        messages: sonetState.messages,
        hasMore: sonetState.hasMore,
        isLoadingMore: sonetState.isLoadingMore,
        typingUsers: sonetState.typingUsers,
        unreadCount: sonetState.unreadCount,
        chat: sonetState.chat,
      }
    } else {
      return {
        status: atprotoState.status,
        error: atprotoState.error,
        messages: atprotoState.items.filter(item => item.type === 'message').map(item => item.message),
        hasMore: atprotoState.hasMore,
        isLoadingMore: atprotoState.isLoadingMore,
        typingUsers: atprotoState.typingUsers,
        unreadCount: atprotoState.unreadCount,
        chat: atprotoState.convo,
      }
    }
  }, [isSonet, atprotoState, sonetState])

  const unifiedApi: UnifiedConvoApi = useMemo(() => {
    if (isSonet) {
      return {
        sendMessage: sonetConvo.sendMessage,
        loadMessages: sonetConvo.loadMessages,
        loadMoreMessages: sonetConvo.loadMoreMessages,
        markAsRead: sonetConvo.markAsRead,
        setTyping: sonetConvo.setTyping,
        dispatch: sonetDispatch,
      }
    } else {
      return {
        sendMessage: atprotoConvo.sendMessage,
        loadMessages: atprotoConvo.loadMessages,
        loadMoreMessages: atprotoConvo.loadMoreMessages,
        markAsRead: atprotoConvo.markAsRead,
        setTyping: atprotoConvo.setTyping,
        dispatch: atprotoDispatch,
      }
    }
  }, [isSonet, atprotoConvo, sonetConvo, atprotoDispatch, sonetDispatch])

  const value: UnifiedConvoContextValue = useMemo(() => ({
    state: unifiedState,
    api: unifiedApi,
    isSonet,
  }), [unifiedState, unifiedApi, isSonet])

  return (
    <UnifiedConvoContext.Provider value={value}>
      {children}
    </UnifiedConvoContext.Provider>
  )
}

export function useUnifiedConvo(): UnifiedConvoContextValue {
  const context = useContext(UnifiedConvoContext)
  if (!context) {
    throw new Error('useUnifiedConvo must be used within a UnifiedConvoProvider')
  }
  return context
}

export function useUnifiedConvoState(): UnifiedConvoState {
  return useUnifiedConvo().state
}

export function useUnifiedConvoApi(): UnifiedConvoApi {
  return useUnifiedConvo().api
}

export function useIsSonetMessaging(): boolean {
  return useUnifiedConvo().isSonet
}