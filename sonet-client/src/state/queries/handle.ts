import React from 'react'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const usernameQueryKeyRoot = 'username'
const fetchUsernameQueryKey = (usernameOrDid: string) => [
  usernameQueryKeyRoot,
  usernameOrDid,
]
const userIdQueryKeyRoot = 'userId'
const fetchDidQueryKey = (usernameOrDid: string) => [userIdQueryKeyRoot, usernameOrDid]

export function useFetchUsername() {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return React.useCallback(
    async (usernameOrDid: string) => {
      if (usernameOrDid.startsWith('userId:')) {
        const res = await queryClient.fetchQuery({
          staleTime: STALE.MINUTES.FIVE,
          queryKey: fetchUsernameQueryKey(usernameOrDid),
          queryFn: () => agent.getProfile({actor: usernameOrDid}),
        })
        return res.data.username
      }
      return usernameOrDid
    },
    [queryClient, agent],
  )
}

export function useUpdateUsernameMutation(opts?: {
  onSuccess?: (username: string) => void
}) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({username}: {username: string}) => {
      await agent.updateUsername({username})
    },
    onSuccess(_data, variables) {
      opts?.onSuccess?.(variables.username)
      queryClient.invalidateQueries({
        queryKey: fetchUsernameQueryKey(variables.username),
      })
    },
  })
}

export function useFetchDid() {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return React.useCallback(
    async (usernameOrDid: string) => {
      return queryClient.fetchQuery({
        staleTime: STALE.INFINITY,
        queryKey: fetchDidQueryKey(usernameOrDid),
        queryFn: async () => {
          let identifier = usernameOrDid
          if (!identifier.startsWith('userId:')) {
            const res = await agent.resolveUsername({username: identifier})
            identifier = res.data.userId
          }
          return identifier
        },
      })
    },
    [queryClient, agent],
  )
}
