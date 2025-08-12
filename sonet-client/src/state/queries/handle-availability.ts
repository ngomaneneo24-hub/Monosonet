import {useQuery} from '@tanstack/react-query'

import {
  BSKY_SERVICE,
  BSKY_SERVICE_DID,
  PUBLIC_BSKY_SERVICE,
} from '#/lib/constants'
import {createFullHandle} from '#/lib/strings/handles'
import {logger} from '#/logger'
import {useDebouncedValue} from '#/components/live/utils'
import {sonetClient} from '@sonet/api'

export const RQKEY_handleAvailability = (
  handle: string,
  domain: string,
  serviceDid: string,
) => ['handle-availability', {handle, domain, serviceDid}]

export function useHandleAvailabilityQuery(
  {
    username,
    serviceDomain,
    serviceDid,
    enabled,
    birthDate,
    email,
  }: {
    username: string
    serviceDomain: string
    serviceDid: string
    enabled: boolean
    birthDate?: string
    email?: string
  },
  debounceDelayMs = 500,
) {
  const name = username.trim()
  const debouncedHandle = useDebouncedValue(name, debounceDelayMs)

  return {
    debouncedUsername: debouncedHandle,
    enabled: enabled && name === debouncedHandle,
    query: useQuery({
      enabled: enabled && name === debouncedHandle,
      queryKey: RQKEY_handleAvailability(
        debouncedHandle,
        serviceDomain,
        serviceDid,
      ),
      queryFn: async () => {
        const handle = createFullHandle(name, serviceDomain)
        return await checkHandleAvailability(handle, serviceDid, {
          email,
          birthDate,
          typeahead: true,
        })
      },
    }),
  }
}

export async function checkHandleAvailability(
  handle: string,
  serviceDid: string,
  {
    email,
    birthDate,
    typeahead,
  }: {
    email?: string
    birthDate?: string
    typeahead?: boolean
  },
) {
  if (serviceDid === BSKY_SERVICE_DID) {
    // Use Sonet API to check username availability
    try {
      const username = handle.split('.')[0] // Extract username from handle
      const user = await sonetClient.getUser(username)
      
      if (user) {
        logger.metric('signup:handleTaken', {typeahead}, {statsig: true})
        return {
          available: false,
          suggestions: [`${username}1`, `${username}2`, `${username}_`],
        } as const
      }
    } catch (error) {
      // If user not found, username is available
      logger.metric('signup:handleAvailable', {typeahead}, {statsig: true})
      return {available: true} as const
    }
    
    // Fallback to available if no error
    logger.metric('signup:handleAvailable', {typeahead}, {statsig: true})
    return {available: true} as const
  } else {
    // For non-Sonet services, try to resolve the handle
    try {
      const username = handle.split('.')[0]
      const user = await sonetClient.getUser(username)
      
      if (user) {
        logger.metric('signup:handleTaken', {typeahead}, {statsig: true})
        return {available: false} as const
      }
    } catch {}
    
    logger.metric('signup:handleAvailable', {typeahead}, {statsig: true})
    return {available: true} as const
  }
}
