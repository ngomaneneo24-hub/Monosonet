import React from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function SonetChatDisabled() {
  const t = useTheme()

  return (
    <View style={[a.flex_row, a.justify_center, a.px_md, a.py_lg]}>
      <View
        style={[
          a.rounded_2xl,
          a.px_md,
          a.py_md,
          a.border,
          a.items_center,
          a.max_w_80,
          t.atoms.bg_negative_25,
          t.atoms.border_negative,
        ]}>
        {/* Disabled chat icon */}
        <Text style={[a.text_2xl, a.mb_sm]}>
          🚫
        </Text>
        
        {/* Disabled chat message */}
        <Text
          style={[
            a.text_sm,
            a.text_center,
            t.atoms.text_negative,
          ]}>
          Chat is currently disabled
        </Text>
        
        {/* Reason */}
        <Text
          style={[
            a.text_xs,
            a.text_center,
            a.mt_sm,
            t.atoms.text_contrast_medium,
          ]}>
          This conversation may be blocked or unavailable
        </Text>
      </View>
    </View>
  )
}