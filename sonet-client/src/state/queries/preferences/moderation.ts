import React from 'react'
import {
  SonetAppAgent,
  DEFAULT_LABEL_SETTINGS,
  interpretLabelValueDefinitions,
} from '@sonet/api'

import {isNonConfigurableModerationAuthority} from '#/state/session/additional-moderation-authorities'
import {useLabelersDetailedInfoQuery} from '../labeler'
import {usePreferencesQuery} from './index'

/**
 * More strict than our default settings for logged in users.
 */
export const DEFAULT_LOGGED_OUT_LABEL_PREFERENCES: typeof DEFAULT_LABEL_SETTINGS =
  Object.fromEntries(
    Object.entries(DEFAULT_LABEL_SETTINGS).map(([key, _pref]) => [key, 'hide']),
  )

export function useMyLabelersQuery({
  excludeNonConfigurableLabelers = false,
}: {
  excludeNonConfigurableLabelers?: boolean
} = {}) {
  const prefs = usePreferencesQuery()
  let userIds = Array.from(
    new Set(
      SonetAppAgent.appLabelers.concat(
        prefs.data?.moderationPrefs.labelers.map(l => l.userId) || [],
      ),
    ),
  )
  if (excludeNonConfigurableLabelers) {
    userIds = userIds.filter(userId => !isNonConfigurableModerationAuthority(userId))
  }
  const labelers = useLabelersDetailedInfoQuery({userIds})
  const isLoading = prefs.isLoading || labelers.isLoading
  const error = prefs.error || labelers.error
  return React.useMemo(() => {
    return {
      isLoading,
      error,
      data: labelers.data,
      refetch: labelers.refetch,
    }
  }, [labelers, isLoading, error])
}

export function useLabelDefinitionsQuery() {
  const labelers = useMyLabelersQuery()
  return React.useMemo(() => {
    return {
      labelDefs: Object.fromEntries(
        (labelers.data || []).map(labeler => [
          labeler.creator.userId,
          interpretLabelValueDefinitions(labeler),
        ]),
      ),
      labelers: labelers.data || [],
    }
  }, [labelers])
}
