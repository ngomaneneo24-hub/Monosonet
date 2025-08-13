import {memo, useCallback, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useSession} from '#/state/session'
import {useProfileFollowMutationQueue} from '#/state/queries/profile'
import * as bsky from '#/types/bsky'
import {
  atoms as a,
  useBreakpoints,
  useTheme,
} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {TimesLarge_Stroke2_Corner0_Rounded as X} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {isWeb} from '#/platform/detection'

interface PrivateProfileFollowDialogProps {
  profile: bsky.profile.AnyProfileView
  onFollow?: () => void
}

export function PrivateProfileFollowDialog({
  profile,
  onFollow,
}: PrivateProfileFollowDialogProps) {
  const {_} = useLingui()
  const {gtMobile} = useBreakpoints()
  const control = Dialog.useDialogControl()

  return (
    <>
      <Button
        label={_(msg`Follow ${profile.displayName || profile.username}`)}
        onPress={() => control.open()}
        size={gtMobile ? 'small' : 'large'}
        color="primary"
        variant="solid">
        <ButtonIcon icon={PersonIcon} />
        <ButtonText>
          <Trans>Follow</Trans>
        </ButtonText>
      </Button>
      <Dialog.Outer control={control}>
        <Dialog.Username />
        <DialogInner profile={profile} onFollow={onFollow} />
      </Dialog.Outer>
    </>
  )
}

function DialogInner({
  profile,
  onFollow,
}: {
  profile: bsky.profile.AnyProfileView
  onFollow?: () => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const control = Dialog.useDialogContext()
  const {currentAccount} = useSession()
  const [queueFollow] = useProfileFollowMutationQueue(
    profile,
    'PrivateProfileFollowDialog'
  )

  const usernameFollow = useCallback(async () => {
    try {
      await queueFollow()
      onFollow?.()
      control.close()
    } catch (error) {
      console.error('Failed to follow:', error)
    }
  }, [queueFollow, onFollow, control])

  return (
    <Dialog.Inner>
      <View style={[a.px_lg, a.py_xl, a.align_center, a.gap_lg]}>
        <View style={[a.align_center, a.gap_md]}>
          <View
            style={[
              a.rounded_full,
              a.align_center,
              a.justify_center,
              {width: 64, height: 64},
              t.atoms.bg_contrast_25,
            ]}>
            <LockIcon size="xl" fill={t.palette.contrast_500} />
          </View>
          <Text style={[a.text_lg, a.font_heavy, t.atoms.text_contrast_high]}>
            <Trans>This profile is private</Trans>
          </Text>
        </View>

        <View style={[a.gap_md, a.align_center]}>
          <Text style={[a.text_md, t.atoms.text_contrast_high, a.text_center]}>
            <Trans>
              Follow {profile.displayName || profile.username} to see their notes
              and updates.
            </Trans>
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
            <Trans>
              Private profiles only share content with approved followers.
            </Trans>
          </Text>
        </View>

        <View style={[a.flex_row, a.gap_md, a.w_full]}>
          <Button
            label={_(msg`Cancel`)}
            size="large"
            variant="ghost"
            color="secondary"
            style={[a.flex_1]}
            onPress={() => control.close()}>
            <ButtonText>
              <Trans>Cancel</Trans>
            </ButtonText>
          </Button>
          <Button
            label={_(msg`Follow ${profile.displayName || profile.username}`)}
            size="large"
            color="primary"
            variant="solid"
            style={[a.flex_1]}
            onPress={usernameFollow}>
            <ButtonIcon icon={PersonIcon} />
            <ButtonText>
              <Trans>Follow</Trans>
            </ButtonText>
          </Button>
        </View>
      </View>
    </Dialog.Inner>
  )
}