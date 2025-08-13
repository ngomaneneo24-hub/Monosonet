import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {STALE} from '#/state/queries'
import {useSession} from '#/state/session'

// API base URL - should be configurable
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api' 
  : '/api'

// Types for Sonet API responses
export interface SonetList {
  list_id: string
  owner_id: string
  name: string
  description: string
  is_public: boolean
  list_type: 'custom' | 'close_friends' | 'family' | 'work' | 'school'
  created_at: string
  updated_at: string
  member_count: number
}

export interface SonetListMember {
  list_id: string
  user_id: string
  added_by: string
  notes?: string
  added_at: string
}

export interface CreateListRequest {
  name: string
  description?: string
  is_public?: boolean
  list_type?: 'custom' | 'close_friends' | 'family' | 'work' | 'school'
}

export interface UpdateListRequest {
  list_id: string
  name?: string
  description?: string
  is_public?: boolean
  list_type?: 'custom' | 'close_friends' | 'family' | 'work' | 'school'
}

export interface AddListMemberRequest {
  list_id: string
  user_id: string
  notes?: string
}

// Query keys
export const RQKEY_ROOT = 'sonet-list'
export const RQKEY = (listId: string) => [RQKEY_ROOT, listId]
export const RQKEY_USER_LISTS = (userId: string) => [RQKEY_ROOT, 'user', userId]
export const RQKEY_LIST_MEMBERS = (listId: string) => [RQKEY_ROOT, 'members', listId]

// API functions
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const {currentAccount} = useSession.getState()
  if (!currentAccount?.accessJwt) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentAccount.accessJwt}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({message: 'Unknown error'}))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// Queries
export function useListQuery(listId?: string) {
  return useQuery<SonetList, Error>({
    queryKey: RQKEY(listId || ''),
    queryFn: async () => {
      if (!listId) throw new Error('List ID required')
      const response = await apiRequest(`/v1/lists/${listId}`)
      return response.list
    },
    enabled: !!listId,
    staleTime: STALE.MINUTES.ONE,
  })
}

export function useUserListsQuery(userId?: string, limit = 20, cursor?: string) {
  return useQuery<{lists: SonetList[], next_cursor?: string}, Error>({
    queryKey: [...RQKEY_USER_LISTS(userId || ''), limit, cursor],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && {cursor}),
      })
      const response = await apiRequest(`/v1/users/${userId}/lists?${params}`)
      return response
    },
    enabled: !!userId,
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useListMembersQuery(listId?: string, limit = 20, cursor?: string) {
  return useQuery<{members: SonetListMember[], next_cursor?: string}, Error>({
    queryKey: [...RQKEY_LIST_MEMBERS(listId || ''), limit, cursor],
    queryFn: async () => {
      if (!listId) throw new Error('List ID required')
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && {cursor}),
      })
      const response = await apiRequest(`/v1/lists/${listId}/members?${params}`)
      return response
    },
    enabled: !!listId,
    staleTime: STALE.MINUTES.ONE,
  })
}

export function useIsUserInListQuery(listId?: string, userId?: string) {
  return useQuery<{is_member: boolean}, Error>({
    queryKey: [RQKEY_ROOT, 'check-member', listId, userId],
    queryFn: async () => {
      if (!listId || !userId) throw new Error('List ID and User ID required')
      const response = await apiRequest(`/v1/lists/${listId}/members/${userId}/check`)
      return response
    },
    enabled: !!(listId && userId),
    staleTime: STALE.MINUTES.ONE,
  })
}

// Mutations
export function useCreateListMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<{list: SonetList}, Error, CreateListRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest('/v1/lists', {
        method: 'NOTE',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: () => {
      if (currentAccount?.userId) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_LISTS(currentAccount.userId),
        })
      }
    },
  })
}

export function useUpdateListMutation() {
  const queryClient = useQueryClient()

  return useMutation<{list: SonetList}, Error, UpdateListRequest>({
    mutationFn: async (data) => {
      const {list_id, ...updateData} = data
      const response = await apiRequest(`/v1/lists/${list_id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: RQKEY(data.list.list_id),
      })
      queryClient.invalidateQueries({
        queryKey: RQKEY_USER_LISTS(data.list.owner_id),
      })
    },
  })
}

export function useDeleteListMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<void, Error, {list_id: string}>({
    mutationFn: async ({list_id}) => {
      await apiRequest(`/v1/lists/${list_id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, {list_id}) => {
      queryClient.removeQueries({
        queryKey: RQKEY(list_id),
      })
      queryClient.removeQueries({
        queryKey: RQKEY_LIST_MEMBERS(list_id),
      })
      if (currentAccount?.userId) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_LISTS(currentAccount.userId),
        })
      }
    },
  })
}

export function useAddListMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation<{member: SonetListMember}, Error, AddListMemberRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest(`/v1/lists/${data.list_id}/members`, {
        method: 'NOTE',
        body: JSON.stringify({
          user_id: data.user_id,
          notes: data.notes,
        }),
      })
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: RQKEY_LIST_MEMBERS(data.member.list_id),
      })
      queryClient.invalidateQueries({
        queryKey: RQKEY(data.member.list_id),
      })
    },
  })
}

export function useRemoveListMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, {list_id: string, user_id: string}>({
    mutationFn: async ({list_id, user_id}) => {
      await apiRequest(`/v1/lists/${list_id}/members/${user_id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, {list_id}) => {
      queryClient.invalidateQueries({
        queryKey: RQKEY_LIST_MEMBERS(list_id),
      })
      queryClient.invalidateQueries({
        queryKey: RQKEY(list_id),
      })
    },
  })
}