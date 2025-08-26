import React, {useCallback, useMemo, useState} from 'react'
import {
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  View,
  Animated,
  PanResponder,
  PanResponderGestureState,
} from 'react-native'
import AnimatedView, {
  LayoutAnimationConfig,
  LinearTransition,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated'
import {type I18n} from '@lingui/core'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {isNative} from '#/platform/detection'
import {useSession} from '#/state/session'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import {atoms as a, native, useTheme} from '#/alf'
import {isOnlyEmoji} from '#/alf/typography'
import {ActionsWrapper} from '#/components/dms/ActionsWrapper'
import {InlineLinkText} from '#/components/Link'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {Reply_Stroke2_Corner0_Rounded as ReplyIcon} from '#/components/icons/Reply'
import {DateDivider} from './DateDivider'
import {MessageItemEmbed} from './MessageItemEmbed'
import {localDateString} from './util'
import {ReactionPicker} from '#/components/dms/ReactionPicker'
import {sonetMessagingApi} from '#/services/sonetMessagingApi'
import {Trans} from '@lingui/react'

// Sonet message interface
interface SonetMessage {
  id: string
  content: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  timestamp: string
  isEncrypted?: boolean
  encryptionStatus?: 'encrypted' | 'decrypted' | 'failed'
  attachments?: Array<{
    id: string
    type: string
    url: string
    filename: string
  }>
  reactions?: Array<{
    emoji: string
    userId: string
  }>
  status?: string
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
}

interface SonetMessageItemProps {
  message: SonetMessage
  isOwnMessage: boolean
  nextMessage?: SonetMessage
  prevMessage?: SonetMessage
  onReply?: (message: SonetMessage) => void
  onEdit?: (message: SonetMessage) => void
  onDelete?: (message: SonetMessage) => void
  onPin?: (message: SonetMessage) => void
}

let MessageItem = ({
  message,
  isOwnMessage,
  nextMessage,
  prevMessage,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: SonetMessageItemProps): React.ReactNode => {
  const t = useTheme()
  const {currentAccount} = useSession()
  const {_} = useLingui()

  const isFromSelf = isOwnMessage
  const [swipeOffset] = useState(new Animated.Value(0))
  const [showReplyPreview, setShowReplyPreview] = useState(false)

  const isNextFromSelf = nextMessage ? nextMessage.senderId === currentAccount?.userId : false
  const isNextFromSameSender = isNextFromSelf === isFromSelf

  const isNewDay = useMemo(() => {
    if (!prevMessage) return true

    const thisDate = new Date(message.timestamp)
    const prevDate = new Date(prevMessage.timestamp)

    return localDateString(thisDate) !== localDateString(prevDate)
  }, [message, prevMessage])

  const isLastMessageOfDay = useMemo(() => {
    if (!nextMessage) return true

    const thisDate = new Date(message.timestamp)
    const nextDate = new Date(nextMessage.timestamp)

    return localDateString(thisDate) !== localDateString(nextDate)
  }, [message.timestamp, nextMessage])

  const needsTail = isLastMessageOfDay || !isNextFromSameSender

  const isLastInGroup = useMemo(() => {
    if (!nextMessage) return true

    const thisDate = new Date(message.timestamp)
    const nextDate = new Date(nextMessage.timestamp)

    const diff = nextDate.getTime() - thisDate.getTime()

    // 5 minutes
    return diff > 5 * 60 * 1000
  }, [message, nextMessage])

  // Swipe gesture handler for reply
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50
    },
    onPanResponderGrant: () => {
      swipeOffset.setValue(0)
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx < 0) { // Only allow left swipe (for reply)
        const offset = Math.max(gestureState.dx, -80)
        swipeOffset.setValue(offset)
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50 && onReply) {
        // Trigger reply
        onReply(message)
        Animated.spring(swipeOffset, {
          toValue: 0,
          useNativeDriver: false,
        }).start()
      } else {
        // Reset position
        Animated.spring(swipeOffset, {
          toValue: 0,
          useNativeDriver: false,
        }).start()
      }
    },
  }), [swipeOffset, onReply, message])

  const onLongPress = useCallback(
    (e: GestureResponderEvent) => {
      if (isNative) {
        ActionsWrapper.show({
          message,
          isOwnMessage,
          onPress: () => {
            // Enhanced message actions
          },
          onReply: () => onReply?.(message),
          onEdit: () => onEdit?.(message),
          onDelete: () => onDelete?.(message),
          onPin: () => onPin?.(message),
        })
      }
    },
    [message, isOwnMessage, onReply, onEdit, onDelete, onPin],
  )

  const [showPicker, setShowPicker] = React.useState(false)
  const onBubbleLongPress = useCallback(() => {
    setShowPicker(v => !v)
  }, [])

  const onPickReaction = useCallback(async (emoji: string) => {
    setShowPicker(false)
    try {
      const already = message.reactions?.some(r => r.emoji === emoji)
      if (already) await sonetMessagingApi.removeReaction(message.id, emoji)
      else await sonetMessagingApi.addReaction(message.id, emoji)
    } catch (e) {
      console.error('reaction failed', e)
    }
  }, [message])

  const onPress = useCallback(() => {
    // Username message press
  }, [])

  const layoutAnimation: LayoutAnimationConfig = {
    ...LinearTransition.springify().mass(0.3),
  }

  return (
    <AnimatedView
      entering={ZoomIn.springify().mass(0.3)}
      exiting={ZoomOut.springify().mass(0.3)}
      layout={layoutAnimation}
      style={[
        a.flex_row,
        a.gap_xs,
        a.px_md,
        isFromSelf && a.justify_end,
      ]}>
      {/* Avatar */}
      {!isFromSelf && (
        <View style={[a.w_8, a.h_8, a.rounded_full, a.overflow_hidden]}>
          {message.senderAvatar ? (
            <img src={message.senderAvatar} alt={message.senderName || 'User'} />
          ) : (
            <View style={[a.w_full, a.h_full, t.atoms.bg_contrast_25]} />
          )}
        </View>
      )}

      {/* Message Content */}
      <View
        style={[
          a.flex_1,
          a.max_w_80,
          isFromSelf && a.items_end,
        ]}>
        {/* Date Divider */}
        {isNewDay && (
          <DateDivider date={new Date(message.timestamp)} />
        )}

        {/* Reply Preview */}
        {message.replyTo && (
          <View style={[
            a.mb_xs,
            a.px_md,
            a.py_sm,
            a.rounded_xl,
            a.border_l_4,
            t.atoms.bg_contrast_25,
            t.atoms.border_primary,
            a.max_w_60,
            isFromSelf && a.self_end,
          ]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.font_bold]}>
              {message.replyTo.senderName}
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_1]}>
              {message.replyTo.content.length > 50 
                ? message.replyTo.content.substring(0, 50) + '...'
                : message.replyTo.content
              }
            </Text>
          </View>
        )}

        {/* Message Bubble with Swipe */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            a.relative,
            {
              transform: [{translateX: swipeOffset}],
            },
          ]}>
          {/* Reply Indicator */}
          <Animated.View
            style={[
              a.absolute,
              a.left_0,
              a.top_0,
              a.bottom_0,
              a.w_20,
              a.items_center,
              a.justify_center,
              a.bg_primary_25,
              a.rounded_l_2xl,
              {
                opacity: swipeOffset.interpolate({
                  inputRange: [-80, 0],
                  outputRange: [1, 0],
                }),
              },
            ]}>
            <ReplyIcon
              size="sm"
              style={[t.atoms.text_primary]}
            />
            <Text style={[a.text_xs, t.atoms.text_primary, a.mt_1]}>
              <Trans>Reply</Trans>
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              a.rounded_2xl,
              a.px_md,
              a.py_sm,
              a.mb_xs,
              isFromSelf
                ? [t.atoms.bg_primary, a.self_end]
                : [t.atoms.bg_contrast_25, a.self_start],
              needsTail && [
                isFromSelf ? a.rounded_br_sm : a.rounded_bl_sm,
              ],
              !needsTail && [
                isFromSelf ? a.rounded_br_2xl : a.rounded_bl_2xl,
              ],
            ]}
            onPress={onPress}
            onLongPress={onBubbleLongPress}>
            {/* Encryption Status */}
            {message.isEncrypted && (
              <View style={[a.flex_row, a.items_center, a.gap_xs, a.mb_xs]}>
                {message.encryptionStatus === 'encrypted' ? (
                  <ShieldIcon
                    size="xs"
                    style={[t.atoms.text_positive]}
                  />
                ) : (
                  <WarningIcon
                    size="xs"
                    style={[
                      message.encryptionStatus === 'failed'
                        ? t.atoms.text_negative
                        : t.atoms.text_contrast_medium,
                    ]}
                  />
                )}
                <Text
                  style={[
                    a.text_xs,
                    message.encryptionStatus === 'encrypted'
                      ? t.atoms.text_positive
                      : message.encryptionStatus === 'failed'
                      ? t.atoms.text_negative
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {message.encryptionStatus === 'encrypted'
                    ? 'Encrypted'
                    : message.encryptionStatus === 'failed'
                    ? 'Decryption failed'
                    : 'Decrypting...'}
                </Text>
              </View>
            )}

            {/* Message Text */}
            <Text
              style={[
                a.text_sm,
                isFromSelf ? t.atoms.text_on_primary : t.atoms.text,
                isOnlyEmoji(message.content) && a.text_lg,
              ]}>
              {message.content}
            </Text>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <View style={[a.mt_sm, a.gap_sm]}>
                {message.attachments.map(attachment => (
                  attachment.type?.startsWith('audio/') ? (
                    <VoiceNoteBubble key={attachment.id} url={attachment.url} isOwn={isFromSelf} />
                  ) : (
                    <MessageItemEmbed
                      key={attachment.id}
                      attachment={attachment}
                    />
                  )
                ))}
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {showPicker && (
          <View style={[a.mt_xs, isFromSelf ? a.self_end : a.self_start]}>
            <ReactionPicker onPick={onPickReaction} />
          </View>
        )}

        {/* Message Metadata */}
        <MessageItemMetadata
          message={message}
          isFromSelf={isFromSelf}
          isLastInGroup={isLastInGroup}
        />

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={[a.mt_xs, a.flex_row, a.gap_xs, isFromSelf && a.self_end]}>
            {Object.entries(message.reactions.reduce((acc: Record<string, number>, r) => { acc[r.emoji] = (acc[r.emoji]||0)+1; return acc }, {}))
              .sort((a,b)=>b[1]-a[1])
              .map(([emoji,count]) => (
                <ReactionPill key={emoji} emoji={emoji} count={count} />
              ))}
          </View>
        )}
      </View>

      {/* Avatar for own messages */}
      {isFromSelf && (
        <View style={[a.w_8, a.h_8, a.rounded_full, a.overflow_hidden]}>
          {currentAccount?.avatar ? (
            <img src={currentAccount.avatar} alt="You" />
          ) : (
            <View style={[a.w_full, a.h_full, t.atoms.bg_primary]} />
          )}
        </View>
      )}
    </AnimatedView>
  )
}

function VoiceNoteBubble({url, isOwn}: {url: string; isOwn: boolean}) {
  const t = useTheme()
  const [audio] = React.useState(() => new Audio(url))
  const [playing, setPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const rafRef = React.useRef<number | null>(null)

  const tick = React.useCallback(() => {
    if (!audio.duration) return
    setProgress(audio.currentTime / audio.duration)
    rafRef.current = requestAnimationFrame(tick)
  }, [audio])

  React.useEffect(() => {
    const onPlay = () => {
      setPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    }
    const onPause = () => {
      setPlaying(false)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const onEnded = onPause
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [audio, tick])

  const toggle = React.useCallback(() => {
    if (playing) audio.pause()
    else audio.play().catch(() => {})
  }, [playing, audio])

  return (
    <View style={[a.flex_row, a.items_center, a.gap_sm, a.p_2, a.rounded_full, isOwn ? t.atoms.bg_primary_25 : t.atoms.bg_contrast_25]}>
      <Text style={[a.text_sm, t.atoms.text]} onPress={toggle}>
        {playing ? '⏸' : '▶'}
      </Text>
      <View style={[a.flex_1, a.h_2, t.atoms.bg_contrast_50, a.rounded_full]}>
        <View style={[a.h_full, a.rounded_full, t.atoms.bg_primary, {width: `${Math.round(progress * 100)}%`}]} />
      </View>
    </View>
  )
}

function ReactionPill({emoji, count}: {emoji: string; count: number}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.items_center, a.gap_1, a.px_2, a.py_1, a.rounded_full, t.atoms.bg_contrast_25]}>
      <Text style={[a.text_xs, t.atoms.text]}>{emoji}</Text>
      {count > 1 && (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>{count}</Text>
      )}
    </View>
  )
}

let MessageItemMetadata = ({
  message,
  isFromSelf,
  isLastInGroup,
  style,
}: {
  message: SonetMessage
  isFromSelf: boolean
  isLastInGroup: boolean
  style?: StyleProp<TextStyle>
}): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()

  if (!isLastInGroup) return null

  return (
    <View
      style={[
        a.flex_row,
        a.items_center,
        a.gap_xs,
        isFromSelf && a.justify_end,
        style,
      ]}>
      {/* Timestamp */}
      <TimeElapsed timestamp={message.timestamp} />
      
      {/* Delivery state (simplified) */}
      {message.status && (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {message.status}
        </Text>
      )}
      
      {/* Encryption Status */}
      {message.isEncrypted && (
        <ShieldIcon
          size="xs"
          style={[t.atoms.text_contrast_medium]}
        />
      )}
    </View>
  )
}

export {MessageItem as SonetMessageItem}
export type {SonetMessage, SonetMessageItemProps}