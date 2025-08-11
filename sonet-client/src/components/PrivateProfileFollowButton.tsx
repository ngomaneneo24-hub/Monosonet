import {useCallback} from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useSession} from '#/state/session'
import {useProfileFollowMutationQueue} from '#/state/queries/profile'
import * as bsky from '#/types/bsky'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {PlusLarge_Stroke2_Corner0_Rounded as Plus} from '#/components/icons/Plus'
import {PrivateProfileFollowDialog} from './PrivateProfileFollowDialog'
import * as Toast from '#/view/com/util/Toast'
import {sanitizeDisplayName} from '#/lib/strings/display-names'

interface PrivateProfileFollowButtonProps {
  profile: bsky.profile.AnyProfileView
  logContext: 'ProfileCard' | 'StarterPackProfilesList' | 'PrivateProfileFollowButton'
  colorInverted?: boolean
  onFollow?: () => void
  size?: 'small' | 'medium' | 'large'
  variant?: 'solid' | 'outline' | 'ghost'
  shape?: 'round' | 'square'
  withIcon?: boolean
}

export function PrivateProfileFollowButton({
  profile,
  logContext,
  colorInverted = false,
  onFollow,
  size = 'small',
  variant = 'solid',
  shape,
  withIcon = true,
}: PrivateProfileFollowButtonProps) {
  const {_} = useLingui()
  const {currentAccount, hasSession} = useSession()
  const isMe = profile.did === currentAccount?.did
  const [queueFollow, queueUnfollow] = useProfileFollowMutationQueue(
    profile,
    logContext,
  )

  // Don't show button if not logged in or viewing own profile
  if (!hasSession || isMe) {
    return null
  }

  // Don't show button if blocked
  if (
    profile.viewer?.blockedBy ||
    profile.viewer?.blocking ||
    profile.viewer?.blockingByList
  ) {
    return null
  }

  const handleFollow = useCallback(async () => {
    try {
      await queueFollow()
      Toast.show(
        _(
          msg`Following ${sanitizeDisplayName(
            profile.displayName || profile.handle,
          )}`,
        ),
      )
      onFollow?.()
    } catch (error) {
      console.error('Failed to follow:', error)
      Toast.show(_(msg`An issue occurred, please try again.`), 'xmark')
    }
  }, [_, profile.displayName, profile.handle, queueFollow, onFollow])

  const handleUnfollow = useCallback(async () => {
    try {
      await queueUnfollow()
      Toast.show(
        _(
          msg`No longer following ${sanitizeDisplayName(
            profile.displayName || profile.handle,
          )}`,
        ),
      )
    } catch (error) {
      console.error('Failed to unfollow:', error)
      Toast.show(_(msg`An issue occurred, please try again.`), 'xmark')
    }
  }, [_, profile.displayName, profile.handle, queueUnfollow])

  // If already following, show unfollow button
  if (profile.viewer?.following) {
    return (
      <Button
        label={_(msg`Unfollow ${profile.displayName || profile.handle}`)}
        size={size}
        variant={variant}
        color="secondary"
        shape={shape}
        onPress={handleUnfollow}>
        {withIcon && (
          <ButtonIcon icon={Check} position={shape === 'round' ? undefined : 'left'} />
        )}
        {shape === 'round' ? null : <ButtonText>{_(msg`Following`)}</ButtonText>}
      </Button>
    )
  }

  // If profile is private and not following, show private profile dialog
  if (profile.isPrivate && !profile.viewer?.following) {
    return (
      <PrivateProfileFollowDialog
        profile={profile}
        onFollow={handleFollow}
      />
    )
  }

  // Regular follow button for public profiles
  return (
    <Button
      label={_(msg`Follow ${profile.displayName || profile.handle}`)}
      size={size}
      variant={variant}
      color={colorInverted ? 'secondary_inverted' : 'primary'}
      shape={shape}
      onPress={handleFollow}>
      {withIcon && (
        <ButtonIcon icon={Plus} position={shape === 'round' ? undefined : 'left'} />
      )}
      {shape === 'round' ? null : <ButtonText>{_(msg`Follow`)}</ButtonText>}
    </Button>
  )
}