import {useState, useRef, useCallback, useEffect} from 'react'
import {AppState, AppStateStatus} from 'react-native'
import {AVPlaybackStatus} from 'expo-av'

interface VideoPlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  hasError: boolean
  errorMessage: string
}

interface UseVideoPlaybackProps {
  videoId: string
  autoPlay?: boolean
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
  onViewTrack?: () => void
}

export const useVideoPlayback = ({
  videoId,
  autoPlay = false,
  onPlaybackStatusUpdate,
  onViewTrack
}: UseVideoPlaybackProps) => {
  const [playbackState, setPlaybackState] = useState<VideoPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: true,
    hasError: false,
    errorMessage: ''
  })

  const [isVisible, setIsVisible] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [viewTracked, setViewTracked] = useState(false)
  
  const appStateRef = useRef(AppState.currentState)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Username app state changes
  useEffect(() => {
    const usernameAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (isVisible && isActive) {
          // Resume playback if video was playing
          setIsActive(true)
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        if (isVisible && isActive) {
          // Pause playback when app goes to background
          setIsActive(false)
        }
      }
      appStateRef.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', usernameAppStateChange)
    return () => subscription?.remove()
  }, [isVisible, isActive])

  // Username playback status updates
  const usernamePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: status.isLoaded ? status.isPlaying : false,
      currentTime: status.isLoaded ? status.positionMillis || 0 : 0,
      duration: status.isLoaded ? status.durationMillis || 0 : 0,
      isLoading: !status.isLoaded,
      hasError: status.error ? true : false,
      errorMessage: status.error ? status.error.message : ''
    }))

    // Track view when video starts playing
    if (status.isLoaded && status.isPlaying && !viewTracked) {
      setViewTracked(true)
      onViewTrack?.()
    }

    // Call external callback
    onPlaybackStatusUpdate?.(status)
  }, [onPlaybackStatusUpdate, onViewTrack, viewTracked])

  // Set video visibility
  const setVideoVisible = useCallback((visible: boolean) => {
    setIsVisible(visible)
    if (!visible) {
      setIsActive(false)
      setViewTracked(false)
    }
  }, [])

  // Set video active state
  const setVideoActive = useCallback((active: boolean) => {
    setIsActive(active)
  }, [])

  // Reset playback state
  const resetPlayback = useCallback(() => {
    setPlaybackState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      hasError: false,
      errorMessage: ''
    })
    setViewTracked(false)
  }, [])

  // Username video error
  const usernameVideoError = useCallback((error: string) => {
    setPlaybackState(prev => ({
      ...prev,
      hasError: true,
      errorMessage: error,
      isLoading: false
    }))
  }, [])

  // Start progress tracking
  const startProgressTracking = useCallback(() => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
    }

    playbackTimerRef.current = setInterval(() => {
      if (playbackState.isPlaying && playbackState.duration > 0) {
        // Update progress every 100ms for smooth progress bar
        setPlaybackState(prev => ({
          ...prev,
          currentTime: Math.min(prev.currentTime + 100, prev.duration)
        }))
      }
    }, 100)
  }, [playbackState.isPlaying, playbackState.duration])

  // Stop progress tracking
  const stopProgressTracking = useCallback(() => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
  }, [])

  // Start/stop progress tracking based on playback state
  useEffect(() => {
    if (playbackState.isPlaying) {
      startProgressTracking()
    } else {
      stopProgressTracking()
    }

    return () => {
      stopProgressTracking()
    }
  }, [playbackState.isPlaying, startProgressTracking, stopProgressTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking()
    }
  }, [stopProgressTracking])

  // Auto-play when video becomes active
  useEffect(() => {
    if (autoPlay && isVisible && isActive && !playbackState.isPlaying) {
      // Auto-play logic would be implemented in the VideoPlayer component
    }
  }, [autoPlay, isVisible, isActive, playbackState.isPlaying])

  return {
    playbackState,
    isVisible,
    isActive,
    setVideoVisible,
    setVideoActive,
    resetPlayback,
    usernamePlaybackStatusUpdate,
    usernameVideoError
  }
}