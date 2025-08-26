import React from 'react'
import {View, TouchableOpacity} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'

interface PinnedMessage {
  id: string
  content: string
  senderName: string
  timestamp: string
}

interface SonetMessagePinProps {
  pinnedMessage: PinnedMessage
  onUnpin: (messageId: string) => void
  onPress: (messageId: string) => void
}

export function SonetMessagePin({
  pinnedMessage,
  onUnpin,
  onPress,
}: SonetMessagePinProps) {
  const t = useTheme()
  const {_} = useLingui()

  const handlePress = () => {
    onPress(pinnedMessage.id)
  }

  const handleUnpin = () => {
    onUnpin(pinnedMessage.id)
  }

  return (
    <View style={[
      a.mx_md,
      a.mt_sm,
      a.mb_sm,
      a.px_md,
      a.py_sm,
      a.rounded_2xl,
      a.border,
      t.atoms.bg_primary_25,
      t.atoms.border_primary,
    ]}>
      {/* Pin Header */}
      <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_xs]}>
        <View style={[a.flex_row, a.items_center, a.gap_xs]}>
          <PinIcon size="xs" style={[t.atoms.text_primary]} />
          <Text style={[a.text_xs, t.atoms.text_primary, a.font_bold]}>
            <Trans>Pinned message</Trans>
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleUnpin}
          style={[
            a.p_1,
            a.rounded_sm,
            t.atoms.bg_primary_25,
          ]}>
          <CloseIcon
            size="xs"
            style={[t.atoms.text_primary]}
          />
        </TouchableOpacity>
      </View>

      {/* Pinned Message Content */}
      <TouchableOpacity
        onPress={handlePress}
        style={[a.flex_1]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.font_bold]}>
          {pinnedMessage.senderName}
        </Text>
        <Text style={[a.text_sm, t.atoms.text, a.mt_1]}>
          {pinnedMessage.content.length > 100 
            ? pinnedMessage.content.substring(0, 100) + '...'
            : pinnedMessage.content
          }
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
          {new Date(pinnedMessage.timestamp).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export function SonetMessagePinList({
  pinnedMessages,
  onUnpin,
  onPress,
}: {
  pinnedMessages: PinnedMessage[]
  onUnpin: (messageId: string) => void
  onPress: (messageId: string) => void
}) {
  if (pinnedMessages.length === 0) return null

  return (
    <View style={[a.gap_sm]}>
      {pinnedMessages.map(message => (
        <SonetMessagePin
          key={message.id}
          pinnedMessage={message}
          onUnpin={onUnpin}
          onPress={onPress}
        />
      ))}
    </View>
  )
}