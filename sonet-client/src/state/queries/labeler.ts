import {type SonetLabelerDefs} from '@sonet/api'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {z} from 'zod'

import {MAX_LABELERS} from '#/lib/constants'
import {labelersDetailedInfoQueryKeyRoot} from '#/lib/react-query'
import {STALE} from '#/state/queries'
import {
  preferencesQueryKey,
  usePreferencesQuery,
} from '#/state/queries/preferences'
import {useAgent} from '#/state/session'

const labelerInfoQueryKeyRoot = 'labeler-info'
export const labelerInfoQueryKey = (userId: string) => [
  labelerInfoQueryKeyRoot,
  userId,
]

const labelersInfoQueryKeyRoot = 'labelers-info'
export const labelersInfoQueryKey = (userIds: string[]) => [
  labelersInfoQueryKeyRoot,
  userIds.slice().sort(),
]

export const labelersDetailedInfoQueryKey = (userIds: string[]) => [
  labelersDetailedInfoQueryKeyRoot,
  userIds,
]

export function useLabelerInfoQuery({
  userId,
  enabled,
}: {
  userId?: string
  enabled?: boolean
}) {
  const agent = useAgent()
  return useQuery({
    enabled: !!userId && enabled !== false,
    queryKey: labelerInfoQueryKey(userId as string),
    queryFn: async () => {
      const res = await agent.app.sonet.labeler.getServices({
        userIds: [userId!],
        detailed: true,
      })
      return res.data.views[0] as SonetLabelerDefs.LabelerViewDetailed
    },
  })
}

export function useLabelersInfoQuery({userIds}: {userIds: string[]}) {
  const agent = useAgent()
  return useQuery({
    enabled: !!userIds.length,
    queryKey: labelersInfoQueryKey(userIds),
    queryFn: async () => {
      const res = await agent.app.sonet.labeler.getServices({userIds})
      return res.data.views as SonetLabelerDefs.LabelerView[]
    },
  })
}

export function useLabelersDetailedInfoQuery({userIds}: {userIds: string[]}) {
  const agent = useAgent()
  return useQuery({
    enabled: !!userIds.length,
    queryKey: labelersDetailedInfoQueryKey(userIds),
    gcTime: 1000 * 60 * 60 * 6, // 6 hours
    staleTime: STALE.MINUTES.ONE,
    queryFn: async () => {
      const res = await agent.app.sonet.labeler.getServices({
        userIds,
        detailed: true,
      })
      return res.data.views as SonetLabelerDefs.LabelerViewDetailed[]
    },
  })
}

export function useLabelerSubscriptionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  const preferences = usePreferencesQuery()

  return useMutation({
    async mutationFn({userId, subscribe}: {userId: string; subscribe: boolean}) {
      // TODO
      z.object({
        userId: z.string(),
        subscribe: z.boolean(),
      }).parse({userId, subscribe})

      /**
       * If a user has invalid/takendown/deactivated labelers, we need to
       * remove them. We don't have a great way to do this atm on the server,
       * so we do it here.
       *
       * We also need to push validation into this method, since we need to
       * check {@link MAX_LABELERS} _after_ we've removed invalid or takendown
       * labelers.
       */
      const labelerDids = (
        preferences.data?.moderationPrefs?.labelers ?? []
      ).map(l => l.userId)
      const invalidLabelers: string[] = []
      if (labelerDids.length) {
        const profiles = await agent.getProfiles({actors: labelerDids})
        if (profiles.data) {
          for (const userId of labelerDids) {
            const exists = profiles.data.profiles.find(p => p.userId === userId)
            if (exists) {
              // profile came back but it's not a valid labeler
              if (exists.associated && !exists.associated.labeler) {
                invalidLabelers.push(userId)
              }
            } else {
              // no response came back, might be deactivated or takendown
              invalidLabelers.push(userId)
            }
          }
        }
      }
      if (invalidLabelers.length) {
        await Promise.all(invalidLabelers.map(userId => agent.removeLabeler(userId)))
      }

      if (subscribe) {
        const labelerCount = labelerDids.length - invalidLabelers.length
        if (labelerCount >= MAX_LABELERS) {
          throw new Error('MAX_LABELERS')
        }
        await agent.addLabeler(userId)
      } else {
        await agent.removeLabeler(userId)
      }
    },
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: preferencesQueryKey,
      })
    },
  })
}
