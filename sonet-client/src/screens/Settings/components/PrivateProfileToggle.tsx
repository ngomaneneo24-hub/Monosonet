import {useCallback} from 'react'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useSession} from '#/state/session'
import {usePrivateProfileQuery, useUpdatePrivateProfileMutation} from '#/state/queries/private-profile'
import * as Toast from '#/view/com/util/Toast'
import * as SettingsList from './SettingsList'

export function PrivateProfileToggle() {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {data: isPrivate, isLoading} = usePrivateProfileQuery()
  const updatePrivateProfile = useUpdatePrivateProfileMutation()

  const onToggle = useCallback(async () => {
    if (!currentAccount?.did) return

    try {
      await updatePrivateProfile.mutateAsync({
        is_private: !isPrivate,
      })
      
      Toast.show(
        isPrivate 
          ? _(msg`Profile is now public`) 
          : _(msg`Profile is now private`),
        'check'
      )
    } catch (error) {
      Toast.show(_(msg`Failed to update profile privacy`), 'xmark')
    }
  }, [_, currentAccount?.did, isPrivate, updatePrivateProfile])

  return (
    <SettingsList.Toggle
      value={isPrivate}
      onValueChange={onToggle}
      disabled={isLoading || updatePrivateProfile.isPending}
      accessibilityLabel={_(msg`Toggle private profile`)}
      accessibilityHint={
        isPrivate
          ? _(msg`Double tap to make profile public`)
          : _(msg`Double tap to make profile private`)
      }
    />
  )
}