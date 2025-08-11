import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {STALE} from '#/state/queries'
import {useSession} from '#/state/session'

// API base URL - should be configurable
const API_BASE = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api'
  : '/api'

// Types
export interface DraftImage {
  uri: string
  width: number
  height: number
  alt_text?: string
}

export interface DraftVideo {
  uri: string
  width: number
  height: number
}

export interface Draft {
  draft_id: string
  user_id: string
  title?: string
  content: string
  reply_to_uri?: string
  quote_uri?: string
  mention_handle?: string
  images: DraftImage[]
  video?: DraftVideo
  labels: string[]
  threadgate?: any
  interaction_settings?: any
  created_at: string
  updated_at: string
  is_auto_saved: boolean
}

export interface CreateDraftRequest {
  content: string
  reply_to_uri?: string
  quote_uri?: string
  mention_handle?: string
  images?: DraftImage[]
  video?: DraftVideo
  labels?: string[]
  threadgate?: any
  interaction_settings?: any
  is_auto_saved?: boolean
}

export interface UpdateDraftRequest {
  draft_id: string
  content: string
  reply_to_uri?: string
  quote_uri?: string
  mention_handle?: string
  images?: DraftImage[]
  video?: DraftVideo
  labels?: string[]
  threadgate?: any
  interaction_settings?: any
}

export interface AutoSaveDraftRequest {
  content: string
  reply_to_uri?: string
  quote_uri?: string
  mention_handle?: string
  images?: DraftImage[]
  video?: DraftVideo
  labels?: string[]
  threadgate?: any
  interaction_settings?: any
}

// Query keys
export const RQKEY_ROOT = 'drafts'
export const RQKEY = (draftId: string) => [RQKEY_ROOT, draftId]
export const RQKEY_USER_DRAFTS = (userId: string) => [RQKEY_ROOT, 'user', userId]
export const RQKEY_AUTO_SAVED = (userId: string) => [RQKEY_ROOT, 'auto-saved', userId]

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
export function useUserDraftsQuery(limit = 20, cursor?: string, includeAutoSaved = false) {
  const {currentAccount} = useSession()

  return useQuery<{drafts: Draft[], next_cursor?: string}, Error>({
    queryKey: RQKEY_USER_DRAFTS(currentAccount?.did || ''),
    queryFn: async () => {
      if (!currentAccount?.did) throw new Error('User not authenticated')
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        include_auto_saved: includeAutoSaved.toString(),
      })
      if (cursor) params.append('cursor', cursor)
      
      const response = await apiRequest(`/v1/drafts?${params}`)
      return response
    },
    enabled: !!currentAccount?.did,
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useDraftQuery(draftId: string) {
  const {currentAccount} = useSession()

  return useQuery<{draft: Draft}, Error>({
    queryKey: RQKEY(draftId),
    queryFn: async () => {
      if (!currentAccount?.did) throw new Error('User not authenticated')
      const response = await apiRequest(`/v1/drafts/${draftId}`)
      return response
    },
    enabled: !!currentAccount?.did && !!draftId,
    staleTime: STALE.MINUTES.FIVE,
  })
}

export function useAutoSavedDraftQuery() {
  const {currentAccount} = useSession()

  return useQuery<{draft: Draft}, Error>({
    queryKey: RQKEY_AUTO_SAVED(currentAccount?.did || ''),
    queryFn: async () => {
      if (!currentAccount?.did) throw new Error('User not authenticated')
      const response = await apiRequest('/v1/drafts/auto-saved')
      return response
    },
    enabled: !!currentAccount?.did,
    staleTime: STALE.MINUTES.ONE,
  })
}

// Mutations
export function useCreateDraftMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<{draft: Draft}, Error, CreateDraftRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest('/v1/drafts', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: () => {
      if (currentAccount?.did) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_DRAFTS(currentAccount.did),
        })
      }
    },
  })
}

export function useUpdateDraftMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<{draft: Draft}, Error, UpdateDraftRequest>({
    mutationFn: async (data) => {
      const {draft_id, ...updateData} = data
      const response = await apiRequest(`/v1/drafts/${draft_id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      return response
    },
    onSuccess: (data) => {
      if (currentAccount?.did) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_DRAFTS(currentAccount.did),
        })
        queryClient.setQueryData(RQKEY(data.draft.draft_id), {draft: data.draft})
      }
    },
  })
}

export function useDeleteDraftMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<void, Error, string>({
    mutationFn: async (draftId) => {
      await apiRequest(`/v1/drafts/${draftId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, draftId) => {
      if (currentAccount?.did) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_USER_DRAFTS(currentAccount.did),
        })
        queryClient.removeQueries({
          queryKey: RQKEY(draftId),
        })
      }
    },
  })
}

export function useAutoSaveDraftMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<{draft: Draft}, Error, AutoSaveDraftRequest>({
    mutationFn: async (data) => {
      const response = await apiRequest('/v1/drafts/auto-save', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: (data) => {
      if (currentAccount?.did) {
        queryClient.setQueryData(RQKEY_AUTO_SAVED(currentAccount.did), {draft: data.draft})
      }
    },
  })
}