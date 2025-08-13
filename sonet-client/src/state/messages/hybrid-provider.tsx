import React, {createContext, useContext, useMemo, useEffect} from 'react'
import {USE_SONET_MESSAGING, USE_SONET_E2E_ENCRYPTION} from '#/env'
// AT Protocol removed - using Sonet messaging only
import {useSonetConvo, useSonetConvoState, useSonetConvoDispatch} from './sonet'
// AT Protocol types removed
import type {SonetSendMessageParams, SonetGetMessagesParams} from './sonet/types'

// Unified interface for Sonet messaging (AT Protocol deprecated)
export interface UnifiedConvoState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error'
  error?: string
  messages: any[]
  hasMore: boolean
  isLoadingMore: boolean
  typingUsers: Set<string>
  unreadCount: number
  chat?: any
  isEncrypted?: boolean
  encryptionStatus?: 'enabled' | 'disabled' | 'pending'
}

export interface UnifiedConvoApi {
  sendMessage: (params: any) => Promise<any>
  loadMessages: (params: any) => Promise<void>
  loadMoreMessages: () => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  setTyping: (isTyping: boolean) => Promise<void>
  enableEncryption?: () => Promise<void>
  getEncryptionStatus?: () => Promise<'enabled' | 'disabled' | 'pending'>
  dispatch: any
}

interface UnifiedConvoContextValue {
  state: UnifiedConvoState
  api: UnifiedConvoApi
  isSonet: boolean
  isEncrypted: boolean
}

const UnifiedConvoContext = createContext<UnifiedConvoContextValue | null>(null)

interface UnifiedConvoProviderProps {
  children: React.ReactNode
  convoId: string
  initialChat?: any
}

export function UnifiedConvoProvider({children, convoId, initialChat}: UnifiedConvoProviderProps) {
  // Force Sonet messaging - AT Protocol is deprecated
  const isSonet = true

  if (isSonet) {
    return (
      <SonetConvoProvider chatId={convoId} initialChat={initialChat}>
        <UnifiedConvoProviderInner isSonet={true} />
      </SonetConvoProvider>
    )
  }
  
  // AT Protocol removed - only Sonet messaging supported
  return null
}

function UnifiedConvoProviderInner({isSonet}: {isSonet: boolean}) {
  // AT Protocol removed - only Sonet messaging supported
  const sonetConvo = useSonetConvo()
  const sonetState = useSonetConvoState()
  const sonetDispatch = useSonetConvoDispatch()

  // Username encryption status for Sonet
  useEffect(() => {
    if (isSonet && sonetState.chat?.isEncrypted) {
      // Update encryption status when chat encryption is enabled
      sonetDispatch({
        type: 'SET_ENCRYPTION_STATUS',
        payload: { status: 'enabled' }
      })
    }
  }, [isSonet, sonetState.chat?.isEncrypted, sonetDispatch])

  const unifiedState: UnifiedConvoState = useMemo(() => {
    // AT Protocol removed - only Sonet messaging supported
    return {
      status: sonetState.status,
      error: sonetState.error,
      messages: sonetState.messages,
      hasMore: sonetState.hasMore,
      isLoadingMore: sonetState.isLoadingMore,
      typingUsers: sonetState.typingUsers,
      unreadCount: sonetState.unreadCount,
      chat: sonetState.chat,
      isEncrypted: sonetState.chat?.isEncrypted || false,
      encryptionStatus: sonetState.encryptionStatus || 'disabled'
    }
  }, [sonetState])

  const unifiedApi: UnifiedConvoApi = useMemo(() => {
    // AT Protocol removed - only Sonet messaging supported
    return {
      sendMessage: sonetConvo.sendMessage,
      loadMessages: sonetConvo.loadMessages,
      loadMoreMessages: sonetConvo.loadMoreMessages,
      markAsRead: sonetConvo.markAsRead,
      setTyping: sonetConvo.setTyping,
      enableEncryption: sonetConvo.enableEncryption,
      getEncryptionStatus: sonetConvo.getEncryptionStatus,
      dispatch: sonetDispatch,
    }
  }, [sonetConvo, sonetDispatch])

  const contextValue: UnifiedConvoContextValue = useMemo(() => ({
    state: unifiedState,
    api: unifiedApi,
    isSonet,
    isEncrypted: unifiedState.isEncrypted || false
  }), [unifiedState, unifiedApi, isSonet])

  return (
    <UnifiedConvoContext.Provider value={contextValue}>
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

export function useIsEncrypted(): boolean {
  return useUnifiedConvo().isEncrypted
}