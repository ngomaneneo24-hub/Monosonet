# 👻 Ghost Reply Feature - Complete Implementation

## Overview

The Ghost Reply feature allows users to post anonymous comments using custom ghost avatars and ephemeral IDs. This creates a safe space for users to express opinions without social consequences while maintaining conversation readability.

## 🚀 Features Implemented

### Core Functionality
- **Ghost Mode Toggle**: Click ghost icon to activate/deactivate anonymous mode
- **Custom Ghost Avatars**: 12 unique ghost designs for variety
- **Ephemeral IDs**: "Ghost #7A3F" format for thread distinction
- **Thread Persistence**: Same avatar, new ID per thread
- **Hybrid Media Picker**: Single interface for images + videos

### User Experience
- **Visual Feedback**: Gray → Blue icon transitions
- **Ghost Mode Banner**: Clear activation indicator
- **Smart Avatar Selection**: Random ghost assignment per thread
- **Seamless Integration**: Works alongside regular replies

### Management & Moderation
- **Ghost Reply Manager**: Moderators can view and delete ghost replies
- **Content Filtering**: Ghost replies subject to same rules as regular content
- **Statistics Tracking**: Anonymous usage analytics
- **User Preferences**: Customizable ghost mode settings

## 🏗️ Architecture

### Frontend Components
```
src/components/
├── GhostAvatar.tsx          # Ghost avatar display component
├── GhostReply.tsx           # Individual ghost reply display
├── GhostReplyList.tsx       # List of ghost replies in a thread
├── GhostReplyManager.tsx    # Moderation interface
├── GhostModePreferences.tsx # User settings and statistics
└── GhostReplyShowcase.tsx   # Complete feature demonstration
```

### State Management
```
src/state/queries/
└── ghost-replies.ts         # API integration and React Query hooks
```

### Composer Integration
```
src/view/com/composer/
├── Composer.tsx             # Main composer with ghost mode
└── photos/
    └── EnhancedSelectPhotoBtn.tsx  # Hybrid media picker
```

## 🔧 Technical Implementation

### Ghost Mode State
```typescript
interface GhostState {
  isGhostMode: boolean
  ghostAvatar: string
  ghostId: string
  threadId: string
}
```

### API Endpoints (Server-side required)
```typescript
// Create ghost reply
POST /api/ghost-reply
{
  content: string
  ghostAvatar: string
  ghostId: string
  threadId: string
}

// Get ghost replies for thread
GET /api/thread/:id/ghost-replies

// Delete ghost reply (moderation)
DELETE /api/ghost-reply/:id
```

### Database Schema (Server-side required)
```sql
CREATE TABLE ghost_replies (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  ghost_avatar VARCHAR(255) NOT NULL,
  ghost_id VARCHAR(10) NOT NULL,
  thread_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  -- No user_id field for anonymity
);
```

## 🎨 Design System

### Icon States
- **Inactive**: Subtle gray ghost icon
- **Active**: Glowing blue ghost icon with sparkles
- **Hover**: Ghost does "boo" animation
- **Transition**: Smooth fade between states

### Color Scheme
- **Primary**: Blue (#007AFF) for active ghost mode
- **Secondary**: Gray for inactive state
- **Accent**: Ghost-specific theming and effects

### Avatar System
- **12 Custom Ghosts**: Cute cartoon designs
- **Consistent Dimensions**: Same size as user avatars
- **Random Selection**: Fresh ghost per thread
- **Fallback Design**: Styled placeholder when images unavailable

## 📱 User Flow

### 1. Activating Ghost Mode
```
User clicks ghost icon → 
Ghost mode activates → 
Random avatar selected → 
Ephemeral ID generated → 
Visual feedback shown
```

### 2. Posting Ghost Reply
```
User types reply → 
Ghost mode active → 
Content + ghost data sent → 
Server creates anonymous reply → 
Ghost mode deactivates
```

### 3. Viewing Ghost Replies
```
Thread loads → 
Ghost replies fetched → 
Custom avatars displayed → 
Ephemeral IDs shown → 
Ghost indicators visible
```

## 🛡️ Privacy & Security

### Anonymity Features
- **No User Tracking**: Ghost replies completely anonymous
- **Ephemeral IDs**: Change per thread, no cross-thread correlation
- **Avatar Randomization**: Fresh ghost identity each thread
- **Server Isolation**: Ghost data separate from user accounts

### Moderation Capabilities
- **Content Filtering**: Same rules apply to ghost replies
- **Reply Management**: Moderators can delete inappropriate content
- **Rate Limiting**: Prevents spam and abuse
- **Audit Trail**: Server-side logging for compliance

## 🚀 Getting Started

### 1. Upload Ghost Avatars
Place your 12 ghost JPG images in:
```
sonet-client/src/assets/ghosts/
├── ghost-1.jpg
├── ghost-2.jpg
├── ghost-3.jpg
├── ghost-4.jpg
├── ghost-5.jpg
├── ghost-6.jpg
├── ghost-7.jpg
├── ghost-8.jpg
├── ghost-9.jpg
├── ghost-10.jpg
├── ghost-11.jpg
└── ghost-12.jpg
```

### 2. Test Ghost Mode
- Open composer in any thread
- Click ghost icon to activate
- See ghost mode banner with ephemeral ID
- Post reply anonymously
- View ghost reply in thread

### 3. Explore Features
- Use `GhostReplyShowcase` component to see all features
- Test moderation tools with `GhostReplyManager`
- Customize preferences with `GhostModePreferences`
- View ghost replies with `GhostReplyList`

## 🔮 Future Enhancements

### Planned Features
- **Ghost Achievements**: Badges for frequent ghost users
- **Ghost Themes**: Special styling during holidays
- **Ghost Analytics**: Anonymous usage insights
- **Ghost Communities**: Anonymous discussion groups

### Technical Improvements
- **Image Optimization**: WebP support and lazy loading
- **Caching Strategy**: Ghost avatar and reply caching
- **Performance**: Optimized ghost reply rendering
- **Accessibility**: Enhanced screen reader support

## 🐛 Troubleshooting

### Common Issues
1. **Ghost avatars not showing**: Check image paths and file permissions
2. **Ghost mode not activating**: Verify state management and event handlers
3. **API errors**: Ensure server-side endpoints are implemented
4. **Styling issues**: Check theme integration and CSS classes

### Debug Mode
Enable debug logging for ghost mode:
```typescript
// In Composer.tsx
if (isGhostMode) {
  logger.info(`Ghost mode active: ${ghostId} with avatar ${ghostAvatar}`)
}
```

## 📚 API Reference

### React Query Hooks
```typescript
// Create ghost reply
const createGhostReply = useCreateGhostReply()

// Get ghost replies for thread
const {data: ghostReplies} = useGhostReplies(threadId)

// Delete ghost reply (moderation)
const deleteGhostReply = useDeleteGhostReply()
```

### Component Props
```typescript
// GhostReply component
interface GhostReplyProps {
  content: string
  ghostAvatar: string
  ghostId: string
  timestamp: Date
  style?: any
}

// GhostReplyList component
interface GhostReplyListProps {
  threadId: string
  style?: any
}
```

## 🤝 Contributing

### Development Guidelines
1. **Ghost Mode First**: Always consider privacy implications
2. **Consistent Styling**: Use established design system
3. **Performance**: Optimize for smooth ghost animations
4. **Testing**: Test with various ghost avatar combinations

### Code Style
- Use TypeScript for all ghost-related code
- Follow existing component patterns
- Include proper error handling
- Add comprehensive JSDoc comments

## 📄 License

This ghost reply feature is part of the Sonet client application. Please refer to the main project license for usage terms.

---

**👻 Happy Ghosting!** 

The ghost reply feature is now fully implemented and ready for your custom ghost avatars. Upload those cute ghost images and watch the magic happen! ✨