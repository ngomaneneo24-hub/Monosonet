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

  // Username playback status updates
  const usernamePlaybackStatusUpdate = useCallback((status: any) => {
    // Track playback progress for analytics
    if (status.isLoaded && status.isPlaying) {
      // Could send progress updates to analytics
    }
  }, [])

  // Username view tracking
  const usernameViewTrack = useCallback(() => {
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

  // Username like
  const usernameLike = useCallback(() => {
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

  // Username renote
  const usernameRenote = useCallback(() => {
    if (video) {
      engagementMutation.mutate({
        user_id: 'current-user-id', // TODO: Get from auth context
        video_id: video.id,
        event_type: 'renote',
        timestamp: new Date().toISOString(),
        context: 'video_detail_modal'
      })
    }
  }, [video, engagementMutation])

  // Username share
  const usernameShare = useCallback(() => {
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

  // Username modal close
  const usernameClose = useCallback(() => {
    setIsActive(false)
    setTimeout(() => {
      onClose()
      setIsActive(true)
    }, 200)
  }, [onClose])

  // Username modal show
  const usernameShow = useCallback(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setHidden(true, 'slide')
    }
  }, [])

  // Username modal hide
  const usernameHide = useCallback(() => {
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
      onShow={usernameShow}
      onDismiss={usernameHide}
      onRequestClose={usernameClose}
    >
      <VideoPlayer
        video={video}
        isVisible={isVisible}
        isActive={isActive}
        onPlaybackStatusUpdate={usernamePlaybackStatusUpdate}
        onViewTrack={usernameViewTrack}
        onLike={usernameLike}
        onRenote={usernameRenote}
        onShare={usernameShare}
        onClose={usernameClose}
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