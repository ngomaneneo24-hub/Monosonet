import React, {useCallback, useState, useMemo} from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Alert,
} from 'react-native'
import {Image} from 'expo-image'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePalette} from '#/lib/hooks/usePalette'
import {s} from '#/lib/styles'
import {atoms as a, useTheme} from '#/alf'
import {Text as TypographyText} from '#/components/Typography'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {EnhancedMediaGallery} from './EnhancedMediaGallery'
import {EnhancedEngagementMetrics} from './EnhancedEngagementMetrics'
import {EnhancedActionButtons} from './EnhancedActionButtons'
import {type SonetNote, type SonetUser} from '#/types/sonet'

const {width: screenWidth} = Dimensions.get('window')
const MAX_IMAGE_WIDTH = screenWidth - 80 // Account for padding and avatar
const MAX_IMAGE_HEIGHT = (MAX_IMAGE_WIDTH * 9) / 16 // 16:9 aspect ratio

interface EnhancedFeedItemProps {
  note: SonetNote
  onPress?: () => void
  onLike?: () => void
  onReply?: () => void
  onRepost?: () => void
  onShare?: () => void
  onViewLikes?: () => void
  onViewReplies?: () => void
  onViewViews?: () => void
  onImagePress?: (index: number) => void
  onUserPress?: (user: SonetUser) => void
  onHashtagPress?: (hashtag: string) => void
  onMentionPress?: (mention: string) => void
}

export function EnhancedFeedItem({
  note,
  onPress,
  onLike,
  onReply,
  onRepost,
  onShare,
  onViewLikes,
  onViewReplies,
  onViewViews,
  onImagePress,
  onUserPress,
  onHashtagPress,
  onMentionPress,
}: EnhancedFeedItemProps) {
  const t = useTheme()
  const {_} = useLingui()
  const pal = usePalette('default')
  
  const [isLiked, setIsLiked] = useState(note.isLiked)
  const [isRenoted, setIsRenoted] = useState(note.isRenoted)
  const [likeCount, setLikeCount] = useState(note.likesCount)
  const [repostCount, setRepostCount] = useState(note.renotesCount)
  const [replyCount, setReplyCount] = useState(note.repliesCount)
  const [viewCount, setViewCount] = useState(Math.floor(Math.random() * 100) + 10) // Mock view count

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    onLike?.()
  }, [isLiked, onLike])

  const handleReply = useCallback(() => {
    onReply?.()
  }, [onReply])

  const handleRepost = useCallback(() => {
    setIsRenoted(!isRenoted)
    setRepostCount(prev => isRenoted ? prev - 1 : prev + 1)
    onRepost?.()
  }, [isRenoted, onRepost])

  const handleShare = useCallback(() => {
    onShare?.()
  }, [onShare])

  const handleViewLikes = useCallback(() => {
    onViewLikes?.()
  }, [onViewLikes])

  const handleViewReplies = useCallback(() => {
    onViewReplies?.()
  }, [onViewReplies])

  const handleViewViews = useCallback(() => {
    onViewViews?.()
  }, [onViewViews])

  const handleUserPress = useCallback(() => {
    onUserPress?.(note.author)
  }, [note.author, onUserPress])

  const formatTimestamp = useCallback((timestamp: string) => {
    const now = new Date()
    const postTime = new Date(timestamp)
    const diffMs = now.getTime() - postTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return postTime.toLocaleDateString()
  }, [])

  const renderContent = useCallback(() => {
    if (!note.content) return null

    // Simple hashtag and mention detection
    const words = note.content.split(' ')
    return words.map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <Pressable
            key={index}
            onPress={() => onHashtagPress?.(word.slice(1))}
            style={styles.hashtag}
          >
            <TypographyText style={[styles.hashtagText, t.atoms.text_link]}>
              {word}
            </TypographyText>
          </Pressable>
        )
      }
      if (word.startsWith('@')) {
        return (
          <Pressable
            key={index}
            onPress={() => onMentionPress?.(word.slice(1))}
            style={styles.mention}
          >
            <TypographyText style={[styles.mentionText, t.atoms.text_link]}>
              {word}
            </TypographyText>
          </Pressable>
        )
      }
      return (
        <TypographyText key={index} style={[styles.contentText, t.atoms.text_primary]}>
          {word}{' '}
        </TypographyText>
      )
    })
  }, [note.content, onHashtagPress, onMentionPress, t.atoms.text_link, t.atoms.text_primary])

  const hasMedia = note.media && note.media.length > 0
  const mediaImages = note.media?.filter(m => m.type === 'image') || []

  return (
    <Pressable
      style={[styles.container, t.atoms.bg_contrast_0]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${note.author.displayName || note.author.username}`}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleUserPress} style={styles.avatarContainer}>
            <PreviewableUserAvatar
              size={40}
              profile={note.author}
              type={Platform.OS === 'web' ? 'web' : 'native'}
            />
          </Pressable>
          <View style={styles.userInfo}>
            <Pressable onPress={handleUserPress}>
              <TypographyText style={[styles.username, t.atoms.text_primary, s.bold]}>
                {note.author.displayName || note.author.username}
              </TypographyText>
            </Pressable>
            <TypographyText style={[styles.userHandle, t.atoms.text_contrast_medium]}>
              @{note.author.username}
            </TypographyText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TypographyText style={[styles.timestamp, t.atoms.text_contrast_medium]}>
            {formatTimestamp(note.createdAt)}
          </TypographyText>
          <Pressable style={styles.optionsButton}>
            <TypographyText style={[styles.optionsText, t.atoms.text_contrast_medium]}>
              •••
            </TypographyText>
          </Pressable>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.textContent}>
          {renderContent()}
        </View>
        
        {/* Media Gallery */}
        {hasMedia && (
          <View style={styles.mediaContainer}>
            <EnhancedMediaGallery
              images={mediaImages}
              maxWidth={MAX_IMAGE_WIDTH}
              maxHeight={MAX_IMAGE_HEIGHT}
              onImagePress={onImagePress}
            />
          </View>
        )}
      </View>

      {/* Engagement Row - Left Side */}
      <View style={styles.engagementRow}>
        <View style={styles.engagementLeft}>
          <EnhancedEngagementMetrics
            replyCount={replyCount}
            likeCount={likeCount}
            repostCount={repostCount}
            viewCount={viewCount}
            onViewReplies={handleViewReplies}
            onViewLikes={handleViewLikes}
            onViewViews={handleViewViews}
          />
          
          {/* Avatar Stack */}
          {replyCount > 0 && (
            <View style={styles.avatarStack}>
              {Array.from({length: Math.min(3, replyCount)}, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.avatarStackItem,
                    {marginLeft: index > 0 ? -8 : 0}
                  ]}
                >
                  <View style={[styles.mockAvatar, {backgroundColor: getMockAvatarColor(index)}]} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons - Right Side */}
        <View style={styles.engagementRight}>
          <EnhancedActionButtons
            isLiked={isLiked}
            isRenoted={isRenoted}
            onLike={handleLike}
            onReply={handleReply}
            onRepost={handleRepost}
            onShare={handleShare}
          />
        </View>
      </View>
    </Pressable>
  )
}

function getMockAvatarColor(index: number): string {
  const colors = ['#FFD700', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C']
  return colors[index % colors.length]
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 14,
    lineHeight: 18,
  },
  optionsButton: {
    padding: 4,
  },
  optionsText: {
    fontSize: 16,
    lineHeight: 20,
  },
  content: {
    marginBottom: 16,
  },
  textContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  hashtag: {
    marginRight: 4,
  },
  hashtagText: {
    fontSize: 16,
    lineHeight: 24,
  },
  mention: {
    marginRight: 4,
  },
  mentionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  mediaContainer: {
    marginTop: 8,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  engagementRight: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarStackItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  mockAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
})