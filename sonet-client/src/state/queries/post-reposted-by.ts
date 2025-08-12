import {SonetActorDefs, SonetFeedGetRenoteedBy} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

const PAGE_SIZE = 30
type RQPageParam = string | undefined

// TODO refactor invalidate on mutate?
const RQKEY_ROOT = 'note-renoteed-by'
export const RQKEY = (resolvedUri: string) => [RQKEY_ROOT, resolvedUri]

export function useNoteRenoteedByQuery(resolvedUri: string | undefined) {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetFeedGetRenoteedBy.OutputSchema,
    Error,
    InfiniteData<SonetFeedGetRenoteedBy.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    queryKey: RQKEY(resolvedUri || ''),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.getRenoteedBy({
        uri: resolvedUri || '',
        limit: PAGE_SIZE,
        cursor: pageParam,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: !!resolvedUri,
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileView, void> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetFeedGetRenoteedBy.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const renoteedBy of page.renoteedBy) {
        if (renoteedBy.userId === userId) {
          yield renoteedBy
        }
      }
    }
  }
}
