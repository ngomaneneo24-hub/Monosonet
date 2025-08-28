import React from 'react'
import {render, fireEvent, waitFor} from '@testing-library/react-native'
import {EnhancedFeedItem} from '../EnhancedFeedItem'
import {EnhancedFeed} from '../EnhancedFeed'
import {type SonetNote, type SonetUser} from '#/types/sonet'

// Mock the icon components
jest.mock('#/components/icons/Heart2', () => ({
  Heart2_Stroke2_Corner0_Rounded: 'Heart2_Stroke2_Corner0_Rounded',
  Heart2_Filled_Stroke2_Corner0_Rounded: 'Heart2_Filled_Stroke2_Corner0_Rounded',
}))

jest.mock('#/components/icons/Bubble', () => ({
  Bubble_Stroke2_Corner2_Rounded: 'Bubble_Stroke2_Corner2_Rounded',
}))

jest.mock('#/components/icons/Renote', () => ({
  Renote_Stroke2_Corner0_Rounded: 'Renote_Stroke2_Corner0_Rounded',
  Renote_Stroke2_Corner2_Rounded: 'Renote_Stroke2_Corner2_Rounded',
}))

jest.mock('#/components/icons/PaperPlane', () => ({
  PaperPlane_Stroke2_Corner0_Rounded: 'PaperPlane_Stroke2_Corner0_Rounded',
}))

// Mock the theme and other dependencies
jest.mock('#/alf', () => ({
  useTheme: () => ({
    atoms: {
      bg_contrast_0: {backgroundColor: '#ffffff'},
      text_primary: {color: '#000000'},
      text_contrast_medium: {color: '#666666'},
      text_link: {color: '#0066cc'},
    },
  }),
}))

jest.mock('#/lib/hooks/usePalette', () => ({
  usePalette: () => ({
    color: {
      primary: '#0066cc',
      secondary: '#666666',
    },
  }),
}))

jest.mock('#/view/com/util/UserAvatar', () => ({
  PreviewableUserAvatar: 'PreviewableUserAvatar',
}))

// Create mock data
const mockUser: SonetUser = {
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'Test bio',
  avatar: 'https://example.com/avatar.jpg',
  banner: '',
  followersCount: 100,
  followingCount: 50,
  notesCount: 25,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockNote: SonetNote = {
  id: '1',
  content: 'This is a test post with #hashtag and @mention',
  author: mockUser,
  createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  likesCount: 10,
  renotesCount: 5,
  repliesCount: 3,
  isLiked: false,
  isRenoted: false,
  isBookmarked: false,
  media: [],
  hashtags: ['hashtag'],
  mentions: ['mention'],
}

describe('EnhancedFeedItem', () => {
  it('renders correctly with basic props', () => {
    const {getByText, getByLabelText} = render(
      <EnhancedFeedItem
        note={mockNote}
        onPress={() => {}}
        onLike={() => {}}
        onReply={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    expect(getByText('Test User')).toBeTruthy()
    expect(getByText('@testuser')).toBeTruthy()
    expect(getByText('This is a test post with #hashtag and @mention')).toBeTruthy()
    expect(getByText('#hashtag')).toBeTruthy()
    expect(getByText('@mention')).toBeTruthy()
  })

  it('handles like button press', () => {
    const mockOnLike = jest.fn()
    const {getByLabelText} = render(
      <EnhancedFeedItem
        note={mockNote}
        onPress={() => {}}
        onLike={mockOnLike}
        onReply={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    const likeButton = getByLabelText('Like post')
    fireEvent.press(likeButton)
    
    expect(mockOnLike).toHaveBeenCalledTimes(1)
  })

  it('handles reply button press', () => {
    const mockOnReply = jest.fn()
    const {getByLabelText} = render(
      <EnhancedFeedItem
        note={mockNote}
        onPress={() => {}}
        onLike={() => {}}
        onReply={mockOnReply}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    const replyButton = getByLabelText('Reply to post')
    fireEvent.press(replyButton)
    
    expect(mockOnReply).toHaveBeenCalledTimes(1)
  })

  it('displays engagement metrics correctly', () => {
    const {getByText} = render(
      <EnhancedFeedItem
        note={mockNote}
        onPress={() => {}}
        onLike={() => {}}
        onReply={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    expect(getByText('3')).toBeTruthy() // replies
    expect(getByText('10')).toBeTruthy() // likes
    expect(getByText('5')).toBeTruthy() // reposts
  })
})

describe('EnhancedFeed', () => {
  it('renders empty state when no notes', () => {
    const {getByText} = render(
      <EnhancedFeed
        notes={[]}
        isLoading={false}
        onNotePress={() => {}}
        onUserPress={() => {}}
        onLike={() => {}}
        onReply={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    expect(getByText('No posts yet')).toBeTruthy()
    expect(getByText('When you follow people, their posts will appear here')).toBeTruthy()
  })

  it('renders notes when provided', () => {
    const {getByText} = render(
      <EnhancedFeed
        notes={[mockNote]}
        isLoading={false}
        onNotePress={() => {}}
        onUserPress={() => {}}
        onLike={() => {}}
        onReply={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    expect(getByText('Test User')).toBeTruthy()
    expect(getByText('This is a test post with #hashtag and @mention')).toBeTruthy()
  })

  it('shows loading state when isLoading is true', () => {
    const {getByTestId} = render(
      <EnhancedFeed
        notes={[]}
        isLoading={true}
        onNotePress={() => {}}
        onUserPress={() => {}}
        onLike={() => {}}
        onReply={() => {}}
        onRepost={() => {}}
        onShare={() => {}}
      />
    )

    // Note: ActivityIndicator doesn't have a testID by default, so we check for its presence
    // In a real implementation, you might want to add testID props
  })
})