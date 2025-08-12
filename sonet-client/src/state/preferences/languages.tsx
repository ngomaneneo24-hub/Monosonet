import React from 'react'

import {AppLanguage} from '#/locale/languages'
import * as persisted from '#/state/persisted'

type SetStateCb = (
  s: persisted.Schema['languagePrefs'],
) => persisted.Schema['languagePrefs']
type StateContext = persisted.Schema['languagePrefs']
type ApiContext = {
  setPrimaryLanguage: (code2: string) => void
  setNoteLanguage: (commaSeparatedLangCodes: string) => void
  setContentLanguage: (code2: string) => void
  toggleContentLanguage: (code2: string) => void
  toggleNoteLanguage: (code2: string) => void
  saveNoteLanguageToHistory: () => void
  setAppLanguage: (code2: AppLanguage) => void
}

const stateContext = React.createContext<StateContext>(
  persisted.defaults.languagePrefs,
)
const apiContext = React.createContext<ApiContext>({
  setPrimaryLanguage: (_: string) => {},
  setNoteLanguage: (_: string) => {},
  setContentLanguage: (_: string) => {},
  toggleContentLanguage: (_: string) => {},
  toggleNoteLanguage: (_: string) => {},
  saveNoteLanguageToHistory: () => {},
  setAppLanguage: (_: AppLanguage) => {},
})

export function Provider({children}: React.PropsWithChildren<{}>) {
  const [state, setState] = React.useState(persisted.get('languagePrefs'))

  const setStateWrapped = React.useCallback(
    (fn: SetStateCb) => {
      const s = fn(persisted.get('languagePrefs'))
      setState(s)
      persisted.write('languagePrefs', s)
    },
    [setState],
  )

  React.useEffect(() => {
    return persisted.onUpdate('languagePrefs', nextLanguagePrefs => {
      setState(nextLanguagePrefs)
    })
  }, [setStateWrapped])

  const api = React.useMemo(
    () => ({
      setPrimaryLanguage(code2: string) {
        setStateWrapped(s => ({...s, primaryLanguage: code2}))
      },
      setNoteLanguage(commaSeparatedLangCodes: string) {
        setStateWrapped(s => ({...s, noteLanguage: commaSeparatedLangCodes}))
      },
      setContentLanguage(code2: string) {
        setStateWrapped(s => ({...s, contentLanguages: [code2]}))
      },
      toggleContentLanguage(code2: string) {
        setStateWrapped(s => {
          const exists = s.contentLanguages.includes(code2)
          const next = exists
            ? s.contentLanguages.filter(lang => lang !== code2)
            : s.contentLanguages.concat(code2)
          return {
            ...s,
            contentLanguages: next,
          }
        })
      },
      toggleNoteLanguage(code2: string) {
        setStateWrapped(s => {
          const exists = hasNoteLanguage(state.noteLanguage, code2)
          let next = s.noteLanguage

          if (exists) {
            next = toNoteLanguages(s.noteLanguage)
              .filter(lang => lang !== code2)
              .join(',')
          } else {
            // sort alphabetically for deterministic comparison in context menu
            next = toNoteLanguages(s.noteLanguage)
              .concat([code2])
              .sort((a, b) => a.localeCompare(b))
              .join(',')
          }

          return {
            ...s,
            noteLanguage: next,
          }
        })
      },
      /**
       * Saves whatever language codes are currently selected into a history array,
       * which is then used to populate the language selector menu.
       */
      saveNoteLanguageToHistory() {
        // filter out duplicate `this.noteLanguage` if exists, and prepend
        // value to start of array
        setStateWrapped(s => ({
          ...s,
          noteLanguageHistory: [s.noteLanguage]
            .concat(
              s.noteLanguageHistory.filter(
                commaSeparatedLangCodes =>
                  commaSeparatedLangCodes !== s.noteLanguage,
              ),
            )
            .slice(0, 6),
        }))
      },
      setAppLanguage(code2: AppLanguage) {
        setStateWrapped(s => ({...s, appLanguage: code2}))
      },
    }),
    [state, setStateWrapped],
  )

  return (
    <stateContext.Provider value={state}>
      <apiContext.Provider value={api}>{children}</apiContext.Provider>
    </stateContext.Provider>
  )
}

export function useLanguagePrefs() {
  return React.useContext(stateContext)
}

export function useLanguagePrefsApi() {
  return React.useContext(apiContext)
}

export function getContentLanguages() {
  return persisted.get('languagePrefs').contentLanguages
}

/**
 * Be careful with this. It's used for the PWI home screen so that users can
 * select a UI language and have it apply to the fetched Discover feed.
 *
 * We only support BCP-47 two-letter codes here, hence the split.
 */
export function getAppLanguageAsContentLanguage() {
  return persisted.get('languagePrefs').appLanguage.split('-')[0]
}

export function toNoteLanguages(noteLanguage: string): string[] {
  // filter out empty strings if exist
  return noteLanguage.split(',').filter(Boolean)
}

export function hasNoteLanguage(noteLanguage: string, code2: string): boolean {
  return toNoteLanguages(noteLanguage).includes(code2)
}
