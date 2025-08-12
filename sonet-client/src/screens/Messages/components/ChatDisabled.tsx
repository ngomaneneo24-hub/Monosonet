import {useCallback} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfoIcon} from '#/components/icons/CircleInfo'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Text} from '#/components/Typography'
import {useModalControls} from '#/state/modals'
import {useModerationCauseDescription} from '#/lib/moderation/useModerationCauseDescription'
import {useModerationCauseLabel} from '#/lib/moderation/useModerationCauseLabel'
import {useModerationCause} from '#/lib/moderation/useModerationCause'

export function ChatDisabled({
  reason,
  reasonType,
  reasonDescription,
  isAppealable,
  isAppealed,
  onAppeal,
}: {
  reason: string
  reasonType: string // TODO: Replace with proper Sonet moderation type
  reasonDescription?: string
  isAppealable: boolean
  isAppealed: boolean
  onAppeal: () => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const {openModal} = useModalControls()
  const moderationCause = useModerationCause(reasonType)
  const moderationCauseLabel = useModerationCauseLabel(moderationCause)
  const moderationCauseDescription = useModerationCauseDescription(
    moderationCause,
    reasonDescription,
  )

  const openAppealModal = useCallback(() => {
    openModal({
      name: 'moderation-appeal',
      moderationCause,
      onAppeal,
    })
  }, [openModal, moderationCause, onAppeal])

  const openModerationDetailsModal = useCallback(() => {
    openModal({
      name: 'moderation-details',
      moderationCause,
      reasonDescription,
    })
  }, [openModal, moderationCause, reasonDescription])

  return (
    <View style={[a.flex_1, a.justify_center, a.align_center, a.px_lg]}>
      <View style={[a.align_center, a.max_w_sm]}>
        <View
          style={[
            a.w_16,
            a.h_16,
            a.rounded_full,
            a.align_center,
            a.justify_center,
            t.atoms.bg_contrast_25,
            a.mb_lg,
          ]}>
          <ShieldIcon
            width={32}
            height={32}
            fill={t.atoms.text_contrast_medium.color}
          />
        </View>

        <Text style={[a.text_2xl, a.font_bold, a.text_center, a.mb_md]}>
          <Trans>Chat disabled</Trans>
        </Text>

        <Text
          style={[
            a.text_md,
            a.text_center,
            a.leading_snug,
            t.atoms.text_contrast_medium,
            a.mb_xl,
          ]}>
          {moderationCauseDescription}
        </Text>

        <View style={[a.flex_row, a.gap_sm, a.mb_lg]}>
          <Button
            label={_(msg`View details`)}
            size="small"
            color="secondary"
            variant="ghost"
            onPress={openModerationDetailsModal}>
            <ButtonIcon icon={CircleInfoIcon} />
            <ButtonText>
              <Trans>View details</Trans>
            </ButtonText>
          </Button>

          {isAppealable && !isAppealed && (
            <Button
              label={_(msg`Appeal`)}
              size="small"
              color="primary"
              variant="solid"
              onPress={openAppealModal}>
              <ButtonText>
                <Trans>Appeal</Trans>
              </ButtonText>
            </Button>
          )}
        </View>

        {isAppealed && (
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.gap_sm,
              a.px_md,
              a.py_sm,
              a.rounded_md,
              t.atoms.bg_positive_25,
            ]}>
            <CircleInfoIcon
              width={16}
              height={16}
              fill={t.atoms.text_positive.color}
            />
            <Text
              style={[
                a.text_sm,
                t.atoms.text_positive,
                a.font_medium,
              ]}>
              <Trans>Appeal submitted</Trans>
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
