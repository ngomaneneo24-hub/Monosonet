import React from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function SonetMigrationStatus() {
  const t = useTheme()

  return (
    <View
      style={[
        a.rounded_2xl,
        a.px_md,
        a.py_sm,
        a.border,
        a.items_center,
        a.max_w_full,
        t.atoms.bg_positive_25,
        t.atoms.border_positive,
      ]}>
      {/* Migration icon */}
      <Text style={[a.text_lg, a.mb_xs]}>
        🚀
      </Text>
      
      {/* Migration message */}
      <Text
        style={[
          a.text_sm,
          a.text_center,
          a.font_bold,
          t.atoms.text_positive,
        ]}>
        Sonet Messaging Active
      </Text>
      
      {/* Status details */}
      <Text
        style={[
          a.text_xs,
          a.text_center,
          a.mt_xs,
          t.atoms.text_contrast_medium,
        ]}>
        End-to-end encrypted messaging with real-time updates
      </Text>
      
      {/* Features */}
      <View style={[a.flex_row, a.items_center, a.gap_xs, a.mt_sm]}>
        <Text style={[a.text_xs, t.atoms.text_positive]}>🔒</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>E2E Encryption</Text>
        
        <Text style={[a.text_xs, t.atoms.text_positive]}>⚡</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>Real-time</Text>
        
        <Text style={[a.text_xs, t.atoms.text_positive]}>🛡️</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>Secure</Text>
      </View>
    </View>
  )
}