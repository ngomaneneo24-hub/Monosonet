import React from 'react'
import {AppState} from 'react-native'
import {sonetWebSocket} from '#/services/sonetWebSocket'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'

class SonetMessagesEventBus {
  private status: 'initializing' | 'ready' | 'backgrounded' | 'suspended' | 'error' = 'initializing'

  background() {
    this.status = 'backgrounded'
  }
  suspend() {
    this.status = 'suspended'
  }
  resume() {
    this.status = 'ready'
  }
}

const MessagesEventBusContext = React.createContext<SonetMessagesEventBus | null>(
  null,
)

export function useMessagesEventBus() {
  const ctx = React.useContext(MessagesEventBusContext)
  if (!ctx) {
    throw new Error(
      'useMessagesEventBus must be used within a MessagesEventBusProvider',
    )
  }
  return ctx
}

export function MessagesEventBusProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {hasSession, account} = useSonetSession()
  const sonet = useSonetApi()

  if (!hasSession || !account) {
    return (
      <MessagesEventBusContext.Provider value={null}>
        {children}
      </MessagesEventBusContext.Provider>
    )
  }

  return (
    <MessagesEventBusProviderInner>{children}</MessagesEventBusProviderInner>
  )
}

export function MessagesEventBusProviderInner({
  children,
}: {
  children: React.ReactNode
}) {
  const {account} = useSonetSession()
  const [bus] = React.useState(() => new SonetMessagesEventBus())

  React.useEffect(() => {
    // Ensure WebSocket connection using current access token
    if (account?.accessToken) {
      sonetWebSocket.connect(account.accessToken).catch(() => {})
    }
    return () => {
      sonetWebSocket.disconnect()
    }
  }, [account?.accessToken])

  React.useEffect(() => {
    bus.resume()
    return () => {
      bus.suspend()
    }
  }, [bus])

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        bus.resume()
      } else {
        bus.background()
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      sub.remove()
    }
  }, [bus])

  return (
    <MessagesEventBusContext.Provider value={bus}>
      {children}
    </MessagesEventBusContext.Provider>
  )
}
