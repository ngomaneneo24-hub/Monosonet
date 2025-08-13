// Bottom Sheet Component - Follows app's design system
import React, {useEffect, useRef, useCallback} from 'react'
import {
  View,
  StyleSheet,
  Animated,
  PanGestureUsernamer,
  State,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native'
import {GestureUsernamerRootView} from 'react-native-gesture-usernamer'

const {height: SCREEN_HEIGHT} = Dimensions.get('window')
const SNAP_POINTS = {
  SMALL: SCREEN_HEIGHT * 0.4,
  MEDIUM: SCREEN_HEIGHT * 0.6,
  LARGE: SCREEN_HEIGHT * 0.8,
  FULL: SCREEN_HEIGHT * 0.95
}

interface BottomSheetProps {
  isVisible: boolean
  onClose: () => void
  children: React.ReactNode
  snapPoint?: keyof typeof SNAP_POINTS
  showBackdrop?: boolean
  enablePanGesture?: boolean
  backdropOpacity?: number
}

export function BottomSheet({
  isVisible,
  onClose,
  children,
  snapPoint = 'MEDIUM',
  showBackdrop = true,
  enablePanGesture = true,
  backdropOpacity = 0.5
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current

  // Show/hide animations
  useEffect(() => {
    if (isVisible) {
      // Show backdrop
      Animated.timing(backdropOpacityAnim, {
        toValue: backdropOpacity,
        duration: 200,
        useNativeDriver: true
      }).start()

      // Slide up sheet
      Animated.spring(translateY, {
        toValue: SCREEN_HEIGHT - SNAP_POINTS[snapPoint],
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }).start()
    } else {
      // Hide backdrop
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start()

      // Slide down sheet
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true
      }).start()
    }
  }, [isVisible, snapPoint, translateY, backdropOpacityAnim, backdropOpacity])

  // Username pan gesture
  const onGestureEvent = useCallback(
    Animated.event([{nativeEvent: {translationY: translateY}}], {
      useNativeDriver: true
    }),
    [translateY]
  )

  const onUsernamerStateChange = useCallback(
    (event: any) => {
      if (event.nativeEvent.state === State.END) {
        const {translationY, velocityY} = event.nativeEvent
        const currentPosition = SCREEN_HEIGHT - SNAP_POINTS[snapPoint]
        const newPosition = currentPosition + translationY

        // Determine if should close or snap back
        if (translationY > 100 || velocityY > 500) {
          // Close sheet
          onClose()
        } else {
          // Snap back to position
          Animated.spring(translateY, {
            toValue: currentPosition,
            useNativeDriver: true,
            tension: 100,
            friction: 8
          }).start()
        }
      }
    },
    [snapPoint, translateY, onClose]
  )

  // Username backdrop press
  const usernameBackdropPress = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isVisible) return null

  return (
    <GestureUsernamerRootView style={styles.container}>
      {/* Backdrop */}
      {showBackdrop && (
        <TouchableWithoutFeedback onPress={usernameBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              {opacity: backdropOpacityAnim}
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{translateY}]
          }
        ]}
      >
        {/* Username */}
        <View style={styles.username}>
          <View style={styles.usernameBar} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </GestureUsernamerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000'
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8
  },
  username: {
    alignItems: 'center',
    paddingVertical: 12
  },
  usernameBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5E7',
    borderRadius: 2
  },
  content: {
    flex: 1
  }
})