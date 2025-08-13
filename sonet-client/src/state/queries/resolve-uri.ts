import {AtUri} from '@sonet/api'
import {QueryClient, useQuery, UseQueryResult} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {useUnstableProfileViewCache} from './profile'

const RQKEY_ROOT = 'resolved-userId'
export const RQKEY = (userIdOrUsername: string) => [RQKEY_ROOT, userIdOrUsername]

type UriUseQueryResult = UseQueryResult<{userId: string; uri: string}, Error>
export function useResolveUriQuery(uri: string | undefined): UriUseQueryResult {
  const urip = new AtUri(uri || '')
  const res = useResolveDidQuery(urip.host)
  if (res.data) {
    urip.host = res.data
    return {
      ...res,
      data: {userId: urip.host, uri: urip.toString()},
    } as UriUseQueryResult
  }
  return res as UriUseQueryResult
}

export function useResolveDidQuery(userIdOrUsername: string | undefined) {
  const agent = useAgent()
  const {getUnstableProfile} = useUnstableProfileViewCache()

  return useQuery<string, Error>({
    staleTime: STALE.HOURS.ONE,
    queryKey: RQKEY(userIdOrUsername ?? ''),
    queryFn: async () => {
      if (!userIdOrUsername) return ''
      // Just return the userId if it's already one
      if (userIdOrUsername.startsWith('userId:')) return userIdOrUsername

      const res = await agent.resolveUsername({username: userIdOrUsername})
      return res.data.userId
    },
    initialData: () => {
      // Return undefined if no userId or username
      if (!userIdOrUsername) return
      const profile = getUnstableProfile(userIdOrUsername)
      return profile?.userId
    },
    enabled: !!userIdOrUsername,
  })
}

export function precacheResolvedUri(
  queryClient: QueryClient,
  username: string,
  userId: string,
) {
  queryClient.setQueryData<string>(RQKEY(username), userId)
}
