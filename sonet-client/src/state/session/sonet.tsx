import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {SONET_API_BASE} from '#/env'
import {SonetApi, type AuthTokens} from '#/services/sonetApi'

export type SonetSessionAccount = {
  userId: string
  username: string
  displayName?: string
  accessToken: string
  refreshToken?: string
}

type SonetSessionState = {
  account?: SonetSessionAccount
  hasSession: boolean
}

type SonetSessionApi = {
  login: (input: {username: string; password: string}) => Promise<void>
  register: (input: {username: string; email: string; password: string; display_name?: string}) => Promise<void>
  logout: () => Promise<void>
  resume: () => Promise<void>
  getApi: () => SonetApi
}

const STORAGE_KEY = 'SONET_SESSION'

const SonetStateContext = React.createContext<SonetSessionState>({hasSession: false})
const SonetApiContext = React.createContext<SonetSessionApi | null>(null)

export function SonetSessionProvider({children}: {children: React.ReactNode}) {
  const apiRef = React.useRef(new SonetApi(SONET_API_BASE))
  const [state, setState] = React.useState<SonetSessionState>({hasSession: false})

  const writePersisted = React.useCallback(async (account?: SonetSessionAccount) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({account}))
    } catch {}
  }, [])

  const loadPersisted = React.useCallback(async (): Promise<SonetSessionAccount | undefined> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
      return parsed?.account
    } catch {
      return undefined
    }
  }, [])

  const applyTokens = React.useCallback((tokens: AuthTokens | null) => {
    apiRef.current.setTokens(tokens)
  }, [])

  const setAccount = React.useCallback((account: SonetSessionAccount | undefined) => {
    setState({account, hasSession: !!account})
    // fire and forget
    void writePersisted(account)
    if (account) applyTokens({accessToken: account.accessToken, refreshToken: account.refreshToken})
    else applyTokens(null)
  }, [applyTokens, writePersisted])

  const login = React.useCallback(async (input: {username: string; password: string}) => {
    const body = await apiRef.current.login(input)
    const me = await apiRef.current.getMe().catch(async () => {
      return {user: {id: body.session?.user_id || 'me', username: input.username}}
    })
    const account: SonetSessionAccount = {
      userId: me.user?.id || 'me',
      username: me.user?.username || input.username,
      displayName: me.user?.display_name,
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
    }
    setAccount(account)
  }, [setAccount])

  const register = React.useCallback(async (input: {username: string; email: string; password: string; display_name?: string}) => {
    await apiRef.current.register(input)
    await login({username: input.username, password: input.password})
  }, [login])

  const logout = React.useCallback(async () => {
    try { await apiRef.current.logout() } finally { setAccount(undefined) }
  }, [setAccount])

  const resume = React.useCallback(async () => {
    const saved = await loadPersisted()
    if (!saved?.refreshToken) return
    try {
      const refreshed = await apiRef.current.refreshToken(saved.refreshToken)
      const next: SonetSessionAccount = {...saved, accessToken: refreshed.access_token}
      setAccount(next)
    } catch {
      setAccount(undefined)
    }
  }, [loadPersisted, setAccount])

  React.useEffect(() => {
    ;(async () => {
      const saved = await loadPersisted()
      if (saved) setAccount(saved)
    })()
  }, [loadPersisted, setAccount])

  const value: SonetSessionApi = React.useMemo(() => ({
    login,
    register,
    logout,
    resume,
    getApi: () => apiRef.current,
  }), [login, register, logout, resume])

  return (
    <SonetStateContext.Provider value={state}>
      <SonetApiContext.Provider value={value}>{children}</SonetApiContext.Provider>
    </SonetStateContext.Provider>
  )
}

export function useSonetSession() {
  return React.useContext(SonetStateContext)
}

export function useSonetApi() {
  const ctx = React.useContext(SonetApiContext)
  if (!ctx) throw new Error('useSonetApi() must be used within <SonetSessionProvider>')
  return ctx
}