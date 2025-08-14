import React, {useRef, useCallback} from 'react'
import {View, StyleSheet} from 'react-native'
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated'

interface PinchGestureHandlerProps {
  children: React.ReactNode
  onPinchStart?: () => void
  onPinchEnd?: () => void
  onPinchCombine?: () => void
  onPinchSeparate?: () => void
  threshold?: {
    combine: number
    separate: number
  }
  style?: any
}

export function PinchGestureHandler({
  children,
  onPinchStart,
  onPinchEnd,
  onPinchCombine,
  onPinchSeparate,
  threshold = {combine: 0.8, separate: 1.2},
  style,
}: PinchGestureHandlerProps) {
  // Animation values
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const rotation = useSharedValue(0)
  
  // State tracking
  const isCombined = useRef(false)
  const hasTriggeredAction = useRef(false)
  
  // Handle pinch gesture
  const handlePinchGesture = useCallback((gestureState: string, scaleValue: number) => {
    if (gestureState === 'active') {
      // Update scale with spring animation
      scale.value = withSpring(scaleValue, {
        damping: 15,
        stiffness: 150,
      })
      
      // Add subtle rotation for visual feedback
      rotation.value = withSpring((scaleValue - 1) * 5, {
        damping: 20,
        stiffness: 200,
      })
      
      // Check for combine action
      if (scaleValue < threshold.combine && !isCombined.current && !hasTriggeredAction.current) {
        isCombined.current = true
        hasTriggeredAction.current = true
        
        // Visual feedback for combine mode
        opacity.value = withTiming(0.7, {duration: 300})
        
        // Trigger combine callback
        onPinchCombine?.()
        
        // Haptic feedback (if available)
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      
      // Check for separate action
      if (scaleValue > threshold.separate && isCombined.current && !hasTriggeredAction.current) {
        isCombined.current = false
        hasTriggeredAction.current = true
        
        // Visual feedback for separate mode
        opacity.value = withTiming(1, {duration: 300})
        
        // Trigger separate callback
        onPinchSeparate?.()
        
        // Haptic feedback (if available)
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    } else if (gestureState === 'end') {
      // Reset all animations with spring
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      })
      
      rotation.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
      })
      
      // Reset state
      hasTriggeredAction.current = false
      
      // Trigger end callback
      onPinchEnd?.()
    }
  }, [threshold, onPinchCombine, onPinchSeparate, onPinchEnd, scale, rotation, opacity])
  
  // Create pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      onPinchStart?.()
    })
    .onUpdate((event) => {
      runOnJS(handlePinchGesture)('active', event.scale)
    })
    .onEnd(() => {
      runOnJS(handlePinchGesture)('end', 1)
    })
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: scale.value},
      {rotate: `${rotation.value}deg`},
    ],
    opacity: opacity.value,
  }))
  
  // Combined mode indicator style
  const combinedIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scale.value,
      [threshold.combine, 1],
      [1, 0],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          scale.value,
          [threshold.combine, 1],
          [1.2, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }))
  
  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
          
          {/* Combine mode indicator */}
          <Animated.View style={[styles.combineIndicator, combinedIndicatorStyle]}>
            <View style={styles.combineIndicatorContent}>
              <View style={styles.combineIcon}>
                <View style={styles.combineDot} />
                <View style={styles.combineDot} />
                <View style={styles.combineDot} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  combineIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -25}, {translateY: -25}],
    width: 50,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  combineIndicatorContent: {
    alignItems: 'center',
  },
  combineIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  combineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
})