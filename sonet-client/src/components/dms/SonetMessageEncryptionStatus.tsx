import React from 'react'
import {View, TouchableOpacity} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {CircleCheck_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/CircleCheck'
import {CircleX_Stroke2_Corner0_Rounded as ErrorIcon} from '#/components/icons/CircleX'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'

interface SonetMessageEncryptionStatusProps {
  isEncrypted: boolean
  encryptionStatus: 'encrypted' | 'decrypted' | 'failed' | 'pending'
  onPress?: () => void
  showDetails?: boolean
}

export function SonetMessageEncryptionStatus({
  isEncrypted,
  encryptionStatus,
  onPress,
  showDetails = false,
}: SonetMessageEncryptionStatusProps) {
  const t = useTheme()
  const {_} = useLingui()

  // Get encryption icon
  const getEncryptionIcon = () => {
    if (!isEncrypted) return null

    switch (encryptionStatus) {
      case 'encrypted':
        return <ShieldIcon size="sm" style={[t.atoms.text_positive]} />
      case 'decrypted':
        return <CheckIcon size="sm" style={[t.atoms.text_positive]} />
      case 'failed':
        return <ErrorIcon size="sm" style={[t.atoms.text_negative]} />
      case 'pending':
        return <ClockIcon size="sm" style={[t.atoms.text_warning]} />
      default:
        return <ShieldIcon size="sm" style={[t.atoms.text_contrast_medium]} />
    }
  }

  // Get encryption text
  const getEncryptionText = () => {
    if (!isEncrypted) return _('Not encrypted')

    switch (encryptionStatus) {
      case 'encrypted':
        return _('Encrypted')
      case 'decrypted':
        return _('Decrypted')
      case 'failed':
        return _('Decryption failed')
      case 'pending':
        return _('Decrypting...')
      default:
        return _('Unknown')
    }
  }

  // Get encryption color
  const getEncryptionColor = () => {
    if (!isEncrypted) return t.atoms.text_contrast_medium

    switch (encryptionStatus) {
      case 'encrypted':
      case 'decrypted':
        return t.atoms.text_positive
      case 'failed':
        return t.atoms.text_negative
      case 'pending':
        return t.atoms.text_warning
      default:
        return t.atoms.text_contrast_medium
    }
  }

  // Get encryption tooltip
  const getEncryptionTooltip = () => {
    if (!isEncrypted) return _('This message is not encrypted')

    switch (encryptionStatus) {
      case 'encrypted':
        return _('This message is end-to-end encrypted')
      case 'decrypted':
        return _('This message has been successfully decrypted')
      case 'failed':
        return _('Failed to decrypt this message')
      case 'pending':
        return _('Decrypting this message...')
      default:
        return _('Encryption status unknown')
    }
  }

  const content = (
    <View style={[a.flex_row, a.items_center, a.gap_xs]}>
      {getEncryptionIcon()}
      {showDetails && (
        <Text
          style={[
            a.text_xs,
            getEncryptionColor(),
          ]}>
          {getEncryptionText()}
        </Text>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          a.p_1,
          a.rounded_sm,
        ]}
        accessibilityLabel={getEncryptionTooltip()}
        accessibilityRole="button">
        {content}
      </TouchableOpacity>
    )
  }

  return (
    <View
      style={[
        a.p_1,
        a.rounded_sm,
      ]}
      accessibilityLabel={getEncryptionTooltip()}>
      {content}
    </View>
  )
}