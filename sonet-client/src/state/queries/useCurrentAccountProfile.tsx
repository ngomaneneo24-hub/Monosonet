import {useMaybeProfileShadow} from '#/state/cache/profile-shadow'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'

export function useCurrentAccountProfile() {
  const {currentAccount} = useSession()
  const {data: profile} = useProfileQuery({userId: currentAccount?.userId})
  return useMaybeProfileShadow(profile)
}
