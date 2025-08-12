import {SonetFeedGetSuggestedFeeds} from '@sonet/api'
import {InfiniteData, QueryKey, useInfiniteQuery} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const suggestedFeedsQueryKeyRoot = 'suggestedFeeds'
export const suggestedFeedsQueryKey = [suggestedFeedsQueryKeyRoot]

export function useSuggestedFeedsQuery() {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetFeedGetSuggestedFeeds.OutputSchema,
    Error,
    InfiniteData<SonetFeedGetSuggestedFeeds.OutputSchema>,
    QueryKey,
    string | undefined
  >({
    staleTime: STALE.HOURS.ONE,
    queryKey: suggestedFeedsQueryKey,
    queryFn: async ({pageParam}) => {
      const res = await agent.app.sonet.feed.getSuggestedFeeds({
        limit: 10,
        cursor: pageParam,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
  })
}
