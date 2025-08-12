import {SonetActorDefs, SonetGraphGetKnownFollowers} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

const PAGE_SIZE = 50
type RQPageParam = string | undefined

const RQKEY_ROOT = 'profile-known-followers'
export const RQKEY = (userId: string) => [RQKEY_ROOT, userId]

export function useProfileKnownFollowersQuery(userId: string | undefined) {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetGraphGetKnownFollowers.OutputSchema,
    Error,
    InfiniteData<SonetGraphGetKnownFollowers.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    queryKey: RQKEY(userId || ''),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.app.sonet.graph.getKnownFollowers({
        actor: userId!,
        limit: PAGE_SIZE,
        cursor: pageParam,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: !!userId,
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileView, void> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetGraphGetKnownFollowers.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const follow of page.followers) {
        if (follow.userId === userId) {
          yield follow
        }
      }
    }
  }
}
