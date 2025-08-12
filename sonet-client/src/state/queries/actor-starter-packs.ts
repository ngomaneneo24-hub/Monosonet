import {SonetGraphGetActorStarterPacks} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useAgent} from '#/state/session'

export const RQKEY_ROOT = 'actor-starter-packs'
export const RQKEY = (userId?: string) => [RQKEY_ROOT, userId]

export function useActorStarterPacksQuery({
  userId,
  enabled = true,
}: {
  userId?: string
  enabled?: boolean
}) {
  const agent = useAgent()

  return useInfiniteQuery<
    SonetGraphGetActorStarterPacks.OutputSchema,
    Error,
    InfiniteData<SonetGraphGetActorStarterPacks.OutputSchema>,
    QueryKey,
    string | undefined
  >({
    queryKey: RQKEY(userId),
    queryFn: async ({pageParam}: {pageParam?: string}) => {
      const res = await agent.app.sonet.graph.getActorStarterPacks({
        actor: userId!,
        limit: 10,
        cursor: pageParam,
      })
      return res.data
    },
    enabled: Boolean(userId) && enabled,
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
  })
}

export async function invalidateActorStarterPacksQuery({
  queryClient,
  userId,
}: {
  queryClient: QueryClient
  userId: string
}) {
  await queryClient.invalidateQueries({queryKey: RQKEY(userId)})
}
