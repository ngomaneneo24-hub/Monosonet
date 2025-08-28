import React, {useCallback, useState, useEffect} from 'react'
import {
  View,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {EnhancedFeed} from './EnhancedFeed'
import {EnhancedMediaUpload} from './EnhancedMediaUpload'
import {type SonetNote, type SonetUser, type SonetMedia} from '#/types/sonet'
import {Text as TypographyText} from '#/components/Typography'

// Example of integrating the enhanced feed into an existing screen
export function IntegrationExample() {
  const t = useTheme()
  const {_} = useLingui()
  
  const [notes, setNotes] = useState<SonetNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [draftMedia, setDraftMedia] = useState<SonetMedia[]>([])

  // Simulate loading initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data - replace with actual API call
      const mockNotes: SonetNote[] = [
        {
          id: '1',
          content: 'Welcome to the enhanced feed! This is a sample post to demonstrate the new design.',
          author: {
            id: '1',
            username: 'demo_user',
            displayName: 'Demo User',
            bio: 'Showing off the new feed design',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            banner: '',
            followersCount: 100,
            followingCount: 50,
            notesCount: 25,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          updatedAt: new Date().toISOString(),
          likesCount: 15,
          renotesCount: 3,
          repliesCount: 2,
          isLiked: false,
          isRenoted: false,
          isBookmarked: false,
          media: [],
          hashtags: ['demo', 'newfeed'],
          mentions: [],
        },
      ]
      
      setNotes(mockNotes)
      setIsLoading(false)
    }
    
    loadInitialData()
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }, [])

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    
    // Simulate loading more data
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock additional data
    const additionalNotes: SonetNote[] = [
      {
        id: `more_${Date.now()}`,
        content: 'This is additional content loaded when scrolling down.',
        author: {
          id: '2',
          username: 'another_user',
          displayName: 'Another User',
          bio: 'Contributing to the feed',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          banner: '',
          followersCount: 75,
          followingCount: 30,
          notesCount: 15,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updatedAt: new Date().toISOString(),
        likesCount: 8,
        renotesCount: 1,
        repliesCount: 0,
        isLiked: false,
        isRenoted: false,
        isBookmarked: false,
        media: [],
        hashtags: ['more', 'content'],
        mentions: [],
      },
    ]
    
    setNotes(prev => [...prev, ...additionalNotes])
    setHasMore(false) // No more data for demo
  }, [hasMore, isLoading])

  const handleNotePress = useCallback((note: SonetNote) => {
    // Navigate to note detail or thread view
    Alert.alert('Note Pressed', `Navigate to note: ${note.id}`)
  }, [])

  const handleUserPress = useCallback((user: SonetUser) => {
    // Navigate to user profile
    Alert.alert('User Pressed', `Navigate to profile: @${user.username}`)
  }, [])

  const handleLike = useCallback((note: SonetNote) => {
    // Optimistic update
    setNotes(prev => prev.map(n => 
      n.id === note.id 
        ? { ...n, isLiked: !n.isLiked, likesCount: n.isLiked ? n.likesCount - 1 : n.likesCount + 1 }
        : n
    ))
    
    // API call would go here
    console.log(`${note.isLiked ? 'Unlike' : 'Like'} note:`, note.id)
  }, [])

  const handleReply = useCallback((note: SonetNote) => {
    // Open reply composer
    Alert.alert('Reply', `Open reply composer for note: ${note.id}`)
  }, [])

  const handleRepost = useCallback((note: SonetNote) => {
    // Optimistic update
    setNotes(prev => prev.map(n => 
      n.id === note.id 
        ? { ...n, isRenoted: !n.isRenoted, renotesCount: n.isRenoted ? n.renotesCount - 1 : n.renotesCount + 1 }
        : n
    ))
    
    // API call would go here
    console.log(`${note.isRenoted ? 'Remove repost' : 'Repost'} note:`, note.id)
  }, [])

  const handleShare = useCallback((note: SonetNote) => {
    // Open share sheet
    if (Platform.OS === 'web') {
      // Web sharing
      if (navigator.share) {
        navigator.share({
          title: 'Check out this post',
          text: note.content,
          url: `https://yourapp.com/post/${note.id}`,
        })
      } else {
        // Fallback for browsers without native sharing
        navigator.clipboard.writeText(`https://yourapp.com/post/${note.id}`)
        Alert.alert('Link Copied', 'Post link copied to clipboard!')
      }
    } else {
      // Native sharing
      Alert.alert('Share', `Open share sheet for note: ${note.id}`)
    }
  }, [])

  const handleViewLikes = useCallback((note: SonetNote) => {
    // Navigate to likes list
    Alert.alert('View Likes', `Show ${note.likesCount} people who liked this post`)
  }, [])

  const handleViewReplies = useCallback((note: SonetNote) => {
    // Navigate to replies/thread view
    Alert.alert('View Replies', `Show ${note.repliesCount} replies to this post`)
  }, [])

  const handleViewViews = useCallback((note: SonetNote) => {
    // Show view analytics (if available)
    const viewCount = Math.floor(Math.random() * 100) + 10
    Alert.alert('View Count', `${viewCount} people viewed this post`)
  }, [])

  const handleImagePress = useCallback((note: SonetNote, index: number) => {
    // Open image viewer/lightbox
    Alert.alert('Image Pressed', `Open image viewer for image ${index + 1} from note: ${note.id}`)
  }, [])

  const handleHashtagPress = useCallback((hashtag: string) => {
    // Navigate to hashtag feed
    Alert.alert('Hashtag Pressed', `Navigate to #${hashtag} feed`)
  }, [])

  const handleMentionPress = useCallback((mention: string) => {
    // Navigate to mentioned user's profile
    Alert.alert('Mention Pressed', `Navigate to @${mention} profile`)
  }, [])

  const handleMediaChange = useCallback((media: SonetMedia[]) => {
    setDraftMedia(media)
    console.log('Draft media updated:', media.length, 'images')
  }, [])

  const handleCreatePost = useCallback(() => {
    if (draftMedia.length === 0) {
      Alert.alert('No Media', 'Please add at least one image to create a post')
      return
    }
    
    // Create new post with media
    const newPost: SonetNote = {
      id: `new_${Date.now()}`,
      content: 'New post with media!',
      author: {
        id: '1',
        username: 'demo_user',
        displayName: 'Demo User',
        bio: 'Creating new content',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        banner: '',
        followersCount: 100,
        followingCount: 50,
        notesCount: 25,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: 0,
      renotesCount: 0,
      repliesCount: 0,
      isLiked: false,
      isRenoted: false,
      isBookmarked: false,
      media: draftMedia,
      hashtags: ['new', 'media'],
      mentions: [],
    }
    
    setNotes(prev => [newPost, ...prev])
    setDraftMedia([])
    Alert.alert('Success', 'New post created with media!')
  }, [draftMedia])

  return (
    <View style={[styles.container, t.atoms.bg_contrast_0]}>
      {/* Media Upload Section */}
      <View style={styles.uploadSection}>
        <EnhancedMediaUpload
          onMediaChange={handleMediaChange}
          initialMedia={draftMedia}
          maxImages={10}
          disabled={false}
        />
        {draftMedia.length > 0 && (
          <View style={styles.createPostSection}>
            <TypographyText style={[styles.createPostText, t.atoms.text_primary]}>
              Ready to create a post with {draftMedia.length} image{draftMedia.length !== 1 ? 's' : ''}?
            </TypographyText>
            <Pressable
              style={[styles.createPostButton, t.atoms.bg_primary]}
              onPress={handleCreatePost}
            >
              <TypographyText style={[styles.createPostButtonText, t.atoms.text_on_primary]}>
                Create Post
              </TypographyText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Enhanced Feed */}
      <EnhancedFeed
        notes={notes}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        hasMore={hasMore}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        onNotePress={handleNotePress}
        onUserPress={handleUserPress}
        onLike={handleLike}
        onReply={handleReply}
        onRepost={handleRepost}
        onShare={handleShare}
        onViewLikes={handleViewLikes}
        onViewReplies={handleViewReplies}
        onViewViews={handleViewViews}
        onImagePress={handleImagePress}
        onHashtagPress={handleHashtagPress}
        onMentionPress={handleMentionPress}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  uploadSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  createPostSection: {
    marginTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  createPostText: {
    fontSize: 16,
    textAlign: 'center',
  },
  createPostButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createPostButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})