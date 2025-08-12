import React, {createContext, useContext, useMemo, useState, useEffect} from 'react'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'
import type {SonetChat} from '#/services/sonetMessagingApi'

// =============================================================================
// TYPES
// =============================================================================

export interface SonetListConvosState {
  chats: SonetChat[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  cursor: string | null
  lastUpdated: string | null
}

export interface SonetListConvosActions {
  loadChats: (refresh?: boolean) => Promise<void>
  loadMoreChats: () => Promise<void>
  refreshChats: () => Promise<void>
  clearError: () => void
}

export interface SonetListConvosContextValue {
  state: SonetListConvosState
  actions: SonetListConvosActions
}

// =============================================================================
// CONTEXT
// =============================================================================

const SonetListConvosContext = createContext<SonetListConvosContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

interface SonetListConvosProviderProps {
  children: React.ReactNode
}

export function SonetListConvosProvider({children}: SonetListConvosProviderProps) {
  const [state, setState] = useState<SonetListConvosState>({
    chats: [],
    isLoading: false,
    error: null,
    hasMore: false,
    cursor: null,
    lastUpdated: null
  })

  // ========================================================================
  // LOAD CHATS
  // ========================================================================

  const loadChats = async (refresh: boolean = false) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }))

      const chats = await sonetMessagingApi.getChats()
      
      setState(prev => ({
        ...prev,
        chats: refresh ? chats : [...prev.chats, ...chats],
        isLoading: false,
        hasMore: chats.length >= 50, // Assuming 50 is the default page size
        cursor: chats.length > 0 ? chats[chats.length - 1].id : null,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load chats'
      }))
    }
  }

  // ========================================================================
  // LOAD MORE CHATS
  // ========================================================================

  const loadMoreChats = async () => {
    if (state.isLoading || !state.hasMore) return

    try {
      setState(prev => ({
        ...prev,
        isLoading: true
      }))

      // For now, we'll just refresh since Sonet API doesn't have pagination yet
      // In the future, this could use cursor-based pagination
      await loadChats(false)
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load more chats'
      }))
    }
  }

  // ========================================================================
  // REFRESH CHATS
  // ========================================================================

  const refreshChats = async () => {
    await loadChats(true)
  }

  // ========================================================================
  // CLEAR ERROR
  // ========================================================================

  const clearError = () => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }

  // ========================================================================
  // INITIAL LOAD
  // ========================================================================

  useEffect(() => {
    loadChats(true)
  }, [])

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const contextValue: SonetListConvosContextValue = useMemo(() => ({
    state,
    actions: {
      loadChats,
      loadMoreChats,
      refreshChats,
      clearError
    }
  }), [state])

  return (
    <SonetListConvosContext.Provider value={contextValue}>
      {children}
    </SonetListConvosContext.Provider>
  )
}

// =============================================================================
// HOOKS
// =============================================================================

export function useSonetListConvos(): SonetListConvosContextValue {
  const context = useContext(SonetListConvosContext)
  if (!context) {
    throw new Error('useSonetListConvos must be used within a SonetListConvosProvider')
  }
  return context
}

export function useSonetListConvosState(): SonetListConvosState {
  return useSonetListConvos().state
}

export function useSonetListConvosActions(): SonetListConvosActions {
  return useSonetListConvos().actions
}