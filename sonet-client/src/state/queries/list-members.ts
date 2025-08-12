import {
  type SonetActorDefs,
  type SonetGraphDefs,
  type SonetGraphGetList,
  type SonetAppAgent,
} from '@sonet/api'
import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const PAGE_SIZE = 30
type RQPageParam = string | undefined

const RQKEY_ROOT = 'list-members'
const RQKEY_ROOT_ALL = 'list-members-all'
export const RQKEY = (uri: string) => [RQKEY_ROOT, uri]
export const RQKEY_ALL = (uri: string) => [RQKEY_ROOT_ALL, uri]

export function useListMembersQuery(uri?: string, limit: number = PAGE_SIZE) {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetGraphGetList.OutputSchema,
    Error,
    InfiniteData<SonetGraphGetList.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    staleTime: STALE.MINUTES.ONE,
    queryKey: RQKEY(uri ?? ''),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.app.sonet.graph.getList({
        list: uri!, // the enabled flag will prevent this from running until uri is set
        limit,
        cursor: pageParam,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: Boolean(uri),
  })
}

export function useAllListMembersQuery(uri?: string) {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.MINUTES.ONE,
    queryKey: RQKEY_ALL(uri ?? ''),
    queryFn: async () => {
      return getAllListMembers(agent, uri!)
    },
    enabled: Boolean(uri),
  })
}

export async function getAllListMembers(agent: SonetAppAgent, uri: string) {
  let hasMore = true
  let cursor: string | undefined
  const listItems: SonetGraphDefs.ListItemView[] = []
  // We want to cap this at 6 pages, just for anything weird happening with the api
  let i = 0
  while (hasMore && i < 6) {
    const res = await agent.app.sonet.graph.getList({
      list: uri,
      limit: 50,
      cursor,
    })
    listItems.push(...res.data.items)
    hasMore = Boolean(res.data.cursor)
    cursor = res.data.cursor
    i++
  }
  return listItems
}

export async function invalidateListMembersQuery({
  queryClient,
  uri,
}: {
  queryClient: QueryClient
  uri: string
}) {
  await queryClient.invalidateQueries({queryKey: RQKEY(uri)})
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileView, void> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetGraphGetList.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      if (page.list.creator.userId === userId) {
        yield page.list.creator
      }
      for (const item of page.items) {
        if (item.subject.userId === userId) {
          yield item.subject
        }
      }
    }
  }

  const allQueryData = queryClient.getQueriesData<
    SonetGraphDefs.ListItemView[]
  >({
    queryKey: [RQKEY_ROOT_ALL],
  })
  for (const [_queryKey, queryData] of allQueryData) {
    if (!queryData) {
      continue
    }
    for (const item of queryData) {
      if (item.subject.userId === userId) {
        yield item.subject
      }
    }
  }
}
