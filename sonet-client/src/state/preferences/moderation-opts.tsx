import React, {createContext, useContext, useMemo} from 'react'
import {SonetAppAgent, ModerationOpts} from '@sonet/api'

import {useHiddenNotes, useLabelDefinitions} from '#/state/preferences'
import {DEFAULT_LOGGED_OUT_LABEL_PREFERENCES} from '#/state/queries/preferences/moderation'
import {useSession} from '#/state/session'
import {usePreferencesQuery} from '../queries/preferences'

export const moderationOptsContext = createContext<ModerationOpts | undefined>(
  undefined,
)

// used in the moderation state devtool
export const moderationOptsOverrideContext = createContext<
  ModerationOpts | undefined
>(undefined)

export function useModerationOpts() {
  return useContext(moderationOptsContext)
}

export function Provider({children}: React.PropsWithChildren<{}>) {
  const override = useContext(moderationOptsOverrideContext)
  const {currentAccount} = useSession()
  const prefs = usePreferencesQuery()
  const {labelDefs} = useLabelDefinitions()
  const hiddenNotes = useHiddenNotes() // TODO move this into pds-stored prefs

  const userDid = currentAccount?.userId
  const moderationPrefs = prefs.data?.moderationPrefs
  const value = useMemo<ModerationOpts | undefined>(() => {
    if (override) {
      return override
    }
    if (!moderationPrefs) {
      return undefined
    }
    return {
      userDid,
      prefs: {
        ...moderationPrefs,
        labelers: moderationPrefs.labelers.length
          ? moderationPrefs.labelers
          : SonetAppAgent.appLabelers.map(userId => ({
              userId,
              labels: DEFAULT_LOGGED_OUT_LABEL_PREFERENCES,
            })),
        hiddenNotes: hiddenNotes || [],
      },
      labelDefs,
    }
  }, [override, userDid, labelDefs, moderationPrefs, hiddenNotes])

  return (
    <moderationOptsContext.Provider value={value}>
      {children}
    </moderationOptsContext.Provider>
  )
}
