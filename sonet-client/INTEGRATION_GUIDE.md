# Sonet Messaging Phase 2 Integration Guide

## Overview
Phase 2 of the Sonet messaging system has been successfully integrated into the main app. This guide explains how to use the new features and navigate between the classic and new messaging systems.

## New Routes Added

### 1. SonetChats (`/sonet-chats`)
- **Purpose**: Main chats screen with WhatsApp-style interface
- **Features**: Search, filtering, conversation list
- **Navigation**: `navigation.navigate('SonetChats')`

### 2. SonetConversation (`/sonet-conversation/:conversationId`)
- **Purpose**: Individual conversation screen
- **Features**: Message display, input, search, encryption
- **Navigation**: `navigation.navigate('SonetConversation', {conversation: 'chat_id'})`

### 3. SonetGroupChat (`/sonet-group-chat/:groupId`)
- **Purpose**: Group chat management
- **Features**: Participant management, settings, encryption
- **Navigation**: `navigation.navigate('SonetGroupChat', {groupId: 'group_id'})`

### 4. SonetMessageSearch (`/sonet-message-search`)
- **Purpose**: Advanced message search
- **Features**: Content search, filters, time ranges
- **Navigation**: `navigation.navigate('SonetMessageSearch', {chatId: 'optional_chat_id'})`

## Integration Points

### 1. Messages Tab Navigation
The existing Messages tab now includes a toggle button to switch between:
- **Classic Messaging**: Original Bluesky messaging system
- **Sonet Messaging**: New encrypted messaging system

### 2. Navigation Toggle
In the Messages screen header, you'll find a toggle button:
- **Classic**: Uses existing `MessagesScreen`
- **Sonet**: Navigates to `SonetChatsScreen`

### 3. Migration Status
- **Classic Mode**: Shows standard migration status
- **Sonet Mode**: Shows enhanced Sonet migration status with encryption features

## How to Use

### Switching Between Systems
1. Navigate to the Messages tab
2. Look for the toggle button in the header
3. Click to switch between Classic and Sonet messaging

### Using Sonet Features
1. **Search**: Use the search bar to find conversations or messages
2. **Filters**: Use tabs to filter by conversation type
3. **Encryption**: Toggle encryption on/off in conversations
4. **File Attachments**: Send files with encryption support
5. **Group Management**: Manage group participants and settings

### Navigation Flow
```
Messages Tab → Toggle Button → SonetChats
                ↓
            SonetConversation → SonetMessageSearch
                ↓
            SonetGroupChat (for group chats)
```

## Component Architecture

### Core Components
- `SonetChatsScreen`: Main chats interface
- `SonetConversationScreen`: Individual conversation view
- `SonetMessageInput`: Enhanced message input with attachments
- `SonetFileAttachment`: File handling with encryption
- `SonetGroupChatManager`: Group chat management
- `SonetMessageSearch`: Advanced search functionality

### Integration Components
- `SonetMigrationStatus`: Migration status display
- `SonetChatListItem`: Individual chat preview
- `SonetMessageItem`: Message display with encryption status
- `SonetMessageEncryptionStatus`: Encryption indicators

## Testing

### Running Tests
```bash
npm test -- SonetChatsScreen.test.tsx
```

### Test Coverage
- Component rendering
- Navigation integration
- Search functionality
- Filter tabs
- Error states

## Troubleshooting

### Common Issues
1. **Navigation Errors**: Ensure all routes are properly defined in `Navigation.tsx`
2. **Component Imports**: Check that all Sonet components are properly imported
3. **Icon Issues**: Verify that all icons are imported from the correct paths
4. **Type Errors**: Ensure TypeScript interfaces are properly defined

### Debug Steps
1. Check console for navigation errors
2. Verify component imports in Navigation.tsx
3. Test individual components in isolation
4. Check route parameter passing

## Next Steps for Phase 3

With Phase 2 successfully integrated, Phase 3 can focus on:
1. **Real-time messaging** implementation
2. **Push notifications** system
3. **Offline support** and message queuing
4. **Advanced encryption** features
5. **Message reactions** and replies
6. **Voice and video** calling
7. **Message threading** and organization

## Support

For integration issues or questions:
1. Check the component test files
2. Review the navigation setup in `Navigation.tsx`
3. Verify route definitions in `types.ts`
4. Test individual components for errors

## Conclusion

Phase 2 is now fully integrated into the main app with:
- ✅ Complete navigation integration
- ✅ Toggle between classic and Sonet messaging
- ✅ All new components accessible via navigation
- ✅ Proper error handling and loading states
- ✅ Consistent design system compliance
- ✅ Accessibility support

The system is ready for Phase 3 development! 🚀