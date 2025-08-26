import React from 'react'
import {TouchableOpacity} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Eye_Stroke2_Corner0_Rounded as Eye} from '#/components/icons/Eye'
import {EyeOff_Stroke2_Corner0_Rounded as EyeOff} from '#/components/icons/EyeOff'

interface PassphraseToggleButtonProps {
  isVisible: boolean
  onToggle: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function PassphraseToggleButton({
  isVisible,
  onToggle,
  size = 'md',
}: PassphraseToggleButtonProps) {
  const {_} = useLingui()
  const t = useTheme()

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return [a.w_6, a.h_6]
      case 'md':
        return [a.w_8, a.h_8]
      case 'lg':
        return [a.w_10, a.h_10]
      default:
        return [a.w_8, a.h_8]
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16
      case 'md':
        return 20
      case 'lg':
        return 24
      default:
        return 20
    }
  }

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        a.absolute,
        a.right_2,
        a.top_2,
        a.z_10,
        a.rounded_sm,
        a.items_center,
        a.justify_center,
        a.p_sm,
        {
          backgroundColor: t.atoms.bg_contrast_100,
        },
        ...getSizeStyles(),
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        isVisible
          ? _('Hide passphrase')
          : _('Show passphrase')
      }
      accessibilityHint={
        isVisible
          ? _('Toggles passphrase visibility to hidden')
          : _('Toggles passphrase visibility to visible')
      }>
      {isVisible ? (
        <EyeOff
          size={getIconSize()}
          style={{color: t.atoms.text_contrast_medium}}
        />
      ) : (
        <Eye
          size={getIconSize()}
          style={{color: t.atoms.text_contrast_medium}}
        />
      )}
    </TouchableOpacity>
  )
}