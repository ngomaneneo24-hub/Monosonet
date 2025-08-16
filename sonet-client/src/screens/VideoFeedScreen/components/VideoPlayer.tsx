import React, {useState, useRef, useEffect, useCallback} from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  PanGestureHandler,
  State
} from 'react-native'
import {Video, ResizeMode, AVPlaybackStatus} from 'expo-av'
import {LinearGradient} from 'expo-linear-gradient'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {EyeIcon} from '../../../assets/icons/view-svgrepo-com.svg'
import {VideoItem} from '../../../lib/api/video-feed'

const {width: screenWidth, height: screenHeight} = Dimensions.get('window')

interface VideoPlayerProps {
  video: VideoItem
  isVisible: boolean
  isActive: boolean
  onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void
  onViewTrack: () => void
  onLike: () => void
  onRenote: () => void
  onShare: () => void
  onClose: () => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isVisible,
  isActive,
  onPlaybackStatusUpdate,
  onViewTrack,
  onLike,
  onRenote,
  onShare,
  onClose
}) => {
  const insets = useSafeAreaInsets()
  const videoRef = useRef<Video>(null)
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isRenoteed, setIsRenoteed] = useState(false)
  const [viewTracked, setViewTracked] = useState(false)
  
  // Animation values
  const controlsOpacity = useRef(new Animated.Value(1)).current
  const progressBarWidth = useRef(new Animated.Value(0)).current

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && showControls) {
      const timer = setTimeout(() => {
        hideControls()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isPlaying, showControls])

  // Username playback status updates
  const usernamePlaybackStatusUpdate = useCallback((playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus)
    onPlaybackStatusUpdate(playbackStatus)

    if (playbackStatus.isLoaded) {
      setIsLoading(false)
      setIsPlaying(playbackStatus.isPlaying)
      setCurrentTime(playbackStatus.positionMillis || 0)
      setDuration(playbackStatus.durationMillis || 0)

      // Track view when video starts playing
      if (playbackStatus.isPlaying && !viewTracked) {
        setViewTracked(true)
        onViewTrack()
      }

      // Update progress bar
      if (playbackStatus.durationMillis) {
        const progress = (playbackStatus.positionMillis || 0) / playbackStatus.durationMillis
        Animated.timing(progressBarWidth, {
          toValue: progress,
          duration: 100,
          useNativeDriver: false
        }).start()
      }
    }
  }, [onPlaybackStatusUpdate, onViewTrack, viewTracked, progressBarWidth])

  // Play/pause video
  const togglePlayPause = useCallback(async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync()
      } else {
        await videoRef.current.playAsync()
      }
    }
  }, [isPlaying])

  // Seek to specific time
  const seekTo = useCallback(async (time: number) => {
    if (videoRef.current && status?.isLoaded) {
      await videoRef.current.setPositionAsync(time)
    }
  }, [status])

  // Format time
  const formatTime = (millis: number): string => {
    const seconds = Math.floor(millis / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Show/hide controls
  const showControls = useCallback(() => {
    setShowControls(true)
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start()
  }, [controlsOpacity])

  const hideControls = useCallback(() => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setShowControls(false)
    })
  }, [controlsOpacity])

  // Username video tap
  const usernameVideoTap = useCallback(() => {
    if (showControls) {
      hideControls()
    } else {
      showControls()
    }
  }, [showControls, hideControls])

  // Handle like
  const handleLike = useCallback(() => {
    setIsLiked(!isLiked)
    onLike()
  }, [isLiked, onLike])

  // Handle renote
  const handleRenote = useCallback(() => {
    setIsRenoteed(!isRenoteed)
    onRenote()
  }, [isRenoteed, onRenote])

  // Handle progress bar tap
  const handleProgressBarTap = useCallback((event: any) => {
    const {locationX} = event.nativeEvent
    const progressBarWidth = event.target.measure((x: number, y: number, width: number) => {
      const progress = locationX / width
      const seekTime = progress * duration
      seekTo(seekTime)
    })
  }, [duration, seekTo])

  // Auto-play when video becomes active
  useEffect(() => {
    if (isActive && isVisible && videoRef.current) {
      videoRef.current.playAsync()
    } else if (videoRef.current) {
      videoRef.current.pauseAsync()
    }
  }, [isActive, isVisible])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync()
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={usernameVideoTap}
        activeOpacity={1}
      >
        <Video
          ref={videoRef}
          source={{uri: video.playback_url}}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isActive}
          isLooping={false}
          isMuted={false}
          onPlaybackStatusUpdate={usernamePlaybackStatusUpdate}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={(error) => {
            console.error('Video playback error:', error)
            setIsLoading(false)
          }}
          useNoteer={true}
          noteerSource={{uri: video.thumbnail_url}}
          noteerStyle={styles.noteer}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && !isLoading && (
          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <View style={styles.playIcon}>
              <View style={styles.playTriangle} />
            </View>
          </TouchableOpacity>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <TouchableOpacity
            style={styles.progressBar}
            onPress={usernameProgressBarTap}
            activeOpacity={0.8}
          >
            <View style={styles.progressBackground} />
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressBarWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </TouchableOpacity>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Video Info Overlay */}
      <Animated.View
        style={[
          styles.infoOverlay,
          {
            opacity: controlsOpacity,
            paddingTop: insets.top
          }
        ]}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.videoStats}>
            <View style={styles.statItem}>
              <EyeIcon width={16} height={16} fill="#FFFFFF" />
              <Text style={styles.statText}>
                {video.engagement.view_count.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
          
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {video.title}
            </Text>
            
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>
                {video.creator.display_name}
              </Text>
              {video.creator.verified && (
                <Text style={styles.verifiedBadge}>✓</Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
                {isLiked ? '❤️' : '🤍'}
              </Text>
              <Text style={styles.actionText}>
                {video.engagement.like_count.toLocaleString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleRenote}>
              <Text style={[styles.actionIcon, isRenoteed && styles.renoteedIcon]}>
                {isRenoteed ? '🔄' : '↩️'}
              </Text>
              <Text style={styles.actionText}>
                {video.engagement.renote_count.toLocaleString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onShare}>
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noteer: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  playButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 20,
    borderRightWidth: 0,
    borderBottomWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: '#007AFF',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 4,
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 16,
    borderRightWidth: 0,
    borderBottomWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: '#007AFF',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    marginBottom: 8,
  },
  progressBackground: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  bottomInfo: {
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 24,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },
  verifiedBadge: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  likedIcon: {
    color: '#FF3B30',
  },
  renoteedIcon: {
    color: '#34C759',
  },
})