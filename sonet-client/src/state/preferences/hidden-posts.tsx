import React from 'react'

import * as persisted from '#/state/persisted'

type SetStateCb = (
  s: persisted.Schema['hiddenNotes'],
) => persisted.Schema['hiddenNotes']
type StateContext = persisted.Schema['hiddenNotes']
type ApiContext = {
  hideNote: ({uri}: {uri: string}) => void
  unhideNote: ({uri}: {uri: string}) => void
}

const stateContext = React.createContext<StateContext>(
  persisted.defaults.hiddenNotes,
)
const apiContext = React.createContext<ApiContext>({
  hideNote: () => {},
  unhideNote: () => {},
})

export function Provider({children}: React.PropsWithChildren<{}>) {
  const [state, setState] = React.useState(persisted.get('hiddenNotes'))

  const setStateWrapped = React.useCallback(
    (fn: SetStateCb) => {
      const s = fn(persisted.get('hiddenNotes'))
      setState(s)
      persisted.write('hiddenNotes', s)
    },
    [setState],
  )

  const api = React.useMemo(
    () => ({
      hideNote: ({uri}: {uri: string}) => {
        setStateWrapped(s => [...(s || []), uri])
      },
      unhideNote: ({uri}: {uri: string}) => {
        setStateWrapped(s => (s || []).filter(u => u !== uri))
      },
    }),
    [setStateWrapped],
  )

  React.useEffect(() => {
    return persisted.onUpdate('hiddenNotes', nextHiddenNotes => {
      setState(nextHiddenNotes)
    })
  }, [setStateWrapped])

  return (
    <stateContext.Provider value={state}>
      <apiContext.Provider value={api}>{children}</apiContext.Provider>
    </stateContext.Provider>
  )
}

export function useHiddenNotes() {
  return React.useContext(stateContext)
}

export function useHiddenNotesApi() {
  return React.useContext(apiContext)
}
