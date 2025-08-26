import React, {useCallback, useMemo} from 'react'
import {
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native'
import Animated, {
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
import {DateDivider} from './DateDivider'
import {MessageItemEmbed} from './MessageItemEmbed'
import {localDateString} from './util'

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
}

interface SonetMessageItemProps {
  message: SonetMessage
  isOwnMessage: boolean
  nextMessage?: SonetMessage
  prevMessage?: SonetMessage
}

let MessageItem = ({
  message,
  isOwnMessage,
  nextMessage,
  prevMessage,
}: SonetMessageItemProps): React.ReactNode => {
  const t = useTheme()
  const {currentAccount} = useSession()
  const {_} = useLingui()

  const isFromSelf = isOwnMessage

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

  const onLongPress = useCallback(
    (e: GestureResponderEvent) => {
      if (isNative) {
        ActionsWrapper.show({
          message,
          isOwnMessage,
          onPress: () => {
            // Username message actions
          },
        })
      }
    },
    [message, isOwnMessage],
  )

  const onPress = useCallback(() => {
    // Username message press
  }, [])

  const layoutAnimation: LayoutAnimationConfig = {
    ...LinearTransition.springify().mass(0.3),
  }

  return (
    <Animated.View
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

        {/* Message Bubble */}
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
          onLongPress={onLongPress}>
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

        {/* Message Metadata */}
        <MessageItemMetadata
          message={message}
          isFromSelf={isFromSelf}
          isLastInGroup={isLastInGroup}
        />
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
    </Animated.View>
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