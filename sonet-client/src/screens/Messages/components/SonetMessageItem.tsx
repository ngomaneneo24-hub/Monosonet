import React, {useCallback, useMemo} from 'react'
import {View, TouchableOpacity} from 'react-native'
import { Audio } from 'expo-av'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import type {SonetMessage} from '#/services/sonetMessagingApi'
import {useE2EEncryption} from '#/services/sonetE2E'
import {useUnifiedSession} from '#/state/session/hybrid'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Text} from '#/components/Typography'
import Slider from '@miblanchard/react-native-slider'

interface SonetMessageItemProps {
  message: SonetMessage
  isOwnMessage: boolean
  showAvatar?: boolean
  onRetry?: () => void
}

export function SonetMessageItem({
  message,
  isOwnMessage,
  showAvatar = true,
  onRetry,
}: SonetMessageItemProps) {
  const {_} = useLingui()
  const t = useTheme()
  const {e2e, isInitialized: e2eInitialized} = useE2EEncryption()
  const {state: sessionState} = useUnifiedSession()

  const [decryptedContent, setDecryptedContent] = React.useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = React.useState(false)
  const [decryptError, setDecryptError] = React.useState<string | null>(null)

  // Decrypt message if it's encrypted
  React.useEffect(() => {
    if (message.encryption === 'e2e' && e2eInitialized && message.encrypted_content) {
      setIsDecrypting(true)
      setDecryptError(null)
      
      // For now, we'll show the encrypted content
      // In a real implementation, you'd decrypt it using the E2E service
      setDecryptedContent(message.encrypted_content)
      setIsDecrypting(false)
    } else {
      setDecryptedContent(message.content)
    }
  }, [message, e2eInitialized])

  const messageContent = useMemo(() => {
    if (isDecrypting) {
      return _(msg`Decrypting...`)
    }
    if (decryptError) {
      return _(msg`Failed to decrypt message`)
    }
    return decryptedContent || message.content
  }, [decryptedContent, isDecrypting, decryptError, message.content, _])

  const messageStatus = useMemo(() => {
    switch (message.status) {
      case 'sent':
        return {icon: '✓', color: t.atoms.text_contrast_medium}
      case 'delivered':
        return {icon: '✓✓', color: t.atoms.text_contrast_medium}
      case 'read':
        return {icon: '✓✓', color: t.atoms.text_positive}
      case 'failed':
        return {icon: '⚠', color: t.atoms.text_negative}
      default:
        return {icon: '', color: t.atoms.text_contrast_medium}
    }
  }, [message.status, t])
  const [showMetaTime, setShowMetaTime] = React.useState(false)

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry()
    }
  }, [onRetry])

  const [sound, setSound] = React.useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [positionMs, setPositionMs] = React.useState(0)
  const [durationMs, setDurationMs] = React.useState(0)

  const audioAttachment = React.useMemo(() => message.attachments?.find(a => a.mimeType?.startsWith('audio/')), [message.attachments])

  React.useEffect(() => {
    let isMounted = true
    let subscription: any
    ;(async () => {
      if (audioAttachment) {
        const { sound } = await Audio.Sound.createAsync({ uri: audioAttachment.url }, { shouldPlay: false })
        if (!isMounted) return
        setSound(sound)
        subscription = sound.setOnPlaybackStatusUpdate((status: any) => {
          if (!status.isLoaded) return
          setIsPlaying(status.isPlaying)
          setPositionMs(status.positionMillis || 0)
          setDurationMs(status.durationMillis || 0)
        })
      }
    })()
    return () => {
      isMounted = false
      if (subscription && subscription.remove) subscription.remove()
      if (sound) {
        sound.unloadAsync().catch(() => {})
      }
    }
  }, [audioAttachment])

  const togglePlay = useCallback(async () => {
    if (!sound) return
    const status: any = await sound.getStatusAsync()
    if (!status.isLoaded) return
    if (status.isPlaying) {
      await sound.pauseAsync()
    } else {
      await sound.playAsync()
    }
  }, [sound])

  const [rate, setRate] = React.useState(1)
  const cycleRate = useCallback(async () => {
    if (!sound) return
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
    setRate(next)
    await sound.setRateAsync(next, true)
  }, [sound, rate])

  const onScrub = useCallback(async (pct: number) => {
    if (!sound || !durationMs) return
    const pos = Math.max(0, Math.min(durationMs, Math.round((pct / 100) * durationMs)))
    await sound.setPositionAsync(pos)
  }, [sound, durationMs])
 
  return (
    <View
      style={[
        a.flex_row,
        a.gap_sm,
        a.p_2,
        isOwnMessage ? a.justify_end : a.justify_start,
      ]}>
      {!isOwnMessage && showAvatar && (
        <PreviewableUserAvatar
          size="sm"
          profile={{
            userId: message.sender_id,
            username: message.sender_id, // Placeholder
            displayName: message.sender_id, // Placeholder
            avatar: undefined,
          }}
        />
      )}
      
      <View
        style={[
          a.max_w_80,
          a.rounded_md,
          a.p_3,
          isOwnMessage
            ? [t.atoms.bg_primary, t.atoms.text_inverted]
            : [t.atoms.bg_contrast_25, t.atoms.text],
        ]}>
        {/* E2E Encryption Indicator */}
        {message.encryption === 'e2e' && (
          <View style={[a.flex_row, a.items_center, a.gap_xs, a.mb_1]}>
            <ShieldIcon size="xs" fill={t.atoms.text_contrast_medium.color} />
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>End-to-end encrypted</Trans>
            </Text>
          </View>
        )}

        {/* Message Content or Audio */}
        {audioAttachment ? (
          <View style={[a.gap_sm]}>
            <View style={[a.flex_row, a.items_center, a.gap_sm]}>
              <Button size="small" onPress={togglePlay} variant="solid" color="secondary">
                <ButtonText>{isPlaying ? _(msg`Pause`) : _(msg`Play`)}</ButtonText>
              </Button>
              <Button size="small" onPress={cycleRate} variant="outline" color="secondary">
                <ButtonText>{rate}x</ButtonText>
              </Button>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {Math.floor(positionMs / 1000)} / {Math.max(1, Math.floor((durationMs || 1) / 1000))}s
              </Text>
            </View>
            <View style={[a.w_full, a.h_1, a.rounded_full, t.atoms.bg_contrast_200]}>
              <View style={[{ width: `${durationMs ? Math.min(100, Math.round((positionMs / durationMs) * 100)) : 0}%`, height: 4 }, a.rounded_full, t.atoms.bg_primary]} />
            </View>
            <Slider
              value={durationMs ? (positionMs / durationMs) * 100 : 0}
              minimumValue={0}
              maximumValue={100}
              step={0.5}
              onSlidingComplete={(vals: number | number[]) => {
                const pct = Array.isArray(vals) ? vals[0] : vals
                onScrub(pct)
              }}
              containerStyle={[{paddingHorizontal: 4}]}
            />
          </View>
        ) : (
          <Text style={[a.text_md, a.leading_normal]}>
            {messageContent}
          </Text>
        )}

        {/* Message Metadata */}
        <View style={[a.flex_row, a.items_center, a.justify_between, a.mt_2, a.gap_sm]}>
          <TimeElapsed timestamp={message.created_at} />
          
          {!!messageStatus.icon && (
            <TouchableOpacity onPress={() => setShowMetaTime(v => !v)}>
              <Text style={[a.text_xs, {color: messageStatus.color.color}]}> {messageStatus.icon} </Text>
            </TouchableOpacity>
          )}

          {/* Edited Indicator */}
          {message.is_edited && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>edited</Trans>
            </Text>
          )}
        </View>

        {/* Error State */}
        {message.status === 'failed' && onRetry && (
          <Button
            size="small"
            variant="ghost"
            color="negative"
            onPress={handleRetry}
            style={[a.mt_2]}>
            <ButtonText>
              <Trans>Retry</Trans>
            </ButtonText>
          </Button>
        )}
        {showMetaTime && (
          <View style={[a.mt_1]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>Sent: {new Date(message.timestamp).toLocaleString()}</Text>
          </View>
        )}
      </View>

      {isOwnMessage && showAvatar && (
        <PreviewableUserAvatar
          size="sm"
          profile={{
            userId: sessionState.currentAccount?.userId || '',
            username: sessionState.currentAccount?.username || '',
            displayName: sessionState.currentAccount?.displayName || '',
            avatar: undefined,
          }}
        />
      )}
    </View>
  )
}

// Typing indicator component
export function SonetTypingIndicator({isTyping}: {isTyping: boolean}) {
  const t = useTheme()
  
  if (!isTyping) return null

  return (
    <View style={[a.flex_row, a.gap_sm, a.p_2, a.justify_start]}>
      <View
        style={[
          a.rounded_md,
          a.p_3,
          t.atoms.bg_contrast_25,
          {minWidth: 60},
        ]}>
        <View style={[a.flex_row, a.gap_1]}>
          <View
            style={[
              a.w_2,
              a.h_2,
              a.rounded_full,
              t.atoms.bg_contrast_medium,
              {animation: 'typing 1.4s infinite ease-in-out'},
            ]}
          />
          <View
            style={[
              a.w_2,
              a.h_2,
              a.rounded_full,
              t.atoms.bg_contrast_medium,
              {animation: 'typing 1.4s infinite ease-in-out 0.2s'},
            ]}
          />
          <View
            style={[
              a.w_2,
              a.h_2,
              a.rounded_full,
              t.atoms.bg_contrast_medium,
              {animation: 'typing 1.4s infinite ease-in-out 0.4s'},
            ]}
          />
        </View>
      </View>
    </View>
  )
}

// System message component
export function SonetSystemMessage({content}: {content: string}) {
  const t = useTheme()
  
  return (
    <View style={[a.flex_row, a.justify_center, a.p_2]}>
      <View
        style={[
          a.rounded_md,
          a.px_3,
          a.py_1,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
          {content}
        </Text>
      </View>
    </View>
  )
}