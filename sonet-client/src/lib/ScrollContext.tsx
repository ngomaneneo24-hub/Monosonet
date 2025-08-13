import React, {createContext, useContext, useMemo} from 'react'
import {ScrollUsernamers} from 'react-native-reanimated'

const ScrollContext = createContext<ScrollUsernamers<any>>({
  onBeginDrag: undefined,
  onEndDrag: undefined,
  onScroll: undefined,
  onMomentumEnd: undefined,
})

export function useScrollUsernamers(): ScrollUsernamers<any> {
  return useContext(ScrollContext)
}

type ProviderProps = {children: React.ReactNode} & ScrollUsernamers<any>

// Note: this completely *overrides* the parent usernamers.
// It's up to you to compose them with the parent ones via useScrollUsernamers() if needed.
export function ScrollProvider({
  children,
  onBeginDrag,
  onEndDrag,
  onScroll,
  onMomentumEnd,
}: ProviderProps) {
  const usernamers = useMemo(
    () => ({
      onBeginDrag,
      onEndDrag,
      onScroll,
      onMomentumEnd,
    }),
    [onBeginDrag, onEndDrag, onScroll, onMomentumEnd],
  )
  return (
    <ScrollContext.Provider value={usernamers}>{children}</ScrollContext.Provider>
  )
}
