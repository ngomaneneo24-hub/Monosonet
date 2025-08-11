import React, {createContext, useContext, useMemo} from 'react'
import {USE_SONET_MESSAGING} from '#/env'
import {useSession, useSessionApi, useAgent} from './index'
import {useSonetSession, useSonetApi} from './sonet'
import type {SessionAccount} from './types'
import type {SonetSessionAccount} from './sonet'

// Unified session interface
export interface UnifiedSessionAccount {
  did: string
  handle: string
  displayName?: string
  email?: string
  emailConfirmed?: boolean
  indexedAt?: string
  labels?: string[]
  // Sonet-specific fields
  userId?: string
  accessToken?: string
  refreshToken?: string
}

export interface UnifiedSessionState {
  accounts: UnifiedSessionAccount[]
  currentAccount?: UnifiedSessionAccount
  hasSession: boolean
  isLoading: boolean
}

export interface UnifiedSessionApi {
  createAccount: (params: any) => Promise<void>
  login: (params: any) => Promise<void>
  logoutCurrentAccount: () => Promise<void>
  logoutEveryAccount: () => Promise<void>
  resumeSession: (account: UnifiedSessionAccount) => Promise<void>
  removeAccount: (did: string) => void
  partialRefreshSession: () => Promise<void>
  // Sonet-specific methods
  sonetLogin: (params: {username: string; password: string}) => Promise<void>
  sonetRegister: (params: {username: string; email: string; password: string; display_name?: string}) => Promise<void>
  sonetLogout: () => Promise<void>
}

interface UnifiedSessionContextValue {
  state: UnifiedSessionState
  api: UnifiedSessionApi
  agent: any // AT Protocol agent
  sonetApi: any // Sonet API
  isSonet: boolean
}

const UnifiedSessionContext = createContext<UnifiedSessionContextValue | null>(null)

export function UnifiedSessionProvider({children}: {children: React.ReactNode}) {
  const isSonet = USE_SONET_MESSAGING
  
  const atprotoSession = useSession()
  const atprotoApi = useSessionApi()
  const atprotoAgent = useAgent()
  
  const sonetSession = useSonetSession()
  const sonetApi = useSonetApi()

  const unifiedState: UnifiedSessionState = useMemo(() => {
    const accounts: UnifiedSessionAccount[] = []
    
    // Add AT Protocol accounts
    if (atprotoSession.accounts.length > 0) {
      accounts.push(...atprotoSession.accounts.map(account => ({
        did: account.did,
        handle: account.handle,
        displayName: account.displayName,
        email: account.email,
        emailConfirmed: account.emailConfirmed,
        indexedAt: account.indexedAt,
        labels: account.labels,
      })))
    }
    
    // Add Sonet account if available
    if (sonetSession.account) {
      accounts.push({
        did: sonetSession.account.userId,
        handle: sonetSession.account.username,
        displayName: sonetSession.account.displayName,
        userId: sonetSession.account.userId,
        accessToken: sonetSession.account.accessToken,
        refreshToken: sonetSession.account.refreshToken,
      })
    }

    const currentAccount = accounts.find(account => 
      account.did === atprotoSession.currentAccount?.did || 
      account.userId === sonetSession.account?.userId
    )

    return {
      accounts,
      currentAccount,
      hasSession: atprotoSession.hasSession || sonetSession.hasSession,
      isLoading: false, // Would need to track loading state
    }
  }, [atprotoSession, sonetSession])

  const unifiedApi: UnifiedSessionApi = useMemo(() => ({
    // AT Protocol methods
    createAccount: atprotoApi.createAccount,
    login: atprotoApi.login,
    logoutCurrentAccount: async () => {
      await atprotoApi.logoutCurrentAccount()
      if (isSonet) {
        await sonetApi.logout()
      }
    },
    logoutEveryAccount: async () => {
      await atprotoApi.logoutEveryAccount()
      if (isSonet) {
        await sonetApi.logout()
      }
    },
    resumeSession: async (account: UnifiedSessionAccount) => {
      if (account.userId) {
        // Sonet account
        await sonetApi.resume()
      } else {
        // AT Protocol account
        await atprotoApi.resumeSession(account as SessionAccount)
      }
    },
    removeAccount: atprotoApi.removeAccount,
    partialRefreshSession: atprotoApi.partialRefreshSession,
    
    // Sonet-specific methods
    sonetLogin: sonetApi.login,
    sonetRegister: sonetApi.register,
    sonetLogout: sonetApi.logout,
  }), [atprotoApi, sonetApi, isSonet])

  const value: UnifiedSessionContextValue = useMemo(() => ({
    state: unifiedState,
    api: unifiedApi,
    agent: atprotoAgent,
    sonetApi,
    isSonet,
  }), [unifiedState, unifiedApi, atprotoAgent, sonetApi, isSonet])

  return (
    <UnifiedSessionContext.Provider value={value}>
      {children}
    </UnifiedSessionContext.Provider>
  )
}

export function useUnifiedSession(): UnifiedSessionContextValue {
  const context = useContext(UnifiedSessionContext)
  if (!context) {
    throw new Error('useUnifiedSession must be used within a UnifiedSessionProvider')
  }
  return context
}

export function useUnifiedSessionState(): UnifiedSessionState {
  return useUnifiedSession().state
}

export function useUnifiedSessionApi(): UnifiedSessionApi {
  return useUnifiedSession().api
}

export function useUnifiedAgent(): any {
  return useUnifiedSession().agent
}

export function useUnifiedSonetApi(): any {
  return useUnifiedSession().sonetApi
}

export function useIsSonetSession(): boolean {
  return useUnifiedSession().isSonet
}

// Helper function to convert between account types
export function convertAtprotoAccountToUnified(account: SessionAccount): UnifiedSessionAccount {
  return {
    did: account.did,
    handle: account.handle,
    displayName: account.displayName,
    email: account.email,
    emailConfirmed: account.emailConfirmed,
    indexedAt: account.indexedAt,
    labels: account.labels,
  }
}

export function convertSonetAccountToUnified(account: SonetSessionAccount): UnifiedSessionAccount {
  return {
    did: account.userId,
    handle: account.username,
    displayName: account.displayName,
    userId: account.userId,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
  }
}