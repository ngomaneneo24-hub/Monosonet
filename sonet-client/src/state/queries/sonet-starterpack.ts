import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {STALE} from '#/state/queries'
import {useSession} from '#/state/session'

// API base URL - should be configurable
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api' 
  : '/api'

// Types for Sonet API responses
export interface SonetStarterpack {
  starterpack_id: string
  creator_id: string
  name: string
  description: string
  avatar_url: string
  is_public: boolean
  created_at: string
  updated_at: string
  item_count: number
}

export interface SonetStarterpackItem {
  item_id: string
  starterpack_id: string
  item_type: 'profile' | 'feed'
  item_uri: string
  item_order: number
  created_at: string
}

export interface CreateStarterpackRequest {
  name: string
  description?: string
  avatar_url?: string
  is_public?: boolean
}

export interface UpdateStarterpackRequest {
  starterpack_id: string
  name?: string
  description?: string
  avatar_url?: string
  is_public?: boolean
}

export interface AddStarterpackItemRequest {
  starterpack_id: string
  item_type: 'profile' | 'feed'
  item_uri: string
  item_order: number
}

// Query keys
export const RQKEY_ROOT = 'sonet-starterpack'
export const RQKEY = (starterpackId: string) => [RQKEY_ROOT, starterpackId]
export const RQKEY_USER_STARTERPACKS = (userId: string) => [RQKEY_ROOT, 'user', userId]
export const RQKEY_STARTERPACK_ITEMS = (starterpackId: string) => [RQKEY_ROOT, 'items', starterpackId]
export const RQKEY_SUGGESTED = () => [RQKEY_ROOT, 'suggested']

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
export function useStarterpackQuery(starterpackId?: string) {
  return useQuery<SonetStarterpack, Error>({
    queryKey: RQKEY(starterpackId || ''),
    queryFn: async () => {
      if (!starterpackId) throw new Error('Starterpack ID required')
      const response = await apiRequest(`/v1/starterpacks/${starterpackId}`)
      return response.starterpack
    },
    enabled: !!starterpackId,
    staleTime: STALE.MINUTES.ONE,
  })
}

export function useUserStarterpacksQuery(userId?: string, limit = 20, cursor?: string) {
  return useQuery<{starterpacks: SonetStarterpack[], next_cursor?: string}, Error>({
    queryKey: [...RQKEY_USER_STARTERPACKS(userId || ''), limit, cursor],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && {cursor}),
      })
      const response = await apiRequest(`/v1/users/${userId}/starterpacks?${params}`)
      return response
    },
    enabled: !!userId,
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useStarterpackItemsQuery(starterpackId?: string, limit = 20, cursor?: string) {
  return useQuery<{items: SonetStarterpackItem[], next_cursor?: string}, Error>({
    queryKey: [...RQKEY_STARTERPACK_ITEMS(starterpackId || ''), limit, cursor],
    queryFn: async () => {
      if (!starterpackId) throw new Error('Starterpack ID required')
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && {cursor}),
      })
      const response = await apiRequest(`/v1/starterpacks/${starterpackId}/items?${params}`)
      return response
    },
    enabled: !!starterpackId,
    staleTime: STALE.MINUTES.ONE,
  })
}

export function useSuggestedStarterpacksQuery(limit = 20, cursor?: string) {
  return useQuery<{starterpacks: SonetStarterpack[], next_cursor?: string}, Error>({
    queryKey: [...RQKEY_SUGGESTED(), limit, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && {cursor}),
      })
      const response = await apiRequest(`/v1/starterpacks/suggested?${params}`)
      return response
    },
    staleTime: STALE.MINUTES.TEN,
  })
}

// Mutations
export function useCreateStarterpackMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<{starterpack: SonetStarterpack}, Error, CreateStarterpackRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest('/v1/starterpacks', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: () => {
      if (currentAccount?.did) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_STARTERPACKS(currentAccount.did),
        })
      }
    },
  })
}

export function useUpdateStarterpackMutation() {
  const queryClient = useQueryClient()

  return useMutation<{starterpack: SonetStarterpack}, Error, UpdateStarterpackRequest>({
    mutationFn: async (data) => {
      const {starterpack_id, ...updateData} = data
      const response = await apiRequest(`/v1/starterpacks/${starterpack_id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: RQKEY(data.starterpack.starterpack_id),
      })
      queryClient.invalidateQueries({
        queryKey: RQKEY_USER_STARTERPACKS(data.starterpack.creator_id),
      })
    },
  })
}

export function useDeleteStarterpackMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<void, Error, {starterpack_id: string}>({
    mutationFn: async ({starterpack_id}) => {
      await apiRequest(`/v1/starterpacks/${starterpack_id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, {starterpack_id}) => {
      queryClient.removeQueries({
        queryKey: RQKEY(starterpack_id),
      })
      queryClient.removeQueries({
        queryKey: RQKEY_STARTERPACK_ITEMS(starterpack_id),
      })
      if (currentAccount?.did) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_STARTERPACKS(currentAccount.did),
        })
      }
    },
  })
}

export function useAddStarterpackItemMutation() {
  const queryClient = useQueryClient()

  return useMutation<{item: SonetStarterpackItem}, Error, AddStarterpackItemRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest(`/v1/starterpacks/${data.starterpack_id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          item_type: data.item_type,
          item_uri: data.item_uri,
          item_order: data.item_order,
        }),
      })
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: RQKEY_STARTERPACK_ITEMS(data.item.starterpack_id),
      })
      queryClient.invalidateQueries({
        queryKey: RQKEY(data.item.starterpack_id),
      })
    },
  })
}

export function useRemoveStarterpackItemMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, {starterpack_id: string, item_id: string}>({
    mutationFn: async ({starterpack_id, item_id}) => {
      await apiRequest(`/v1/starterpacks/${starterpack_id}/items/${item_id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, {starterpack_id}) => {
      queryClient.invalidateQueries({
        queryKey: RQKEY_STARTERPACK_ITEMS(starterpack_id),
      })
      queryClient.invalidateQueries({
        queryKey: RQKEY(starterpack_id),
      })
    },
  })
}