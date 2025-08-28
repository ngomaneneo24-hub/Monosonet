import React, {useCallback, useState, useMemo} from 'react'
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
import {type SonetNote, type SonetUser} from '#/types/sonet'

// Sample data to demonstrate the enhanced feed
const SAMPLE_USERS: SonetUser[] = [
  {
    id: '1',
    username: 'janecop',
    displayName: 'Jane Cop',
    bio: 'Just graduated and loving life! 🎓',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    banner: '',
    followersCount: 1234,
    followingCount: 567,
    notesCount: 89,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    username: 'amonk_',
    displayName: 'Alex Monk',
    bio: 'Design enthusiast and Figma lover 🎨',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    banner: '',
    followersCount: 890,
    followingCount: 234,
    notesCount: 45,
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    username: 'dumakaka',
    displayName: 'Duma Kaka',
    bio: 'UI/UX designer and developer 💻',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    banner: '',
    followersCount: 567,
    followingCount: 123,
    notesCount: 67,
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const SAMPLE_NOTES: SonetNote[] = [
  {
    id: '1',
    content: 'I just graduated and video called mom and she was so happy! Gonna meet her after 2 years! #graduation',
    author: SAMPLE_USERS[0],
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 minutes ago
    updatedAt: new Date().toISOString(),
    likesCount: 42,
    renotesCount: 8,
    repliesCount: 4,
    isLiked: false,
    isRenoted: false,
    isBookmarked: false,
    media: [
      {
        id: '1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9e1?w=800&h=600&fit=crop',
        alt: 'Graduation ceremony with caps in the air',
        width: 800,
        height: 600,
      },
    ],
    hashtags: ['graduation'],
    mentions: [],
  },
  {
    id: '2',
    content: 'I don\'t know much about thread but I am loving the new @figma update with variants!',
    author: SAMPLE_USERS[1],
    createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(), // 16 minutes ago
    updatedAt: new Date().toISOString(),
    likesCount: 28,
    renotesCount: 5,
    repliesCount: 3,
    isLiked: true,
    isRenoted: false,
    isBookmarked: false,
    media: [],
    hashtags: [],
    mentions: ['figma'],
  },
  {
    id: '3',
    content: 'Thread\'s UI feels like too overwhelming, I guess they need to work on it.',
    author: SAMPLE_USERS[2],
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    updatedAt: new Date().toISOString(),
    likesCount: 15,
    renotesCount: 2,
    repliesCount: 1,
    isLiked: false,
    isRenoted: false,
    isBookmarked: false,
    media: [],
    hashtags: [],
    mentions: [],
  },
  {
    id: '4',
    content: 'Check out this amazing sunset! Nature is truly beautiful 🌅',
    author: SAMPLE_USERS[0],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date().toISOString(),
    likesCount: 67,
    renotesCount: 12,
    repliesCount: 8,
    isLiked: false,
    isRenoted: true,
    isBookmarked: false,
    media: [
      {
        id: '2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        alt: 'Beautiful sunset over mountains',
        width: 800,
        height: 600,
      },
      {
        id: '3',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
        alt: 'Forest landscape',
        width: 800,
        height: 600,
      },
    ],
    hashtags: ['sunset', 'nature'],
    mentions: [],
  },
  {
    id: '5',
    content: 'Working on some new designs today. Can\'t wait to share the final result! 🎨',
    author: SAMPLE_USERS[1],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    updatedAt: new Date().toISOString(),
    likesCount: 34,
    renotesCount: 6,
    repliesCount: 5,
    isLiked: false,
    isRenoted: false,
    isBookmarked: false,
    media: [
      {
        id: '4',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=600&fit=crop',
        alt: 'Design workspace with sketches',
        width: 800,
        height: 600,
      },
      {
        id: '5',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
        alt: 'Color palette and design tools',
        width: 800,
        height: 600,
      },
      {
        id: '6',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
        alt: 'Digital design mockup',
        width: 800,
        height: 600,
      },
      {
        id: '7',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
        alt: 'Design process workflow',
        width: 800,
        height: 600,
      },
    ],
    hashtags: ['design', 'workflow'],
    mentions: [],
  },
]

export function EnhancedFeedDemo() {
  const t = useTheme()
  const {_} = useLingui()
  
  const [notes, setNotes] = useState<SonetNote[]>(SAMPLE_NOTES)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }, [])

  const handleNotePress = useCallback((note: SonetNote) => {
    Alert.alert('Note Pressed', `You pressed on note: ${note.content.substring(0, 50)}...`)
  }, [])

  const handleUserPress = useCallback((user: SonetUser) => {
    Alert.alert('User Pressed', `You pressed on user: @${user.username}`)
  }, [])

  const handleLike = useCallback((note: SonetNote) => {
    setNotes(prev => prev.map(n => 
      n.id === note.id 
        ? { ...n, isLiked: !n.isLiked, likesCount: n.isLiked ? n.likesCount - 1 : n.likesCount + 1 }
        : n
    ))
  }, [])

  const handleReply = useCallback((note: SonetNote) => {
    Alert.alert('Reply', `Reply to: ${note.content.substring(0, 50)}...`)
  }, [])

  const handleRepost = useCallback((note: SonetNote) => {
    setNotes(prev => prev.map(n => 
      n.id === note.id 
        ? { ...n, isRenoted: !n.isRenoted, renotesCount: n.isRenoted ? n.renotesCount - 1 : n.renotesCount + 1 }
        : n
    ))
  }, [])

  const handleShare = useCallback((note: SonetNote) => {
    Alert.alert('Share', `Share: ${note.content.substring(0, 50)}...`)
  }, [])

  const handleViewLikes = useCallback((note: SonetNote) => {
    Alert.alert('View Likes', `${note.likesCount} people liked this post`)
  }, [])

  const handleViewReplies = useCallback((note: SonetNote) => {
    Alert.alert('View Replies', `${note.repliesCount} people replied to this post`)
  }, [])

  const handleViewViews = useCallback((note: SonetNote) => {
    const viewCount = Math.floor(Math.random() * 100) + 10
    Alert.alert('View Count', `${viewCount} people viewed this post`)
  }, [])

  const handleImagePress = useCallback((note: SonetNote, index: number) => {
    Alert.alert('Image Pressed', `Image ${index + 1} from note: ${note.content.substring(0, 30)}...`)
  }, [])

  const handleHashtagPress = useCallback((hashtag: string) => {
    Alert.alert('Hashtag Pressed', `#${hashtag}`)
  }, [])

  const handleMentionPress = useCallback((mention: string) => {
    Alert.alert('Mention Pressed', `@${mention}`)
  }, [])

  return (
    <View style={[styles.container, t.atoms.bg_contrast_0]}>
      <EnhancedFeed
        notes={notes}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
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
})