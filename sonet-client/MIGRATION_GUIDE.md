# Sonet Client Migration Guide: AT Protocol to Sonet Messaging

## Overview

This guide outlines the migration from AT Protocol messaging dependencies to Sonet's own messaging APIs with E2E encryption. The migration is designed to be incremental and maintain backward compatibility during the transition.

## Current State Analysis

### AT Protocol Dependencies in Messaging

1. **State Management**: `src/state/messages/convo/agent.ts` - Uses AT Protocol's `ChatBskyConvoDefs`
2. **Queries**: `src/state/queries/messages/` - All messaging queries use AT Protocol APIs
3. **Types**: Heavy reliance on `@atproto/api` types for messaging
4. **Real-time**: Uses AT Protocol firehose for real-time messaging
5. **Session**: Uses `BskyAgent` for authentication

### Sonet Infrastructure Available

1. **Messaging Service**: Complete C++ messaging service with E2E encryption
2. **Gateway API**: REST endpoints for messaging (`/v1/messages/*`)
3. **gRPC Integration**: Gateway connects to Sonet services
4. **Session Management**: Sonet authentication system in place

## Migration Strategy

### Phase 1: Create Sonet Messaging Layer ✅

**Files Created:**
- `src/services/sonetMessagingApi.ts` - Sonet messaging API client
- `src/state/messages/sonet/types.ts` - Sonet messaging types
- `src/state/messages/sonet/convo.tsx` - Sonet conversation provider
- `src/state/queries/messages/sonet/list-conversations.tsx` - Sonet messaging queries

**Key Features:**
- Complete API coverage for messaging operations
- E2E encryption support
- Real-time messaging capabilities
- Type-safe interfaces

### Phase 2: Create Adapter Layer ✅

**Files Created:**
- `src/state/messages/adapters/atproto-to-sonet.ts` - Type conversion adapters

**Key Features:**
- Convert between AT Protocol and Sonet types
- Backward compatibility during migration
- Bidirectional conversion support

### Phase 3: Implement Feature Flags ✅

**Files Modified:**
- `src/env/index.ts` - Added feature flags
- `.env.example` - Environment configuration

**Key Features:**
- `USE_SONET_MESSAGING` - Enable Sonet messaging APIs
- `USE_SONET_E2E_ENCRYPTION` - Enable E2E encryption
- `USE_SONET_REALTIME` - Enable real-time messaging

### Phase 4: Create Hybrid Providers ✅

**Files Created:**
- `src/state/messages/hybrid-provider.tsx` - Unified messaging provider
- `src/state/session/hybrid.tsx` - Unified session provider

**Key Features:**
- Seamless switching between AT Protocol and Sonet
- Unified interfaces for both implementations
- Feature flag-based routing

### Phase 5: Real-time Messaging Migration ✅

**Files Created:**
- `src/state/messages/sonet/realtime.ts` - Sonet WebSocket manager

**Key Features:**
- WebSocket-based real-time messaging
- Automatic reconnection with exponential backoff
- Heartbeat mechanism for connection health
- Event-driven architecture

### Phase 6: E2E Encryption Integration ✅

**Files Created:**
- `src/services/sonetE2E.ts` - Military-grade E2E encryption

**Key Features:**
- AES-256-GCM encryption with authenticated encryption
- X25519 key exchange for perfect forward secrecy
- ECDSA signatures for message integrity
- Quantum-resistant cryptographic modes

### Phase 7: Migration Status Components ✅

**Files Created:**
- `src/components/MigrationStatus.tsx` - Migration status display

**Key Features:**
- Visual migration progress indicator
- Feature flag status display
- Migration settings interface

### Phase 2: Create Adapter Layer

**Goal**: Create adapters that translate between AT Protocol and Sonet types

**Files to Create:**
```typescript
// src/state/messages/adapters/atproto-to-sonet.ts
export function convertAtprotoConvoToSonet(atprotoConvo: ChatBskyConvoDefs.ConvoView): SonetChat {
  // Convert AT Protocol conversation to Sonet chat
}

export function convertSonetChatToAtproto(sonetChat: SonetChat): ChatBskyConvoDefs.ConvoView {
  // Convert Sonet chat to AT Protocol conversation (for backward compatibility)
}

export function convertAtprotoMessageToSonet(atprotoMessage: ChatBskyConvoDefs.MessageView): SonetMessage {
  // Convert AT Protocol message to Sonet message
}

export function convertSonetMessageToAtproto(sonetMessage: SonetMessage): ChatBskyConvoDefs.MessageView {
  // Convert Sonet message to AT Protocol message (for backward compatibility)
}
```

### Phase 3: Implement Feature Flags

**Goal**: Enable gradual migration with feature flags

**Files to Modify:**
```typescript
// src/env/index.ts
export const USE_SONET_MESSAGING = process.env.EXPO_PUBLIC_USE_SONET_MESSAGING === 'true'

// src/state/messages/index.tsx
export function useMessagingProvider() {
  if (USE_SONET_MESSAGING) {
    return useSonetConvo()
  } else {
    return useConvo() // Existing AT Protocol implementation
  }
}
```

### Phase 4: Update UI Components

**Files to Update:**
1. `src/screens/Messages/ChatList.tsx`
2. `src/screens/Messages/Conversation.tsx`
3. `src/screens/Messages/Inbox.tsx`
4. `src/screens/Messages/components/`

**Migration Steps:**
1. Import both AT Protocol and Sonet types
2. Use feature flag to choose implementation
3. Update component logic to handle both data structures
4. Test thoroughly with both implementations

### Phase 5: Real-time Messaging Migration

**Current**: AT Protocol firehose
**Target**: Sonet WebSocket connections

**Implementation:**
```typescript
// src/state/messages/sonet/realtime.ts
export class SonetRealtimeManager {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  
  connect(chatId: string) {
    // Connect to Sonet WebSocket for real-time messaging
  }
  
  disconnect() {
    // Clean disconnect
  }
  
  sendTyping(isTyping: boolean) {
    // Send typing indicators
  }
}
```

### Phase 6: E2E Encryption Integration

**Goal**: Implement client-side E2E encryption

**Implementation:**
```typescript
// src/services/sonetE2E.ts
export class SonetE2EEncryption {
  private keyPair: CryptoKeyPair | null = null
  
  async generateKeyPair() {
    // Generate X25519 key pair
  }
  
  async encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<string> {
    // Encrypt message using AES-256-GCM
  }
  
  async decryptMessage(encryptedMessage: string, senderPublicKey: CryptoKey): Promise<string> {
    // Decrypt message
  }
}
```

### Phase 7: Session Management Migration

**Current**: `BskyAgent` for messaging
**Target**: Sonet session for messaging

**Implementation:**
```typescript
// src/state/session/hybrid.ts
export function useHybridSession() {
  const atprotoSession = useSession() // For non-messaging features
  const sonetSession = useSonetSession() // For messaging features
  
  return {
    // Combine both sessions as needed
    hasSession: atprotoSession.hasSession || sonetSession.hasSession,
    currentAccount: atprotoSession.currentAccount,
    // ... other session properties
  }
}
```

## Implementation Timeline

### Week 1-2: Foundation ✅
- ✅ Create Sonet messaging API layer
- ✅ Create Sonet messaging state management
- ✅ Create Sonet messaging queries
- ✅ Create adapter layer for type conversion
- ✅ Implement feature flags
- ✅ Create hybrid providers
- ✅ Implement real-time messaging
- ✅ Implement E2E encryption
- ✅ Create migration status components

### Week 3-4: UI Integration
- Implement feature flags
- Update messaging screens to support both implementations
- Add comprehensive testing

### Week 5-6: Real-time Features
- Implement Sonet WebSocket connections
- Migrate real-time messaging features
- Test real-time functionality

### Week 7-8: E2E Encryption
- Implement client-side E2E encryption
- Integrate with Sonet messaging service
- Security testing and validation

### Week 9-10: Session Migration
- Migrate session management for messaging
- Update authentication flows
- Comprehensive integration testing

### Week 11-12: Cleanup
- Remove AT Protocol messaging dependencies
- Clean up unused code
- Performance optimization
- Final testing and deployment

## Testing Strategy

### Unit Tests
- Test all adapter functions
- Test Sonet messaging API client
- Test state management logic

### Integration Tests
- Test messaging flows with both implementations
- Test real-time messaging
- Test E2E encryption

### E2E Tests
- Test complete messaging user journeys
- Test migration scenarios
- Test backward compatibility

## Rollback Plan

1. **Feature Flag**: Easy rollback by disabling `USE_SONET_MESSAGING`
2. **Database**: Sonet messaging data is separate from AT Protocol data
3. **API**: Both APIs remain available during transition
4. **Monitoring**: Comprehensive logging to detect issues early

## Success Metrics

1. **Performance**: Messaging latency < 100ms
2. **Security**: 100% E2E encryption coverage
3. **Reliability**: 99.9% uptime for messaging
4. **User Experience**: No degradation in messaging UX
5. **Migration**: 100% of users migrated to Sonet messaging

## Risk Mitigation

1. **Gradual Rollout**: Use feature flags for controlled migration
2. **Monitoring**: Comprehensive logging and alerting
3. **Testing**: Extensive testing at all levels
4. **Rollback**: Easy rollback mechanism
5. **Documentation**: Clear documentation for all changes

## Next Steps

1. Review and approve this migration plan
2. Set up development environment for Sonet messaging
3. Begin Phase 1 implementation
4. Set up monitoring and testing infrastructure
5. Create detailed implementation tickets

## Conclusion

This migration will provide:
- **True E2E encryption** for all messaging
- **Better performance** with dedicated messaging infrastructure
- **Full control** over messaging features and capabilities
- **Scalability** for future messaging enhancements
- **Security** with military-grade encryption

The incremental approach ensures minimal disruption while achieving the goal of removing AT Protocol dependencies from messaging.