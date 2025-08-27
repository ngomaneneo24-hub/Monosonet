import React, {useCallback, useState, useRef, useEffect} from 'react'
import {View, TouchableOpacity, Alert, Dimensions, Modal} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import AnimatedView, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import {Image} from 'react-native-image-crop-picker'
import {Video} from 'react-native-video'
import {AudioRecorder, AudioUtils} from 'react-native-audio'
import {DocumentPicker} from 'react-native-document-picker'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Eye_Stroke2_Corner0_Rounded as EyeIcon} from '#/components/icons/Eye'
import {EyeOff_Stroke2_Corner0_Rounded as EyeOffIcon} from '#/components/icons/EyeOff'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {Warning_Stroke2_Corner0_Rounded as WarningIcon} from '#/components/icons/Warning'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {X_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Play_Stroke2_Corner0_Rounded as PlayIcon} from '#/components/icons/Play'
import {Pause_Stroke2_Corner0_Rounded as PauseIcon} from '#/components/icons/Pause'

// View-once message types
export type ViewOnceType = 'image' | 'video' | 'audio' | 'document' | 'voice-note'

// View-once message interface
interface ViewOnceMessage {
  id: string
  conversationId: string
  senderId: string
  recipientIds: string[]
  messageType: ViewOnceType
  encryptedContent: string
  encryptedMetadata: string
  expiresAt: Date
  maxViews: number
  currentViews: Record<string, number>
  isDeleted: boolean
  createdAt: Date
}

// View-once message props
interface SonetViewOnceMessageProps {
  message: ViewOnceMessage
  isOwnMessage: boolean
  onView: (messageId: string) => Promise<{
    content: Buffer
    metadata: Record<string, any>
    messageType: ViewOnceType
    isDeleted: boolean
  }>
  onDelete: (messageId: string) => Promise<void>
  onExpire: (messageId: string) => void
}

export function SonetViewOnceMessage({
  message,
  isOwnMessage,
  onView,
  onDelete,
  onExpire,
}: SonetViewOnceMessageProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [isViewed, setIsViewed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState<Buffer | null>(null)
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null)
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  
  const audioRef = useRef<any>(null)
  const progressInterval = useRef<NodeJS.Timeout>()
  const expiryTimer = useRef<NodeJS.Timeout>()
  
  // Animation values
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const rotation = useSharedValue(0)

  // Check if message is expired
  const isExpired = new Date() > message.expiresAt
  const hasBeenViewed = message.currentViews[message.senderId] > 0
  const canView = !isExpired && !hasBeenViewed && !message.isDeleted

  // Handle message expiry
  useEffect(() => {
    if (isExpired) {
      onExpire(message.id)
      return
    }

    const timeUntilExpiry = message.expiresAt.getTime() - Date.now()
    if (timeUntilExpiry > 0) {
      expiryTimer.current = setTimeout(() => {
        onExpire(message.id)
      }, timeUntilExpiry)
    }

    return () => {
      if (expiryTimer.current) {
        clearTimeout(expiryTimer.current)
      }
    }
  }, [message.expiresAt, message.id, isExpired, onExpire])

  // Handle audio progress tracking
  useEffect(() => {
    if (isPlaying && message.messageType === 'audio') {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          audioRef.current.getCurrentTime((seconds: number) => {
            setAudioProgress(seconds)
          })
        }
      }, 100)
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, message.messageType])

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value, { damping: 15, stiffness: 150 }) },
      { rotate: `${rotation.value}deg` }
    ],
    opacity: withTiming(opacity.value, { duration: 300 }),
  }))

  // Handle view-once message
  const handleView = useCallback(async () => {
    if (!canView || isLoading) return

    setIsLoading(true)
    try {
      // Show confirmation for view-once messages
      if (!isOwnMessage) {
        Alert.alert(
          _('View Once Message'),
          _('This message will be deleted after you view it. Are you sure you want to continue?'),
          [
            { text: _('Cancel'), style: 'cancel' },
            { 
              text: _('View'), 
              style: 'destructive',
              onPress: () => performView()
            }
          ]
        )
      } else {
        await performView()
      }
    } catch (error) {
      console.error('Failed to view message:', error)
      Alert.alert(_('Error'), _('Failed to view message. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [canView, isLoading, isOwnMessage, _])

  // Perform the actual view operation
  const performView = async () => {
    try {
      const result = await onView(message.id)
      
      setContent(result.content)
      setMetadata(result.metadata)
      setIsViewed(true)

      // Trigger deletion if this was the last view
      if (result.isDeleted) {
        await onDelete(message.id)
      }

      // Animate the view action
      scale.value = withSpring(1.1, { damping: 15, stiffness: 150 })
      rotation.value = withSpring(5, { damping: 15, stiffness: 150 })
      
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 })
        rotation.value = withSpring(0, { damping: 15, stiffness: 150 })
      }, 200)

    } catch (error) {
      console.error('Failed to perform view:', error)
      throw error
    }
  }

  // Handle full-screen toggle
  const handleFullScreen = useCallback(() => {
    setShowFullScreen(!showFullScreen)
  }, [showFullScreen])

  // Handle audio play/pause
  const handleAudioToggle = useCallback(() => {
    if (message.messageType === 'audio' && content) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play()
        setIsPlaying(true)
      }
    }
  }, [message.messageType, content, isPlaying])

  // Handle audio end
  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false)
    setAudioProgress(0)
  }, [])

  // Handle audio load
  const handleAudioLoad = useCallback((data: any) => {
    setAudioDuration(data.duration)
  }, [])

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Get message preview text
  const getMessagePreview = useCallback(() => {
    if (isViewed) {
      switch (message.messageType) {
        case 'image':
          return _('📷 Image viewed')
        case 'video':
          return _('🎥 Video viewed')
        case 'audio':
          return _('🎵 Audio viewed')
        case 'document':
          return _('📎 Document viewed')
        case 'voice-note':
          return _('🎤 Voice note viewed')
        default:
          return _('Message viewed')
      }
    }

    switch (message.messageType) {
      case 'image':
        return _('📷 Tap to view image')
      case 'video':
        return _('🎥 Tap to view video')
      case 'audio':
        return _('🎵 Tap to play audio')
      case 'document':
        return _('📎 Tap to open document')
      case 'voice-note':
        return _('🎤 Tap to play voice note')
      default:
        return _('Tap to view message')
    }
  }, [isViewed, message.messageType, _])

  // Get expiry time text
  const getExpiryText = useCallback(() => {
    if (isExpired) {
      return _('Expired')
    }

    const now = new Date()
    const timeLeft = message.expiresAt.getTime() - now.getTime()
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

    if (hoursLeft > 0) {
      return _('Expires in {{hours}}h {{minutes}}m', { hours: hoursLeft, minutes: minutesLeft })
    } else if (minutesLeft > 0) {
      return _('Expires in {{minutes}}m', { minutes: minutesLeft })
    } else {
      return _('Expires soon')
    }
  }, [message.expiresAt, isExpired, _])

  // Render content based on type
  const renderContent = useCallback(() => {
    if (!content || !metadata) return null

    switch (message.messageType) {
      case 'image':
        return (
          <TouchableOpacity onPress={handleFullScreen} style={[a.flex_1]}>
            <Image
              source={{ uri: `data:${metadata.mimeType};base64,${content.toString('base64')}` }}
              style={[
                a.w_full,
                a.h_48,
                a.rounded_2xl,
                a.border,
                t.atoms.border_contrast_25,
              ]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )

      case 'video':
        return (
          <TouchableOpacity onPress={handleFullScreen} style={[a.flex_1]}>
            <Video
              source={{ uri: `data:${metadata.mimeType};base64,${content.toString('base64')}` }}
              style={[
                a.w_full,
                a.h_48,
                a.rounded_2xl,
                a.border,
                t.atoms.border_contrast_25,
              ]}
              resizeMode="cover"
              paused={true}
              repeat={false}
            />
            <View style={[
              a.absolute,
              a.inset_0,
              a.items_center,
              a.justify_center,
              a.bg_black_50,
            ]}>
              <PlayIcon size="lg" style={[t.atoms.text_on_primary]} />
            </View>
          </TouchableOpacity>
        )

      case 'audio':
      case 'voice-note':
        return (
          <View style={[
            a.flex_row,
            a.items_center,
            a.gap_sm,
            a.p_md,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
            <TouchableOpacity onPress={handleAudioToggle}>
              {isPlaying ? (
                <PauseIcon size="lg" style={[t.atoms.text_primary]} />
              ) : (
                <PlayIcon size="lg" style={[t.atoms.text_primary]} />
              )}
            </TouchableOpacity>
            
            <View style={[a.flex_1]}>
              <View style={[a.flex_row, a.items_center, a.justify_between, a.mb_xs]}>
                <Text style={[a.text_sm, t.atoms.text]}>
                  {formatTime(audioProgress)}
                </Text>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {formatTime(audioDuration)}
                </Text>
              </View>
              
              <View style={[
                a.h_1,
                a.bg_contrast_25,
                a.rounded_full,
                a.overflow_hidden,
              ]}>
                <View style={[
                  a.h_full,
                  t.atoms.bg_primary,
                  {
                    width: `${(audioProgress / audioDuration) * 100}%`,
                  },
                ]} />
              </View>
            </View>
          </View>
        )

      case 'document':
        return (
          <TouchableOpacity style={[
            a.flex_row,
            a.items_center,
            a.gap_sm,
            a.p_md,
            a.rounded_2xl,
            a.border,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_25,
          ]}>
            <View style={[
              a.w_12,
              a.h_12,
              a.rounded_xl,
              t.atoms.bg_primary_25,
              a.items_center,
              a.justify_center,
            ]}>
              <Text style={[a.text_lg, t.atoms.text_primary]}>
                📄
              </Text>
            </View>
            
            <View style={[a.flex_1]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                {metadata.filename || _('Document')}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {metadata.size ? `${(metadata.size / 1024).toFixed(1)} KB` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )

      default:
        return null
    }
  }, [content, metadata, message.messageType, isPlaying, audioProgress, audioDuration, t, _, handleFullScreen, handleAudioToggle, formatTime])

  // Render full-screen modal
  const renderFullScreenModal = useCallback(() => {
    if (!showFullScreen || !content || !metadata) return null

    return (
      <Modal
        visible={showFullScreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFullScreen(false)}>
        
        <View style={[a.flex_1, t.atoms.bg_black]}>
          {/* Header */}
          <View style={[
            a.flex_row,
            a.items_center,
            a.justify_between,
            a.px_md,
            a.py_sm,
            a.bg_black_50,
          ]}>
            <Text style={[a.text_sm, t.atoms.text_on_primary]}>
              {message.messageType === 'image' ? _('Image') : _('Video')}
            </Text>
            
            <TouchableOpacity onPress={() => setShowFullScreen(false)}>
              <CloseIcon size="lg" style={[t.atoms.text_on_primary]} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={[a.flex_1, a.items_center, a.justify_center]}>
            {message.messageType === 'image' ? (
              <Image
                source={{ uri: `data:${metadata.mimeType};base64,${content.toString('base64')}` }}
                style={[a.w_full, a.h_full]}
                resizeMode="contain"
              />
            ) : (
              <Video
                source={{ uri: `data:${metadata.mimeType};base64,${content.toString('base64')}` }}
                style={[a.w_full, a.h_full]}
                resizeMode="contain"
                controls={true}
                repeat={false}
              />
            )}
          </View>
        </View>
      </Modal>
    )
  }, [showFullScreen, content, metadata, message.messageType, t, _])

  // Render view-once message
  return (
    <AnimatedView style={[animatedStyle]}>
      {/* View-once message container */}
      <View style={[
        a.p_md,
        a.rounded_2xl,
        a.border,
        a.max_w_80,
        isOwnMessage 
          ? [t.atoms.bg_primary_25, t.atoms.border_primary]
          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_25],
      ]}>
        
        {/* Message header */}
        <View style={[a.flex_row, a.items_center, a.gap_sm, a.mb_sm]}>
          <ShieldIcon size="sm" style={[t.atoms.text_primary]} />
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_primary]}>
            <Trans>View Once</Trans>
          </Text>
          
          <View style={[a.flex_row, a.items_center, a.gap_xs]}>
            <ClockIcon size="xs" style={[t.atoms.text_contrast_medium]} />
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {getExpiryText()}
            </Text>
          </View>
        </View>

        {/* Message content */}
        {isViewed ? (
          renderContent()
        ) : (
          <TouchableOpacity
            onPress={handleView}
            disabled={!canView || isLoading}
            style={[
              a.flex_row,
              a.items_center,
              a.gap_sm,
              a.p_md,
              a.rounded_2xl,
              a.border,
              a.border_dashed,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_medium,
            ]}>
            
            <EyeIcon size="lg" style={[t.atoms.text_contrast_medium]} />
            
            <View style={[a.flex_1]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                {getMessagePreview()}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {_('This message will be deleted after viewing')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Message footer */}
        <View style={[a.flex_row, a.items_center, a.justify_between, a.mt_sm]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {isViewed ? _('Viewed') : _('Not viewed')}
          </Text>
          
          {message.maxViews > 1 && (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {Object.values(message.currentViews).reduce((sum, count) => sum + count, 0)}/{message.maxViews} views
            </Text>
          )}
        </View>

        {/* Warning for expired messages */}
        {isExpired && (
          <View style={[
            a.flex_row,
            a.items_center,
            a.gap_xs,
            a.mt_sm,
            a.px_sm,
            a.py_xs,
            a.rounded_xl,
            t.atoms.bg_warning_25,
          ]}>
            <WarningIcon size="xs" style={[t.atoms.text_warning]} />
            <Text style={[a.text_xs, t.atoms.text_warning]}>
              <Trans>This message has expired and cannot be viewed</Trans>
            </Text>
          </View>
        )}
      </View>

      {/* Full-screen modal */}
      {renderFullScreenModal()}

      {/* Hidden audio player for audio messages */}
      {message.messageType === 'audio' && content && (
        <Video
          ref={audioRef}
          source={{ uri: `data:${metadata?.mimeType};base64,${content.toString('base64')}` }}
          style={[a.hidden]}
          onEnd={handleAudioEnd}
          onLoad={handleAudioLoad}
          onError={(error) => console.error('Audio error:', error)}
        />
      )}
    </AnimatedView>
  )
}