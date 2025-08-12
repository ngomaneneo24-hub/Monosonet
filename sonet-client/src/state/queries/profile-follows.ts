import {SonetActorDefs, SonetGraphGetFollows} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const PAGE_SIZE = 30
type RQPageParam = string | undefined

// TODO refactor invalidate on mutate?
const RQKEY_ROOT = 'profile-follows'
export const RQKEY = (userId: string) => [RQKEY_ROOT, userId]

export function useProfileFollowsQuery(
  userId: string | undefined,
  {
    limit,
  }: {
    limit?: number
  } = {
    limit: PAGE_SIZE,
  },
) {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetGraphGetFollows.OutputSchema,
    Error,
    InfiniteData<SonetGraphGetFollows.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    staleTime: STALE.MINUTES.ONE,
    queryKey: RQKEY(userId || ''),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.app.sonet.graph.getFollows({
        actor: userId || '',
        limit: limit || PAGE_SIZE,
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
    InfiniteData<SonetGraphGetFollows.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const follow of page.follows) {
        if (follow.userId === userId) {
          yield follow
        }
      }
    }
  }
}
