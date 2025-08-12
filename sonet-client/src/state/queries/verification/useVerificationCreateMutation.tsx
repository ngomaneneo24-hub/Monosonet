import {type SonetActorGetProfile} from '@sonet/api'
import {useMutation} from '@tanstack/react-query'

import {until} from '#/lib/async/until'
import {logger} from '#/logger'
import {useUpdateProfileVerificationCache} from '#/state/queries/verification/useUpdateProfileVerificationCache'
import {useAgent, useSession} from '#/state/session'
import type * as bsky from '#/types/bsky'

export function useVerificationCreateMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const updateProfileVerificationCache = useUpdateProfileVerificationCache()

  return useMutation({
    async mutationFn({profile}: {profile: bsky.profile.AnyProfileView}) {
      if (!currentAccount) {
        throw new Error('User not logged in')
      }

      const {uri} = await agent.app.sonet.graph.verification.create(
        {repo: currentAccount.userId},
        {
          subject: profile.userId,
          createdAt: new Date().toISOString(),
          username: profile.username,
          displayName: profile.displayName || '',
        },
      )

      await until(
        5,
        1e3,
        ({data: profile}: SonetActorGetProfile.Response) => {
          if (
            profile.verification &&
            profile.verification.verifications.find(v => v.uri === uri)
          ) {
            return true
          }
          return false
        },
        () => {
          return agent.getProfile({actor: profile.userId ?? ''})
        },
      )
    },
    async onSuccess(_, {profile}) {
      logger.metric('verification:create', {}, {statsig: true})
      await updateProfileVerificationCache({profile})
    },
  })
}
