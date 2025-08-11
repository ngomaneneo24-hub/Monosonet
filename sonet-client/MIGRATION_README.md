# 🚀 Migration Guide: AT Protocol to Sonet Messaging

This guide will help you migrate your messaging infrastructure from AT Protocol to Sonet with full E2E encryption support.

## 🎯 What's New

- **End-to-End Encryption**: Military-grade AES-256-GCM encryption with perfect forward secrecy
- **Real-time Communication**: WebSocket-based real-time messaging with automatic reconnection
- **Signal Protocol**: Advanced key exchange and session management
- **File Encryption**: Secure file attachments with encrypted storage
- **Performance**: Optimized caching and message delivery
- **Privacy**: Complete data sovereignty with your Sonet server

## 📋 Prerequisites

Before starting the migration:

1. **Sonet Server**: Ensure your Sonet server is running and accessible
2. **Backup**: Create a backup of your current configuration and data
3. **Dependencies**: Install required Node.js dependencies
4. **Environment**: Set up your development environment

## 🔧 Quick Migration

### Option 1: Automated Migration Script

```bash
# Make the script executable
chmod +x scripts/migrate-to-sonet.js

# Run the migration
node scripts/migrate-to-sonet.js
```

The script will:
- ✅ Check prerequisites
- 💾 Create backups
- ⚙️ Update configuration
- 📦 Update dependencies
- 🎯 Finalize migration

### Option 2: Manual Migration

#### Step 1: Update Environment Configuration

Copy the template and update your values:

```bash
cp .env.sonet.template .env.local
```

Update the following in `.env.local`:

```env
# Enable Sonet messaging
EXPO_PUBLIC_USE_SONET_MESSAGING=true
EXPO_PUBLIC_USE_SONET_E2E_ENCRYPTION=true
EXPO_PUBLIC_USE_SONET_REALTIME=true

# Sonet server endpoints
EXPO_PUBLIC_SONET_API_BASE=http://localhost:8080/api
EXPO_PUBLIC_SONET_WS_BASE=ws://localhost:8080
```

#### Step 2: Install Dependencies

```bash
npm install nanoid events
```

#### Step 3: Remove AT Protocol Dependencies

```bash
npm uninstall @atproto/api @atproto/common @atproto/dev-env @atproto/bsky
```

## 🏗️ Architecture Overview

### New Components

```
sonet-client/src/services/
├── sonetWebSocket.ts      # Real-time WebSocket communication
├── sonetCrypto.ts         # E2E encryption engine
└── sonetMessagingApi.ts   # Enhanced messaging API
```

### Key Features

- **WebSocket Service**: Handles real-time communication with automatic reconnection
- **Crypto Engine**: Implements Signal Protocol-like encryption with key rotation
- **Messaging API**: Unified interface for all messaging operations
- **Hybrid Provider**: Seamless transition between AT Protocol and Sonet

## 🔐 E2E Encryption Details

### Encryption Flow

1. **Key Generation**: ECDH key pairs for each user
2. **Key Exchange**: Secure key exchange during chat creation
3. **Session Keys**: Ephemeral session keys for perfect forward secrecy
4. **Message Encryption**: AES-256-GCM with authenticated encryption
5. **Key Rotation**: Automatic key rotation every 24 hours

### Security Features

- **Perfect Forward Secrecy**: Session keys are ephemeral
- **Authenticated Encryption**: Prevents tampering and ensures integrity
- **Key Verification**: Cryptographic verification of key exchange
- **Secure Storage**: Keys never leave the client device

## 📱 Client Integration

### Using the New API

```typescript
import { sonetMessagingApi } from '#/services/sonetMessagingApi'

// Authenticate with your Sonet server
await sonetMessagingApi.authenticate(authToken)

// Send encrypted message
const message = await sonetMessagingApi.sendMessage({
  chatId: 'chat_123',
  content: 'Hello, encrypted world!',
  encrypt: true
})

// Listen for real-time updates
sonetMessagingApi.on('message_received', (message) => {
  console.log('New encrypted message:', message)
})
```

### WebSocket Events

```typescript
import { sonetWebSocket } from '#/services/sonetWebSocket'

// Connection events
sonetWebSocket.on('connected', () => console.log('Connected'))
sonetWebSocket.on('disconnected', () => console.log('Disconnected'))
sonetWebSocket.on('reconnecting', (attempt) => console.log(`Reconnecting... ${attempt}`))

// Message events
sonetWebSocket.on('message', (message) => console.log('Message received'))
sonetWebSocket.on('typing', (typing) => console.log('User typing'))
sonetWebSocket.on('read_receipt', (receipt) => console.log('Message read'))
```

## 🧪 Testing

### Test E2E Encryption

1. **Create Encrypted Chat**:
   ```typescript
   const chat = await sonetMessagingApi.createChat({
     type: 'direct',
     participantIds: ['user_123'],
     isEncrypted: true
   })
   ```

2. **Send Encrypted Message**:
   ```typescript
   const message = await sonetMessagingApi.sendMessage({
     chatId: chat.id,
     content: 'Secret message',
     encrypt: true
   })
   ```

3. **Verify Encryption**:
   - Check that message content is encrypted in transit
   - Verify decryption works on recipient side
   - Confirm key rotation after 24 hours

### Test Real-time Features

1. **WebSocket Connection**:
   ```typescript
   console.log('Connection state:', sonetWebSocket.getConnectionState())
   console.log('Is connected:', sonetWebSocket.isConnected())
   ```

2. **Typing Indicators**:
   ```typescript
   sonetMessagingApi.sendTyping(chatId, true)
   // Should trigger typing event on other clients
   ```

3. **Read Receipts**:
   ```typescript
   sonetMessagingApi.sendReadReceipt(messageId)
   // Should trigger read_receipt event
   ```

## 🚨 Troubleshooting

### Common Issues

#### WebSocket Connection Failed

```bash
# Check if Sonet server is running
curl http://localhost:8080/health

# Verify WebSocket endpoint
wscat -c ws://localhost:8080/messaging/ws
```

#### Encryption Errors

```typescript
// Check crypto initialization
const keyPair = await sonetCrypto.getOrCreateKeyPair()
console.log('Key pair created:', !!keyPair)

// Verify session keys
const sessionKey = await sonetCrypto.getSessionKey(chatId)
console.log('Session key available:', !!sessionKey)
```

#### Message Delivery Issues

```typescript
// Check message cache
const cachedMessages = sonetMessagingApi.getCachedMessages(chatId)
console.log('Cached messages:', cachedMessages?.length || 0)

// Verify API connection
console.log('API authenticated:', sonetMessagingApi.isWebSocketConnected())
```

### Debug Mode

Enable debug logging in `.env.local`:

```env
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_CRYPTO_DEBUG=true
EXPO_PUBLIC_WEBSOCKET_DEBUG=true
```

## 🔄 Rollback

If you need to rollback to AT Protocol:

1. **Restore Configuration**:
   ```bash
   # Restore from backup
   cp backups/pre-migration-*/package.json ./
   cp backups/pre-migration-*/.env.local ./
   ```

2. **Reinstall Dependencies**:
   ```bash
   npm install @atproto/api @atproto/common @atproto/dev-env @atproto/bsky
   ```

3. **Update Environment**:
   ```env
   EXPO_PUBLIC_USE_SONET_MESSAGING=false
   ```

## 📊 Performance Monitoring

### Metrics to Track

- **Message Delivery Time**: Should be < 100ms for local server
- **Encryption Overhead**: Should be < 10ms per message
- **WebSocket Reconnection**: Should reconnect in < 5 seconds
- **Memory Usage**: Should be stable with message caching

### Monitoring Tools

```typescript
// Connection health
setInterval(() => {
  const state = sonetWebSocket.getConnectionState()
  const reconnectAttempts = sonetWebSocket.getReconnectAttempts()
  console.log(`Health: ${state}, Reconnects: ${reconnectAttempts}`)
}, 30000)

// Crypto performance
const start = performance.now()
await sonetCrypto.encryptMessage(content, chatId, publicKey)
const duration = performance.now() - start
console.log(`Encryption took: ${duration.toFixed(2)}ms`)
```

## 🚀 Production Deployment

### Environment Configuration

```env
# Production settings
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_SONET_API_BASE=https://your-sonet-server.com/api
EXPO_PUBLIC_SONET_WS_BASE=wss://your-sonet-server.com
EXPO_PUBLIC_LOG_LEVEL=warn
```

### Security Checklist

- [ ] HTTPS/WSS endpoints configured
- [ ] SSL certificates valid and trusted
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Monitoring and alerting set up
- [ ] Backup and recovery procedures tested

## 📚 Additional Resources

- [Sonet Server Documentation](../sonet/README.md)
- [E2E Encryption Details](../sonet/src/services/messaging_service/MILITARY_GRADE_E2EE.md)
- [API Reference](../sonet/src/services/messaging_service/api/)
- [Crypto Implementation](../sonet/src/services/messaging_service/crypto/)

## 🤝 Support

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Review the migration logs in `migration.log`
3. Check Sonet server logs for errors
4. Open an issue with detailed error information

---

**Happy Migrating! 🎉**

Your messages are now protected with military-grade encryption and delivered in real-time through your own Sonet server.