import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon} from '#/components/icons/Arrow'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {Text} from '#/components/Typography'
import {Avatar} from '#/view/com/util/Avatar'
import {Link} from '#/components/Link'

export function InboxPreview({
  profiles,
}: {
  profiles: any[] // TODO: Replace with proper Sonet user type
}) {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation()

  if (!profiles || profiles.length === 0) {
    return null
  }

  const handle = profiles[0]?.handle || 'unknown'
  const displayName = profiles[0]?.displayName || handle
  const avatar = profiles[0]?.avatar

  const otherProfiles = profiles.slice(1)
  const hasMultipleProfiles = otherProfiles.length > 0

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_between,
        a.px_md,
        a.py_md,
        a.mb_sm,
        a.rounded_md,
        t.atoms.bg_contrast_25,
      ]}>
      <View style={[a.flex_row, a.align_center, a.flex_1]}>
        <View style={[a.flex_row, a.align_center, a.mr_sm]}>
          <Avatar size={40} image={avatar} />
          {hasMultipleProfiles && (
            <View
              style={[
                a.ml_neg_2,
                a.w_10,
                a.h_10,
                a.rounded_full,
                a.border_2,
                a.border_white,
                t.atoms.bg_contrast_25,
                a.align_center,
                a.justify_center,
              ]}>
              <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
                +{otherProfiles.length}
              </Text>
            </View>
          )}
        </View>

        <View style={[a.flex_1, a.mr_sm]}>
          <Text style={[a.text_sm, a.font_bold, a.leading_snug]}>
            {hasMultipleProfiles ? (
              <Trans>
                {profiles.length} people want to chat with you
              </Trans>
            ) : (
              <Trans>{displayName} wants to chat with you</Trans>
            )}
          </Text>
          <Text
            style={[
              a.text_xs,
              t.atoms.text_contrast_medium,
              a.leading_snug,
            ]}>
            <Trans>Tap to view requests</Trans>
          </Text>
        </View>
      </View>

      <Button
        label={_(msg`View chat requests`)}
        size="small"
        color="primary"
        variant="ghost"
        onPress={() => navigation.navigate('MessagesInbox' as any)}>
        <ButtonIcon icon={ArrowRightIcon} />
      </Button>
    </View>
  )
}
