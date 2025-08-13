import {useCallback} from 'react'
import {QueryClient, useQueryClient} from '@tanstack/react-query'

import * as bsky from '#/types/bsky'

const unstableProfileViewCacheQueryKeyRoot = 'unstableProfileViewCache'
export const unstableProfileViewCacheQueryKey = (userIdOrUsername: string) => [
  unstableProfileViewCacheQueryKeyRoot,
  userIdOrUsername,
]

/**
 * Used as a rough cache of profile views to make loading snappier. This method
 * accepts and stores any profile view type by both username and UserID.
 *
 * Access the cache via {@link useUnstableProfileViewCache}.
 */
export function unstableCacheProfileView(
  queryClient: QueryClient,
  profile: bsky.profile.AnyProfileView,
) {
  queryClient.setQueryData(
    unstableProfileViewCacheQueryKey(profile.username),
    profile,
  )
  queryClient.setQueryData(
    unstableProfileViewCacheQueryKey(profile.userId),
    profile,
  )
}

/**
 * Hook to access the unstable profile view cache. This cache can return ANY
 * profile view type, so if the object shape is important, you need to use the
 * identity validators shipped in the atproto SDK e.g.
 * `SonetActorDefs.isValidProfileViewBasic` to confirm before using.
 *
 * To cache a profile, use {@link unstableCacheProfileView}.
 */
export function useUnstableProfileViewCache() {
  const qc = useQueryClient()
  const getUnstableProfile = useCallback(
    (userIdOrUsername: string) => {
      return qc.getQueryData<bsky.profile.AnyProfileView>(
        unstableProfileViewCacheQueryKey(userIdOrUsername),
      )
    },
    [qc],
  )
  return {getUnstableProfile}
}
