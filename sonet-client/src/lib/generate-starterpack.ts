import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useMutation} from '@tanstack/react-query'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {enforceLen} from '#/lib/strings/helpers'
import {useAgent} from '#/state/session'
import {sonetClient} from '@sonet/api'
import {SonetUser, SonetFacet} from '@sonet/types'

export const createStarterPackList = async ({
  name,
  description,
  descriptionFacets,
  profiles,
  agent,
}: {
  name: string
  description?: string
  descriptionFacets?: SonetFacet[]
  profiles: SonetUser[]
  agent: any
}): Promise<{uri: string; cid: string}> => {
  if (profiles.length === 0) throw new Error('No profiles given')

  // Sonet simplified list creation
  // In a real implementation, this would call Sonet's list API
  const list = {
    uri: `sonet://list/${Date.now()}`,
    cid: `cid-${Date.now()}`,
  }
  
  // For now, just return a mock list
  // TODO: Implement actual Sonet list creation
  console.log('Creating starter pack list:', {name, description, profiles})
  
  return list
}

export function useGenerateStarterPackMutation({
  onSuccess,
  onError,
}: {
  onSuccess: ({uri, cid}: {uri: string; cid: string}) => void
  onError: (e: Error) => void
}) {
  const {_} = useLingui()
  const agent = useAgent()

  return useMutation<{uri: string; cid: string}, Error, void>({
    mutationFn: async () => {
      let profile: SonetUser | undefined
      let profiles: SonetUser[] | undefined

      await Promise.all([
        (async () => {
          try {
            profile = await sonetClient.getUser(agent.session?.user?.username || '')
          } catch (error) {
            console.error('Failed to get profile:', error)
          }
        })(),
        (async () => {
          try {
            const searchResult = await sonetClient.search('*', 'users')
            profiles = searchResult.users.slice(0, 49)
          } catch (error) {
            console.error('Failed to search users:', error)
          }
        })(),
      ])

      if (!profile || !profiles) {
        throw new Error('ERROR_DATA')
      }

      // We include ourselves when we make the list
      if (profiles.length < 7) {
        throw new Error('NOT_ENOUGH_FOLLOWERS')
      }

      const displayName = enforceLen(
        profile.displayName
          ? sanitizeDisplayName(profile.displayName)
          : `@${sanitizeHandle(profile.handle)}`,
        25,
        true,
      )
      const starterPackName = _(msg`${displayName}'s Starter Pack`)

      const list = await createStarterPackList({
        name: starterPackName,
        profiles,
        agent,
      })

      // Sonet simplified starterpack creation
      return {
        uri: list.uri,
        cid: list.cid,
        name: starterPackName,
        list: list.uri,
        createdAt: new Date().toISOString(),
      }
    },
    onSuccess: async data => {
      // Sonet simplified - no need to wait for app view
      onSuccess(data)
    },
    onError: error => {
      onError(error)
    },
  })
}

// Helper functions removed - not needed for Sonet implementation
