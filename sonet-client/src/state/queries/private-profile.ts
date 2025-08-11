import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useSession} from '#/state/session'
import {STALE} from './index'

// API base URL - should be configurable
const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api' 
  : '/api'

// Types
export interface PrivateProfileData {
  is_private: boolean
}

export interface UpdatePrivateProfileRequest {
  is_private: boolean
}

// Query keys
export const RQKEY_ROOT = 'private-profile'
export const RQKEY = (userId: string) => [RQKEY_ROOT, userId]

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
export function usePrivateProfileQuery() {
  const {currentAccount} = useSession()
  const {_} = useLingui()

  return useQuery<PrivateProfileData, Error>({
    queryKey: RQKEY(currentAccount?.did || ''),
    queryFn: async () => {
      if (!currentAccount?.did) throw new Error('User not authenticated')
      const response = await apiRequest(`/v1/users/${currentAccount.did}/privacy`)
      return response
    },
    enabled: !!currentAccount?.did,
    staleTime: STALE.MINUTES.FIVE,
    placeholderData: {is_private: false},
  })
}

// Mutations
export function useUpdatePrivateProfileMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const {_} = useLingui()

  return useMutation<PrivateProfileData, Error, UpdatePrivateProfileRequest>({
    mutationFn: async (data) => {
      if (!currentAccount?.did) throw new Error('User not authenticated')
      const response = await apiRequest(`/v1/users/${currentAccount.did}/privacy`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: (data) => {
      if (currentAccount?.did) {
        queryClient.setQueryData(RQKEY(currentAccount.did), data)
        queryClient.invalidateQueries({
          queryKey: ['profile', currentAccount.did],
        })
      }
    },
    onError: (error) => {
      console.error('Failed to update private profile:', error)
    },
  })
}