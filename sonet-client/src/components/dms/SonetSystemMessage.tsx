import React from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {CircleX_Stroke2_Corner0_Rounded as ErrorIcon} from '#/components/icons/CircleX'
import {CircleCheck_Stroke2_Corner0_Rounded as SuccessIcon} from '#/components/icons/CircleCheck'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'

interface SonetSystemMessageProps {
  content: string
  type?: 'info' | 'warning' | 'error' | 'success'
  timestamp?: string
}

export function SonetSystemMessage({content, type = 'info', timestamp}: SonetSystemMessageProps) {
  const t = useTheme()

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          background: t.atoms.bg_warning_25,
          text: t.atoms.text_warning,
          border: t.atoms.border_warning,
        }
      case 'error':
        return {
          background: t.atoms.bg_negative_25,
          text: t.atoms.text_negative,
          border: t.atoms.border_negative,
        }
      case 'success':
        return {
          background: t.atoms.bg_positive_25,
          text: t.atoms.text_positive,
          border: t.atoms.border_positive,
        }
      default:
        return {
          background: t.atoms.bg_contrast_25,
          text: t.atoms.text_contrast_medium,
          border: t.atoms.border_contrast_25,
        }
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <View style={[a.flex_row, a.justify_center, a.px_md, a.py_sm]}>
      <View
        style={[
          a.rounded_full,
          a.px_md,
          a.py_sm,
          a.border,
          a.items_center,
          a.max_w_80,
          {
            backgroundColor: typeStyles.background,
            borderColor: typeStyles.border,
          },
        ]}>
        {/* Icon based on type */}
        <View style={[a.flex_row, a.items_center, a.gap_xs]}>
          {type === 'warning' && <WarningIcon size="xs" style={[t.atoms.text_warning]} />}
          {type === 'error' && <ErrorIcon size="xs" style={[t.atoms.text_negative]} />}
          {type === 'success' && <SuccessIcon size="xs" style={[t.atoms.text_positive]} />}
          {type === 'info' && <InfoIcon size="xs" style={[t.atoms.text_contrast_medium]} />}
          
          {/* Message content */}
          <Text
            style={[
              a.text_xs,
              a.text_center,
              {
                color: typeStyles.text,
              },
            ]}>
            {content}
          </Text>
        </View>
        
        {/* Timestamp if provided */}
        {timestamp && (
          <Text
            style={[
              a.text_xs,
              a.mt_xs,
              t.atoms.text_contrast_medium,
            ]}>
            {new Date(timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </View>
  )
}