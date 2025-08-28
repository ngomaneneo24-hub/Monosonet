import React, {useCallback, useState} from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Heart2_Stroke2_Corner0_Rounded, Heart2_Filled_Stroke2_Corner0_Rounded} from '#/components/icons/Heart2'
import {Bubble_Stroke2_Corner2_Rounded} from '#/components/icons/Bubble'
import {Renote_Stroke2_Corner0_Rounded, Renote_Stroke2_Corner2_Rounded} from '#/components/icons/Renote'
import {PaperPlane_Stroke2_Corner0_Rounded} from '#/components/icons/PaperPlane'

interface EnhancedActionButtonsProps {
  isLiked: boolean
  isRenoted: boolean
  onLike?: () => void
  onReply?: () => void
  onRepost?: () => void
  onShare?: () => void
}

export function EnhancedActionButtons({
  isLiked,
  isRenoted,
  onLike,
  onReply,
  onRepost,
  onShare,
}: EnhancedActionButtonsProps) {
  const t = useTheme()
  const {_} = useLingui()
  
  const [likeScale] = useState(new Animated.Value(1))
  const [replyScale] = useState(new Animated.Value(1))
  const [repostScale] = useState(new Animated.Value(1))
  const [shareScale] = useState(new Animated.Value(1))

  const animatePress = useCallback((scaleValue: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.()
    })
  }, [])

  const handleLike = useCallback(() => {
    animatePress(likeScale, onLike)
  }, [animatePress, likeScale, onLike])

  const handleReply = useCallback(() => {
    animatePress(replyScale, onReply)
  }, [animatePress, replyScale, onReply])

  const handleRepost = useCallback(() => {
    animatePress(repostScale, onRepost)
  }, [animatePress, repostScale, onRepost])

  const handleShare = useCallback(() => {
    animatePress(shareScale, onShare)
  }, [animatePress, shareScale, onShare])

  const renderActionButton = useCallback((
    icon: React.ReactNode,
    isActive: boolean,
    onPress: () => void,
    scaleValue: Animated.Value,
    accessibilityLabel: string
  ) => {
    return (
      <Animated.View style={{transform: [{scale: scaleValue}]}}>
        <Pressable
          style={[
            styles.actionButton,
            isActive && styles.actionButtonActive
          ]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{selected: isActive}}
        >
          {icon}
        </Pressable>
      </Animated.View>
    )
  }, [])

  return (
    <View style={styles.container}>
      {/* Like Button */}
      {renderActionButton(
        isLiked ? (
          <Heart2_Filled_Stroke2_Corner0_Rounded
            width={20}
            height={20}
            style={[styles.actionButtonIcon, {color: '#ec4899'}]}
          />
        ) : (
          <Heart2_Stroke2_Corner0_Rounded
            width={20}
            height={20}
            style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
          />
        ),
        isLiked,
        handleLike,
        likeScale,
        isLiked ? 'Unlike post' : 'Like post'
      )}

      {/* Reply Button */}
      {renderActionButton(
        <Bubble_Stroke2_Corner2_Rounded
          width={20}
          height={20}
          style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
        />,
        false,
        handleReply,
        replyScale,
        'Reply to post'
      )}

      {/* Repost Button */}
      {renderActionButton(
        isRenoted ? (
          <Renote_Stroke2_Corner2_Rounded
            width={20}
            height={20}
            style={[styles.actionButtonIcon, {color: '#10b981'}]}
          />
        ) : (
          <Renote_Stroke2_Corner0_Rounded
            width={20}
            height={20}
            style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
          />
        ),
        isRenoted,
        handleRepost,
        repostScale,
        isRenoted ? 'Remove repost' : 'Repost'
      )}

      {/* Share Button */}
      {renderActionButton(
        <PaperPlane_Stroke2_Corner0_Rounded
          width={20}
          height={20}
          style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
        />,
        false,
        handleShare,
        shareScale,
        'Share post'
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    // Enhanced touch feedback
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  actionButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButtonIcon: {
    // Icon styling
    transition: 'all 0.2s ease',
  },
})