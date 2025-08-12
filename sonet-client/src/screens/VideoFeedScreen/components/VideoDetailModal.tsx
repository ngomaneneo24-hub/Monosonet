import React, {useState, useCallback} from 'react'
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native'
import {VideoPlayer} from './VideoPlayer'
import {VideoItem} from '../../../lib/api/video-feed'
import {useEngagementTrackingMutation} from '../../../state/queries/video-feed'

const {width: screenWidth, height: screenHeight} = Dimensions.get('window')

interface VideoDetailModalProps {
  video: VideoItem | null
  isVisible: boolean
  onClose: () => void
}

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({
  video,
  isVisible,
  onClose
}) => {
  const [isActive, setIsActive] = useState(true)
  const engagementMutation = useEngagementTrackingMutation()

  // Handle playback status updates
  const handlePlaybackStatusUpdate = useCallback((status: any) => {
    // Track playback progress for analytics
    if (status.isLoaded && status.isPlaying) {
      // Could send progress updates to analytics
    }
  }, [])

  // Handle view tracking
  const handleViewTrack = useCallback(() => {
    if (video) {
      engagementMutation.mutate({
        user_id: 'current-user-id', // TODO: Get from auth context
        video_id: video.id,
        event_type: 'view',
        timestamp: new Date().toISOString(),
        duration_ms: video.video.duration_ms,
        completion_rate: 0,
        context: 'video_detail_modal'
      })
    }
  }, [video, engagementMutation])

  // Handle like
  const handleLike = useCallback(() => {
    if (video) {
      engagementMutation.mutate({
        user_id: 'current-user-id', // TODO: Get from auth context
        video_id: video.id,
        event_type: 'like',
        timestamp: new Date().toISOString(),
        context: 'video_detail_modal'
      })
    }
  }, [video, engagementMutation])

  // Handle repost
  const handleRepost = useCallback(() => {
    if (video) {
      engagementMutation.mutate({
        user_id: 'current-user-id', // TODO: Get from auth context
        video_id: video.id,
        event_type: 'repost',
        timestamp: new Date().toISOString(),
        context: 'video_detail_modal'
      })
    }
  }, [video, engagementMutation])

  // Handle share
  const handleShare = useCallback(() => {
    if (video) {
      engagementMutation.mutate({
        user_id: 'current-user-id', // TODO: Get from auth context
        video_id: video.id,
        event_type: 'share',
        timestamp: new Date().toISOString(),
        context: 'video_detail_modal'
      })
      
      // TODO: Implement actual sharing functionality
      console.log('Sharing video:', video.id)
    }
  }, [video, engagementMutation])

  // Handle modal close
  const handleClose = useCallback(() => {
    setIsActive(false)
    setTimeout(() => {
      onClose()
      setIsActive(true)
    }, 200)
  }, [onClose])

  // Handle modal show
  const handleShow = useCallback(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setHidden(true, 'slide')
    }
  }, [])

  // Handle modal hide
  const handleHide = useCallback(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setHidden(false, 'slide')
    }
  }, [])

  if (!video) return null

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={handleShow}
      onDismiss={handleHide}
      onRequestClose={handleClose}
    >
      <VideoPlayer
        video={video}
        isVisible={isVisible}
        isActive={isActive}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onViewTrack={handleViewTrack}
        onLike={handleLike}
        onRepost={handleRepost}
        onShare={handleShare}
        onClose={handleClose}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
})