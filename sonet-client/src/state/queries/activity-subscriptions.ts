import {
  type SonetActorDefs,
  type SonetNotificationDeclaration,
  type SonetNotificationListActivitySubscriptions,
} from '@sonet/api'
import {t} from '@lingui/macro'
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {useAgent, useSession} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'

export const RQKEY_getActivitySubscriptions = ['activity-subscriptions']
export const RQKEY_getNotificationDeclaration = ['notification-declaration']

export function useActivitySubscriptionsQuery() {
  const agent = useAgent()

  return useInfiniteQuery({
    queryKey: RQKEY_getActivitySubscriptions,
    queryFn: async ({pageParam}) => {
      const response =
        await agent.app.sonet.notification.listActivitySubscriptions({
          cursor: pageParam,
        })
      return response.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: prev => prev.cursor,
  })
}

export function useNotificationDeclarationQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  return useQuery({
    queryKey: RQKEY_getNotificationDeclaration,
    queryFn: async () => {
      try {
        const response = await agent.app.sonet.notification.declaration.get({
          repo: currentAccount!.userId,
          rkey: 'self',
        })
        return response
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith('Could not locate record')
        ) {
          return {
            value: {
              type: "sonet",
              allowSubscriptions: 'followers',
            } satisfies SonetNotificationDeclaration.Record,
          }
        } else {
          throw err
        }
      }
    },
  })
}

export function useNotificationDeclarationMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (record: SonetNotificationDeclaration.Record) => {
      const response = await agent.app.sonet.notification.declaration.put(
        {
          repo: currentAccount!.userId,
          rkey: 'self',
        },
        record,
      )
      return response
    },
    onMutate: value => {
      queryClient.setQueryData(
        RQKEY_getNotificationDeclaration,
        (old?: {
          uri: string
          cid: string
          value: SonetNotificationDeclaration.Record
        }) => {
          if (!old) return old
          return {
            value,
          }
        },
      )
    },
    onError: () => {
      Toast.show(t`Failed to update notification declaration`)
      queryClient.invalidateQueries({
        queryKey: RQKEY_getNotificationDeclaration,
      })
    },
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileView, void> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetNotificationListActivitySubscriptions.OutputSchema>
  >({
    queryKey: RQKEY_getActivitySubscriptions,
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData.pages) {
      for (const subscription of page.subscriptions) {
        if (subscription.userId === userId) {
          yield subscription
        }
      }
    }
  }
}
