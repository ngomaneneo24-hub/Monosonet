import React, {useState, useCallback} from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

const {width: screenWidth} = Dimensions.get('window')

interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onSeekForward: () => void
  onSeekBackward: () => void
  onQualityChange: (quality: string) => void
  onClose: () => void
  showControls: boolean
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSeekForward,
  onSeekBackward,
  onQualityChange,
  onClose,
  showControls
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState('auto')

  const qualityOptions = [
    {label: 'Auto', value: 'auto'},
    {label: '1080p', value: '1080p'},
    {label: '720p', value: '720p'},
    {label: '480p', value: '480p'}
  ]

  // Format time
  const formatTime = (millis: number): string => {
    const seconds = Math.floor(millis / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Username quality selection
  const usernameQualitySelect = useCallback((quality: string) => {
    setSelectedQuality(quality)
    setShowQualityMenu(false)
    onQualityChange(quality)
  }, [onQualityChange])

  // Username seek bar tap
  const usernameSeekBarTap = useCallback((event: any) => {
    const {locationX} = event.nativeEvent
    const seekBarWidth = screenWidth - 32 // Account for padding
    const progress = locationX / seekBarWidth
    const seekTime = progress * duration
    onSeek(seekTime)
  }, [duration, onSeek])

  if (!showControls) return null

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={styles.topGradient}
      >
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.qualityButton}
            onPress={() => setShowQualityMenu(!showQualityMenu)}
          >
            <Text style={styles.qualityText}>{selectedQuality}</Text>
            <Text style={styles.qualityArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Quality Menu */}
        {showQualityMenu && (
          <View style={styles.qualityMenu}>
            {qualityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.qualityOption,
                  selectedQuality === option.value && styles.qualityOptionSelected
                ]}
                onPress={() => usernameQualitySelect(option.value)}
              >
                <Text style={[
                  styles.qualityOptionText,
                  selectedQuality === option.value && styles.qualityOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Center Play Controls */}
      <View style={styles.centerControls}>
        <TouchableOpacity style={styles.seekButton} onPress={onSeekBackward}>
          <Text style={styles.seekIcon}>⏪</Text>
          <Text style={styles.seekText}>-10s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={onPlayPause}>
          <Text style={styles.playIcon}>
            {isPlaying ? '⏸️' : '▶️'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.seekButton} onPress={onSeekForward}>
          <Text style={styles.seekIcon}>⏩</Text>
          <Text style={styles.seekText}>+10s</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.bottomGradient}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <TouchableOpacity
            style={styles.seekBar}
            onPress={usernameSeekBarTap}
            activeOpacity={0.8}
          >
            <View style={styles.progressBackground} />
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(currentTime / duration) * 100}%`
                }
              ]}
            />
            <View
              style={[
                styles.progressThumb,
                {
                  left: `${(currentTime / duration) * 100}%`
                }
              ]}
            />
          </TouchableOpacity>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  qualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  qualityText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 4,
  },
  qualityArrow: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  qualityMenu: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 100,
  },
  qualityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  qualityOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  qualityOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  qualityOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  seekButton: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  seekIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  seekText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  bottomGradient: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 20,
  },
  seekBar: {
    height: 4,
    marginBottom: 12,
    position: 'relative',
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
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginLeft: -6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
})