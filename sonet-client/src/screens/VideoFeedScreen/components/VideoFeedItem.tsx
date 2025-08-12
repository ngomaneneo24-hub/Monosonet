import React, {useState, useCallback} from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform
} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {VideoItem} from '../../../lib/api/video-feed'
import {EyeIcon} from '../../../assets/icons/view-svgrepo-com.svg'

interface VideoFeedItemProps {
  video: VideoItem
  width: number
  height: number
  onPress: () => void
  onLike: () => void
  onRenote: () => void
  onShare: () => void
  onVideoPress: (video: VideoItem) => void
}

export const VideoFeedItem: React.FC<VideoFeedItemProps> = ({
  video,
  width,
  height,
  onPress,
  onLike,
  onRenote,
  onShare,
  onVideoPress
}) => {
  const [isLiked, setIsLiked] = useState(false)
  const [isRenoteed, setIsRenoteed] = useState(false)

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Username like toggle
  const usernameLike = useCallback(() => {
    setIsLiked(!isLiked)
    onLike()
  }, [isLiked, onLike])

  // Username renote toggle
  const usernameRenote = useCallback(() => {
    setIsRenoteed(!isRenoteed)
    onRenote()
  }, [isRenoteed, onRenote])

  return (
    <TouchableOpacity
      style={[styles.container, {width, height}]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Video Thumbnail */}
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() => onVideoPress(video)}
        activeOpacity={0.9}
      >
        <Image
          source={{uri: video.thumbnail_url}}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(video.video.duration_ms)}
          </Text>
        </View>

        {/* Play Button Overlay */}
        <View style={styles.playButton}>
          <View style={styles.playIcon}>
            <View style={styles.playTriangle} />
          </View>
        </View>
      </TouchableOpacity>

        {/* Gradient Overlay for Text */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientOverlay}
        />
      </View>

      {/* Video Info */}
      <View style={styles.infoContainer}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>

        {/* Creator Info */}
        <View style={styles.creatorContainer}>
          <Image
            source={{uri: video.creator.avatar_url}}
            style={styles.creatorAvatar}
          />
          <Text style={styles.creatorName} numberOfLines={1}>
            {video.creator.display_name}
          </Text>
          {video.creator.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>

        {/* Engagement Metrics */}
        <View style={styles.metricsContainer}>
          {/* View Count with Eye Icon */}
          <View style={styles.metricItem}>
            <EyeIcon width={16} height={16} fill="#666" />
            <Text style={styles.metricText}>
              {formatNumber(video.engagement.view_count)}
            </Text>
          </View>

          {/* Like Count */}
          <View style={styles.metricItem}>
            <Text style={[styles.metricIcon, isLiked && styles.likedIcon]}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.metricText}>
              {formatNumber(video.engagement.like_count)}
            </Text>
          </View>

          {/* Renote Count */}
          <View style={styles.metricItem}>
            <Text style={[styles.metricIcon, isRenoteed && styles.renoteedIcon]}>
              {isRenoteed ? '🔄' : '↩️'}
            </Text>
            <Text style={styles.metricText}>
              {formatNumber(video.engagement.renote_count)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={usernameLike}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          >
            <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={usernameRenote}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          >
            <Text style={[styles.actionIcon, isRenoteed && styles.renoteedIcon]}>
              {isRenoteed ? '🔄' : '↩️'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onShare}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          >
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ML Ranking Badge (if available) */}
      {video.ml_ranking?.ranking_score && (
        <View style={styles.rankingBadge}>
          <Text style={styles.rankingText}>
            {Math.round(video.ml_ranking.ranking_score * 100)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    height: '60%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -20}, {translateY: -20}],
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderBottomWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: '#007AFF',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 2,
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: '#007AFF',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  infoContainer: {
    padding: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 18,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  creatorName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metricText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  likedIcon: {
    color: '#FF3B30',
  },
  renoteedIcon: {
    color: '#34C759',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  actionButton: {
    padding: 4,
  },
  actionIcon: {
    fontSize: 18,
  },
  rankingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
})