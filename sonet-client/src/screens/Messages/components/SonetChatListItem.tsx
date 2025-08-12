import React, {useCallback, useMemo} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {isWeb} from '#/platform/detection'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {Group3_Stroke2_Corner0_Rounded as GroupIcon} from '#/components/icons/Group'
import type {SonetChat} from '#/services/sonetMessagingApi'

interface SonetChatListItemProps {
  chat: SonetChat
  onPress: () => void
}

export function SonetChatListItem({chat, onPress}: SonetChatListItemProps) {
  const t = useTheme()
  const {_} = useLingui()

  // Get chat display information
  const chatDisplay = useMemo(() => {
    if (chat.type === 'direct' && chat.participants?.length === 1) {
      const participant = chat.participants[0]
      return {
        title: participant.displayName || participant.username,
        subtitle: `@${participant.username}`,
        avatar: participant.avatar,
        isVerified: participant.isVerified,
      }
    } else {
      return {
        title: chat.title || _('Group Chat'),
        subtitle: chat.participants?.length 
          ? _('{count} participants', {count: chat.participants.length})
          : _('No participants'),
        avatar: chat.avatar,
        isVerified: false,
      }
    }
  }, [chat, _])

  // Get last message information
  const lastMessageInfo = useMemo(() => {
    if (!chat.lastMessage) return null

    return {
      content: chat.lastMessage.content,
      timestamp: chat.lastMessage.timestamp,
      sender: chat.lastMessage.senderName || chat.lastMessage.senderId,
      isOwn: chat.lastMessage.senderId === 'current_user',
    }
  }, [chat.lastMessage])

  // Get unread count
  const unreadCount = chat.unreadCount || 0

  // Get chat status indicators
  const statusIndicators = useMemo(() => {
    const indicators = []

    // Encryption status
    if (chat.isEncrypted) {
      indicators.push({
        icon: <ShieldIcon size="xs" style={[t.atoms.text_positive]} />,
        color: t.atoms.text_positive,
        tooltip: _('End-to-end encrypted'),
      })
    }

    // Chat type indicator
    if (chat.type === 'group') {
      indicators.push({
        icon: <GroupIcon size="xs" style={[t.atoms.text_contrast_medium]} />,
        color: t.atoms.text_contrast_medium,
        tooltip: _('Group chat'),
      })
    }

    // Pending status
    if (chat.status === 'pending') {
      indicators.push({
        icon: <ClockIcon size="xs" style={[t.atoms.text_warning]} />,
        color: t.atoms.text_warning,
        tooltip: _('Pending approval'),
      })
    }

    return indicators
  }, [chat, t, _])

  // Handle long press for context menu
  const handleLongPress = useCallback(() => {
    // TODO: Implement context menu (archive, delete, etc.)
    console.log('Long press on chat:', chat.id)
  }, [chat.id])

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      style={[
        a.flex_row,
        a.items_center,
        a.gap_md,
        a.p_md,
        a.rounded_2xl,
        a.border,
        t.atoms.bg,
        t.atoms.border_contrast_25,
        unreadCount > 0 && t.atoms.bg_primary_25,
        unreadCount > 0 && t.atoms.border_primary,
      ]}>
      {/* Avatar */}
      <View style={[a.relative]}>
        <View
          style={[
            a.w_12,
            a.h_12,
            a.rounded_full,
            a.overflow_hidden,
            a.border,
            t.atoms.border_contrast_25,
          ]}>
          {chatDisplay.avatar ? (
            <img
              src={chatDisplay.avatar}
              alt={chatDisplay.title}
              style={{width: 48, height: 48}}
            />
          ) : (
            <View
              style={[
                a.w_full,
                a.h_full,
                t.atoms.bg_contrast_25,
                a.items_center,
                a.justify_center,
              ]}>
              <Text style={[a.text_lg, a.font_bold, t.atoms.text_contrast_medium]}>
                {chatDisplay.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {/* Verification badge */}
        {chatDisplay.isVerified && (
          <View
            style={[
              a.absolute,
              a.bottom_0,
              a.right_0,
              a.w_4,
              a.h_4,
              a.rounded_full,
              t.atoms.bg_positive,
              a.border,
              a.border_2,
              t.atoms.border,
              a.items_center,
              a.justify_center,
            ]}>
            <Text style={[a.text_xs, t.atoms.text_on_positive]}>✓</Text>
          </View>
        )}
      </View>

      {/* Chat Info */}
      <View style={[a.flex_1, a.min_w_0]}>
        {/* Title and Status */}
        <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_xs]}>
          <Text
            style={[
              a.text_lg,
              a.font_bold,
              unreadCount > 0 ? t.atoms.text : t.atoms.text,
              a.flex_1,
            ]}
            numberOfLines={1}>
            {chatDisplay.title}
          </Text>
          
                      {/* Status indicators */}
            <View style={[a.flex_row, a.items_center, a.gap_xs]}>
              {statusIndicators.map((indicator, index) => (
                <View key={index}>
                  {indicator.icon}
                </View>
              ))}
            </View>
        </View>

        {/* Subtitle */}
        <Text
          style={[
            a.text_sm,
            t.atoms.text_contrast_medium,
            a.mb_xs,
          ]}
          numberOfLines={1}>
          {chatDisplay.subtitle}
        </Text>

        {/* Last Message */}
        {lastMessageInfo && (
          <View style={[a.flex_row, a.items_center, a.justify_between]}>
            <Text
              style={[
                a.text_sm,
                unreadCount > 0 ? t.atoms.text : t.atoms.text_contrast_medium,
                a.flex_1,
              ]}
              numberOfLines={1}>
              {lastMessageInfo.isOwn && _('You: ')}
              {lastMessageInfo.content}
            </Text>
            
            {/* Timestamp */}
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
                a.ml_sm,
              ]}>
              <TimeElapsed timestamp={lastMessageInfo.timestamp} />
            </Text>
          </View>
        )}
      </View>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <View
          style={[
            a.w_5,
            a.h_5,
            a.rounded_full,
            a.items_center,
            a.justify_center,
            t.atoms.bg_primary,
            a.min_w_5,
          ]}>
          <Text
            style={[
              a.text_xs,
              a.font_bold,
              t.atoms.text_on_primary,
            ]}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}