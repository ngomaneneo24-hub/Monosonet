import React from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function SonetChatEmptyPill() {
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
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_25,
        ]}>
        {/* Empty chat icon */}
        <Text style={[a.text_2xl, a.mb_sm]}>
          💬
        </Text>
        
        {/* Empty chat message */}
        <Text
          style={[
            a.text_sm,
            a.text_center,
            t.atoms.text_contrast_medium,
          ]}>
          Start a conversation by sending a message
        </Text>
        
        {/* Encryption info */}
        <View style={[a.flex_row, a.items_center, a.gap_xs, a.mt_sm]}>
          <Text style={[a.text_xs, t.atoms.text_positive]}>🔒</Text>
          <Text
            style={[
              a.text_xs,
              t.atoms.text_positive,
            ]}>
            Messages are end-to-end encrypted
          </Text>
        </View>
      </View>
    </View>
  )
}