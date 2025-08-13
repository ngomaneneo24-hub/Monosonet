import {useMemo} from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {useProfileQuery} from '#/state/queries/profile'
import {useResolveDidQuery} from '#/state/queries/resolve-uri'
import {useSession} from '#/state/session'
import {SearchScreenShell} from '#/screens/Search/Shell'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'ProfileSearch'>
export const ProfileSearchScreen = ({route}: Props) => {
  const {name, q: queryParam = ''} = route.params
  const {_} = useLingui()
  const {currentAccount} = useSession()

  const {data: resolvedDid} = useResolveDidQuery(name)
  const {data: profile} = useProfileQuery({userId: resolvedDid})

  const fixedParams = useMemo(
    () => ({
      from: profile?.username ?? name,
    }),
    [profile?.username, name],
  )

  return (
    <SearchScreenShell
      navButton="back"
      inputPlaceholder={
        profile
          ? currentAccount?.userId === profile.userId
            ? _(msg`Search my notes`)
            : _(msg`Search @${profile.username}'s notes`)
          : _(msg`Search...`)
      }
      fixedParams={fixedParams}
      queryParam={queryParam}
      testID="searchNotesScreen"
    />
  )
}
