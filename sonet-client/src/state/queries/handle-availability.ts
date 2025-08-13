import {useQuery} from '@tanstack/react-query'

import {
  BSKY_SERVICE,
  BSKY_SERVICE_UserID,
  PUBLIC_BSKY_SERVICE,
} from '#/lib/constants'
import {createFullUsername} from '#/lib/strings/usernames'
import {logger} from '#/logger'
import {useDebouncedValue} from '#/components/live/utils'
import {sonetClient} from '@sonet/api'

export const RQKEY_usernameAvailability = (
  username: string,
  domain: string,
  serviceDid: string,
) => ['username-availability', {username, domain, serviceDid}]

export function useUsernameAvailabilityQuery(
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
  const debouncedUsername = useDebouncedValue(name, debounceDelayMs)

  return {
    debouncedUsername: debouncedUsername,
    enabled: enabled && name === debouncedUsername,
    query: useQuery({
      enabled: enabled && name === debouncedUsername,
      queryKey: RQKEY_usernameAvailability(
        debouncedUsername,
        serviceDomain,
        serviceDid,
      ),
      queryFn: async () => {
        const username = createFullUsername(name, serviceDomain)
        return await checkUsernameAvailability(username, serviceDid, {
          email,
          birthDate,
          typeahead: true,
        })
      },
    }),
  }
}

export async function checkUsernameAvailability(
  username: string,
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
  if (serviceDid === BSKY_SERVICE_UserID) {
    // Use Sonet API to check username availability
    try {
      const username = username.split('.')[0] // Extract username from username
      const user = await sonetClient.getUser(username)
      
      if (user) {
        logger.metric('signup:usernameTaken', {typeahead}, {statsig: true})
        return {
          available: false,
          suggestions: [`${username}1`, `${username}2`, `${username}_`],
        } as const
      }
    } catch (error) {
      // If user not found, username is available
      logger.metric('signup:usernameAvailable', {typeahead}, {statsig: true})
      return {available: true} as const
    }
    
    // Fallback to available if no error
    logger.metric('signup:usernameAvailable', {typeahead}, {statsig: true})
    return {available: true} as const
  } else {
    // For non-Sonet services, try to resolve the username
    try {
      const username = username.split('.')[0]
      const user = await sonetClient.getUser(username)
      
      if (user) {
        logger.metric('signup:usernameTaken', {typeahead}, {statsig: true})
        return {available: false} as const
      }
    } catch {}
    
    logger.metric('signup:usernameAvailable', {typeahead}, {statsig: true})
    return {available: true} as const
  }
}
