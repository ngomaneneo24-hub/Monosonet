import React from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface SonetMessagesListBlockedFooterProps {
  recipient: any
  convoId: string
  hasMessages: boolean
  moderation?: any
}

export function SonetMessagesListBlockedFooter({
  recipient,
  convoId,
  hasMessages,
  moderation,
}: SonetMessagesListBlockedFooterProps) {
  const t = useTheme()

  if (!moderation?.blocked) return null

  return (
    <View
      style={[
        a.border_t,
        t.atoms.border_contrast_low,
        a.p_md,
        a.items_center,
        a.gap_sm,
      ]}>
      {/* Blocked message */}
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
        {/* Blocked icon */}
        <Text style={[a.text_2xl, a.mb_sm]}>
          🚫
        </Text>
        
        {/* Blocked message */}
        <Text
          style={[
            a.text_sm,
            a.text_center,
            t.atoms.text_negative,
          ]}>
          This conversation is blocked
        </Text>
        
        {/* Reason */}
        <Text
          style={[
            a.text_xs,
            a.text_center,
            a.mt_sm,
            t.atoms.text_contrast_medium,
          ]}>
          You cannot send or receive messages from this user
        </Text>
      </View>
      
      {/* Unblock action */}
      <Text
        style={[
          a.text_sm,
          t.atoms.text_contrast_medium,
          a.text_center,
        ]}>
        To unblock, go to their profile and tap "Unblock"
      </Text>
    </View>
  )
}