import {SonetActorDefs, SonetGraphGetMutes} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'my-muted-accounts'
export const RQKEY = () => [RQKEY_ROOT]
type RQPageParam = string | undefined

export function useMyMutedAccountsQuery() {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetGraphGetMutes.OutputSchema,
    Error,
    InfiniteData<SonetGraphGetMutes.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    queryKey: RQKEY(),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.app.sonet.graph.getMutes({
        limit: 30,
        cursor: pageParam,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileView, void> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetGraphGetMutes.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const mute of page.mutes) {
        if (mute.userId === userId) {
          yield mute
        }
      }
    }
  }
}
