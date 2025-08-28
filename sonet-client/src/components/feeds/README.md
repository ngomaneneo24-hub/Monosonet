# Enhanced Feed Components

This directory contains a complete implementation of the enhanced feed design that matches the exact specifications from the design image. The implementation provides a modern, Instagram-like feed experience with support for up to 10 images, proper engagement metrics layout, and full production-ready code.

## 🎯 Design Features

### Layout & Structure
- **Card-based Design**: Each post is a self-contained card with consistent spacing and visual hierarchy
- **Header Section**: User avatar, display name, username, timestamp, and options menu
- **Content Section**: Text content with hashtag and mention support, media gallery
- **Engagement Row**: Left-side metrics and right-side action buttons (properly separated)

### Media Support
- **Up to 10 Images**: Full support for multiple image uploads
- **16:9 Aspect Ratio**: Constrained image sizing for consistent layout
- **Smart Grid Layouts**: Automatic layout optimization based on image count:
  - 1 image: Full width
  - 2 images: Side by side
  - 3 images: Large left + 2 small right
  - 4 images: 2x2 grid
  - 5+ images: 3x2 grid with overlay for additional images

### Engagement Metrics (Left Side)
- **Reply Count**: Shows number of replies with clickable "View replies"
- **Like Count**: Shows number of likes with clickable "View likes"
- **Repost Count**: Shows number of reposts
- **View Count**: Shows number of views with clickable "View views"
- **Avatar Stack**: Overlapping circular avatars representing repliers

### Action Buttons (Right Side)
- **Like Button**: Heart icon with filled/outline states and animations
- **Reply Button**: Speech bubble icon for commenting
- **Repost Button**: Arrow icon for sharing/retweeting
- **Share Button**: Paper plane icon for direct sharing

## 🚀 Components

### EnhancedFeedItem
The main post component that renders individual feed items with all the design elements.

```tsx
import {EnhancedFeedItem} from '#/components/feeds'

<EnhancedFeedItem
  note={note}
  onPress={handleNotePress}
  onLike={handleLike}
  onReply={handleReply}
  onRepost={handleRepost}
  onShare={handleShare}
  onViewLikes={handleViewLikes}
  onViewReplies={handleViewReplies}
  onViewViews={handleViewViews}
  onImagePress={handleImagePress}
  onUserPress={handleUserPress}
  onHashtagPress={handleHashtagPress}
  onMentionPress={handleMentionPress}
/>
```

### EnhancedFeed
A complete feed implementation using FlatList with pull-to-refresh, infinite scroll, and proper performance optimizations.

```tsx
import {EnhancedFeed} from '#/components/feeds'

<EnhancedFeed
  notes={notes}
  isLoading={isLoading}
  isRefreshing={isRefreshing}
  hasMore={hasMore}
  onRefresh={handleRefresh}
  onLoadMore={handleLoadMore}
  onNotePress={handleNotePress}
  // ... other handlers
/>
```

### EnhancedMediaGallery
Handles image display with intelligent layout based on image count and aspect ratio constraints.

```tsx
import {EnhancedMediaGallery} from '#/components/feeds'

<EnhancedMediaGallery
  images={images}
  maxWidth={MAX_IMAGE_WIDTH}
  maxHeight={MAX_IMAGE_HEIGHT}
  onImagePress={handleImagePress}
  onLongPress={handleLongPress}
/>
```

### EnhancedEngagementMetrics
Displays engagement statistics on the left side of the engagement row.

```tsx
import {EnhancedEngagementMetrics} from '#/components/feeds'

<EnhancedEngagementMetrics
  replyCount={replyCount}
  likeCount={likeCount}
  repostCount={repostCount}
  viewCount={viewCount}
  onViewReplies={handleViewReplies}
  onViewLikes={handleViewLikes}
  onViewViews={handleViewViews}
/>
```

### EnhancedActionButtons
Renders the action buttons on the right side with proper states and animations.

```tsx
import {EnhancedActionButtons} from '#/components/feeds'

<EnhancedActionButtons
  isLiked={isLiked}
  isRenoted={isRenoted}
  onLike={handleLike}
  onReply={handleReply}
  onRepost={handleRepost}
  onShare={handleShare}
/>
```

### EnhancedMediaUpload
Provides image upload functionality with support for up to 10 images, camera capture, and drag-and-drop reordering.

```tsx
import {EnhancedMediaUpload} from '#/components/feeds'

<EnhancedMediaUpload
  onMediaChange={handleMediaChange}
  initialMedia={initialMedia}
  maxImages={10}
  disabled={false}
/>
```

## 🎨 Styling & Theming

The components use the existing ALF design system and theme tokens for consistency:

- **Colors**: Uses `t.atoms.text_primary`, `t.atoms.text_contrast_medium`, etc.
- **Spacing**: Consistent padding, margins, and gaps throughout
- **Typography**: Proper font sizes, weights, and line heights
- **Shadows**: Subtle shadows for depth and visual hierarchy
- **Border Radius**: Consistent 12px border radius for modern look

## 📱 Platform Support

### iOS
- Native animations and gestures
- Proper touch feedback
- iOS-specific optimizations

### Android
- Material Design principles
- Android-specific performance optimizations
- Proper elevation and shadows

### Web
- Hover effects and transitions
- Web-specific interactions
- Responsive design considerations

## 🔧 Performance Features

- **FlatList Optimization**: Proper `getItemLayout`, `removeClippedSubviews`, and batch rendering
- **Image Optimization**: Lazy loading, proper sizing, and transition animations
- **Memory Management**: Efficient state updates and cleanup
- **Accessibility**: Full accessibility support with proper labels and roles

## 📋 Usage Example

```tsx
import React, {useState, useCallback} from 'react'
import {View} from 'react-native'
import {EnhancedFeed, EnhancedFeedDemo} from '#/components/feeds'

export function MyFeedScreen() {
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    // Fetch fresh data
    setIsLoading(false)
  }, [])
  
  const handleLike = useCallback((note) => {
    // Handle like action
  }, [])
  
  return (
    <View style={{flex: 1}}>
      <EnhancedFeed
        notes={notes}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onLike={handleLike}
        // ... other handlers
      />
    </View>
  )
}

// Or use the demo for testing
export function DemoScreen() {
  return <EnhancedFeedDemo />
}
```

## 🧪 Testing

The `EnhancedFeedDemo` component provides a complete working example with sample data for testing and development:

- Sample users with avatars and profiles
- Sample posts with various media configurations
- Interactive handlers that show alerts for user actions
- Realistic engagement metrics and timestamps

## 🔄 State Management

The components use local state for immediate UI feedback and callbacks for persistent state updates:

- **Local State**: Like/repost states, image dimensions, animations
- **Callback Props**: All user actions are passed up to parent components
- **Optimistic Updates**: Immediate UI feedback with proper error handling

## 🎭 Animations

- **Press Animations**: Scale animations on button presses
- **Image Transitions**: Smooth transitions when images load
- **State Changes**: Smooth transitions between like/repost states
- **Web Hover Effects**: Subtle hover states for web platforms

## 📐 Layout Constraints

- **Image Ratios**: 16:9 aspect ratio constraints for consistent layout
- **Responsive Design**: Adapts to different screen sizes
- **Grid System**: Intelligent grid layouts based on image count
- **Spacing**: Consistent spacing using design system tokens

## 🚀 Future Enhancements

- **Video Support**: Extend media gallery for video content
- **Advanced Interactions**: Long press menus, swipe actions
- **Custom Themes**: Additional theme variations
- **Performance Monitoring**: Analytics and performance metrics
- **Accessibility**: Enhanced screen reader support

## 📚 Dependencies

- `expo-image` for optimized image rendering
- `expo-image-picker` for media selection
- `react-native-reanimated` for smooth animations
- Existing icon system and design tokens

This implementation provides a production-ready, performant, and accessible feed experience that matches the exact design specifications while maintaining code quality and maintainability.