import {SonetActorDefs, SonetGraphGetBlocks} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'my-blocked-accounts'
export const RQKEY = () => [RQKEY_ROOT]
type RQPageParam = string | undefined

export function useMyBlockedAccountsQuery() {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetGraphGetBlocks.OutputSchema,
    Error,
    InfiniteData<SonetGraphGetBlocks.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    queryKey: RQKEY(),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.app.sonet.graph.getBlocks({
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
    InfiniteData<SonetGraphGetBlocks.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const block of page.blocks) {
        if (block.userId === userId) {
          yield block
        }
      }
    }
  }
}
