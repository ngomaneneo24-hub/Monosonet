import React from 'react'
import {View} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface SonetTypingIndicatorProps {
  isTyping: boolean
  username?: string
}

export function SonetTypingIndicator({isTyping, username}: SonetTypingIndicatorProps) {
  const t = useTheme()
  
  if (!isTyping) return null

  const dot1Opacity = useSharedValue(0.3)
  const dot2Opacity = useSharedValue(0.3)
  const dot3Opacity = useSharedValue(0.3)

  React.useEffect(() => {
    if (isTyping) {
      // Animate dots in sequence
      dot1Opacity.value = withRepeat(
        withTiming(1, {duration: 600, easing: Easing.ease}),
        -1,
        true
      )
      
      setTimeout(() => {
        dot2Opacity.value = withRepeat(
          withTiming(1, {duration: 600, easing: Easing.ease}),
          -1,
          true
        )
      }, 200)
      
      setTimeout(() => {
        dot3Opacity.value = withRepeat(
          withTiming(1, {duration: 600, easing: Easing.ease}),
          -1,
          true
        )
      }, 400)
    }
  }, [isTyping, dot1Opacity, dot2Opacity, dot3Opacity])

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }))
  
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }))
  
  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }))

  return (
    <View style={[a.flex_row, a.gap_xs, a.px_md, a.py_sm]}>
      {/* Avatar placeholder */}
      <View style={[a.w_8, a.h_8, a.rounded_full, t.atoms.bg_contrast_25]} />
      
      {/* Typing indicator */}
      <View style={[a.flex_1, a.max_w_20]}>
        <View
          style={[
            a.rounded_2xl,
            a.px_md,
            a.py_sm,
            t.atoms.bg_contrast_25,
            a.self_start,
            a.rounded_bl_2xl,
          ]}>
          {/* Username */}
          {username && (
            <Text
              style={[
                a.text_xs,
                t.atoms.text_contrast_medium,
                a.mb_xs,
              ]}>
              {username} is typing...
            </Text>
          )}
          
          {/* Animated dots */}
          <View style={[a.flex_row, a.gap_xs, a.items_center]}>
            <Animated.View
              style={[
                a.w_2,
                a.h_2,
                a.rounded_full,
                t.atoms.bg_contrast_medium,
                dot1Style,
              ]}
            />
            <Animated.View
              style={[
                a.w_2,
                a.h_2,
                a.rounded_full,
                t.atoms.bg_contrast_medium,
                dot2Style,
              ]}
            />
            <Animated.View
              style={[
                a.w_2,
                a.h_2,
                a.rounded_full,
                t.atoms.bg_contrast_medium,
                dot3Style,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  )
}