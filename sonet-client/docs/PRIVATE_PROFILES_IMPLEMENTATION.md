# Private Profiles Implementation

## Overview

This document outlines the complete implementation of private profiles functionality in the Sonet client and server, following the existing design patterns and architecture.

## Features Implemented

### 1. Privacy Settings UI
- **Location**: `PrivacyAndSecuritySettings` screen
- **Component**: `PrivateProfileToggle`
- **Design**: Follows existing toggle pattern with lock icon
- **Functionality**: Toggle between public and private profile

### 2. Private Profile Follow Dialog
- **Component**: `PrivateProfileFollowDialog`
- **Design**: Follows existing `FollowDialog` patterns
- **Features**: 
  - Lock icon and explanatory text
  - Follow button with confirmation
  - Cancel option
  - Consistent with app design language

### 3. Enhanced Follow Button
- **Component**: `PrivateProfileFollowButton`
- **Features**:
  - Detects private profiles automatically
  - Shows private profile dialog for private accounts
  - Regular follow button for public accounts
  - Handles all follow states (follow/unfollow/follow back)

### 4. Server-Side API
- **Endpoints**:
  - `GET /api/v1/users/:userId/privacy` - Get privacy settings
  - `PUT /api/v1/users/:userId/privacy` - Update privacy settings
  - `GET /api/v1/users/:userId/profile` - Get profile with privacy check
- **Security**: JWT authentication and user authorization

## Architecture

### Client-Side Architecture

```
PrivacyAndSecuritySettings
├── PrivateProfileToggle
│   ├── usePrivateProfileQuery
│   └── useUpdatePrivateProfileMutation
│
ProfileCard/FollowButton
├── PrivateProfileFollowButton
│   ├── PrivateProfileFollowDialog
│   └── useProfileFollowMutationQueue
```

### Server-Side Architecture

```
Gateway (Express)
├── User Routes
│   ├── Privacy endpoints
│   └── Profile endpoints
│
User Service (C++)
├── Privacy methods
├── Profile methods
└── Database integration
```

## Components

### 1. PrivateProfileToggle

**Location**: `src/screens/Settings/components/PrivateProfileToggle.tsx`

**Features**:
- Toggle switch for private/public profile
- Real-time state updates
- Toast notifications for feedback
- Loading states
- Accessibility support

**Usage**:
```tsx
<SettingsList.Group>
  <SettingsList.ItemIcon icon={LockIcon} />
  <SettingsList.ItemText>
    <Trans>Private profile</Trans>
  </SettingsList.ItemText>
  <PrivateProfileToggle />
</SettingsList.Group>
```

### 2. PrivateProfileFollowDialog

**Location**: `src/components/PrivateProfileFollowDialog.tsx`

**Features**:
- Modal dialog with lock icon
- Explanatory text about private profiles
- Follow button with confirmation
- Cancel option
- Consistent with app design

**Usage**:
```tsx
<PrivateProfileFollowDialog
  profile={profile}
  onFollow={handleFollow}
/>
```

### 3. PrivateProfileFollowButton

**Location**: `src/components/PrivateProfileFollowButton.tsx`

**Features**:
- Automatic private profile detection
- Conditional dialog rendering
- All follow states handled
- Consistent with existing FollowButton

**Usage**:
```tsx
<PrivateProfileFollowButton
  profile={profile}
  logContext="ProfileCard"
  colorInverted={false}
  onFollow={handleFollow}
/>
```

## API Endpoints

### Get Privacy Settings
```http
GET /api/v1/users/:userId/privacy
Authorization: Bearer <jwt>
```

**Response**:
```json
{
  "ok": true,
  "is_private": false
}
```

### Update Privacy Settings
```http
PUT /api/v1/users/:userId/privacy
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "is_private": true
}
```

**Response**:
```json
{
  "ok": true,
  "is_private": true
}
```

### Get User Profile (with privacy check)
```http
GET /api/v1/users/:userId/profile
Authorization: Bearer <jwt>
```

**Response**:
```json
{
  "ok": true,
  "profile": {
    "user_id": "uuid",
    "username": "user",
    "display_name": "User",
    "bio": "Bio",
    "is_private": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## Query Hooks

### usePrivateProfileQuery
```tsx
const {data: isPrivate, isLoading} = usePrivateProfileQuery()
```

### useUpdatePrivateProfileMutation
```tsx
const updatePrivateProfile = useUpdatePrivateProfileMutation()

await updatePrivateProfile.mutateAsync({
  is_private: true
})
```

## Design Patterns

### 1. Settings Pattern
- Uses `SettingsList` components
- Consistent icon usage (`LockIcon`)
- Toggle component for boolean settings
- Toast notifications for feedback

### 2. Dialog Pattern
- Uses `Dialog.Outer` and `Dialog.Inner`
- Consistent button layout
- Explanatory text and icons
- Follows existing dialog designs

### 3. Follow Button Pattern
- Extends existing `FollowButton` functionality
- Conditional rendering based on profile state
- Consistent with app's follow patterns
- Handles all edge cases

### 4. API Pattern
- RESTful endpoints
- JWT authentication
- Consistent error handling
- User authorization checks

## Security Considerations

### 1. Authentication
- All endpoints require JWT authentication
- User can only access their own privacy settings
- Profile access respects privacy settings

### 2. Authorization
- Users can only update their own privacy settings
- Profile visibility respects privacy settings
- Follow requests handled appropriately

### 3. Data Protection
- Private profile data protected at API level
- Database queries respect privacy settings
- No unauthorized access to private content

## Integration Points

### 1. Profile System
- Integrates with existing profile components
- Respects privacy settings in all profile views
- Handles follow/unfollow appropriately

### 2. Follow System
- Works with existing follow functionality
- Private profiles require approval
- Follow requests handled properly

### 3. Settings System
- Integrates with privacy and security settings
- Consistent with existing settings patterns
- User preferences persisted

## Testing

### 1. Unit Tests
- Component rendering tests
- Hook functionality tests
- API endpoint tests

### 2. Integration Tests
- End-to-end workflow tests
- Privacy setting updates
- Follow request handling

### 3. User Experience Tests
- Dialog interactions
- Toggle functionality
- Error handling

## Future Enhancements

### 1. Advanced Privacy
- Selective content sharing
- Custom privacy levels
- Temporary privacy modes

### 2. Follow Request Management
- Follow request approval UI
- Bulk follow request handling
- Follow request notifications

### 3. Analytics
- Privacy setting usage analytics
- Follow request analytics
- User engagement metrics

## Migration Guide

### For Existing Components

1. **Replace FollowButton**:
```tsx
// Before
<ProfileCard.FollowButton profile={profile} />

// After
<PrivateProfileFollowButton profile={profile} logContext="ProfileCard" />
```

2. **Add Privacy Settings**:
```tsx
// Add to PrivacyAndSecuritySettings
<SettingsList.Group>
  <SettingsList.ItemIcon icon={LockIcon} />
  <SettingsList.ItemText>
    <Trans>Private profile</Trans>
  </SettingsList.ItemText>
  <PrivateProfileToggle />
</SettingsList.Group>
```

### For New Components

1. **Import Components**:
```tsx
import {PrivateProfileFollowButton} from '#/components/PrivateProfileFollowButton'
import {PrivateProfileToggle} from '#/screens/Settings/components/PrivateProfileToggle'
```

2. **Use Query Hooks**:
```tsx
import {usePrivateProfileQuery, useUpdatePrivateProfileMutation} from '#/state/queries/private-profile'
```

## Conclusion

The private profiles implementation provides a complete, secure, and user-friendly solution that integrates seamlessly with the existing Sonet architecture. The implementation follows established design patterns, maintains consistency with the app's design language, and provides a solid foundation for future privacy features.