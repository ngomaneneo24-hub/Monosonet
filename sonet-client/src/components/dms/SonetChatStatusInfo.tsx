import React from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {CircleX_Stroke2_Corner0_Rounded as ErrorIcon} from '#/components/icons/CircleX'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {CircleCheck_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/CircleCheck'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Circle_Stroke2_Corner0_Rounded as CircleIcon} from '#/components/icons/Circle'

interface SonetChatStatusInfoProps {
  state: any
}

export function SonetChatStatusInfo({state}: SonetChatStatusInfoProps) {
  const t = useTheme()

  const getStatusMessage = () => {
    if (state.status === 'loading') {
      return 'Loading conversation...'
    } else if (state.status === 'error') {
      return 'Failed to load conversation'
    } else if (state.messages.length === 0) {
      return 'No messages yet'
    } else {
      return 'Conversation ready'
    }
  }

  const getStatusIcon = () => {
    if (state.status === 'loading') {
      return <ClockIcon size="lg" style={[t.atoms.text_warning]} />
    } else if (state.status === 'error') {
      return <ErrorIcon size="lg" style={[t.atoms.text_negative]} />
    } else if (state.messages.length === 0) {
      return <MessageIcon size="lg" style={[t.atoms.text_contrast_medium]} />
    } else {
      return <CheckIcon size="lg" style={[t.atoms.text_positive]} />
    }
  }

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
        {/* Status icon */}
        <View style={[a.mb_sm]}>
          {getStatusIcon()}
        </View>
        
        {/* Status message */}
        <Text
          style={[
            a.text_sm,
            a.text_center,
            t.atoms.text_contrast_medium,
          ]}>
          {getStatusMessage()}
        </Text>
        
        {/* Encryption status if available */}
        {state.chat?.isEncrypted && (
          <View style={[a.flex_row, a.items_center, a.gap_xs, a.mt_sm]}>
            <ShieldIcon
              size="xs"
              style={[t.atoms.text_positive]}
            />
            <Text
              style={[
                a.text_xs,
                t.atoms.text_positive,
              ]}>
              End-to-end encrypted
            </Text>
          </View>
        )}
        
        {/* Connection status */}
        {state.isConnected !== undefined && (
          <View style={[a.flex_row, a.items_center, a.gap_xs, a.mt_xs]}>
            <CircleIcon
              size="xs"
              style={[
                state.isConnected ? t.atoms.text_positive : t.atoms.text_negative,
              ]}
            />
            <Text
              style={[
                a.text_xs,
                state.isConnected ? t.atoms.text_positive : t.atoms.text_negative,
              ]}>
              {state.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}