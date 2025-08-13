# AT Protocol to Sonet API Migration Guide

This guide outlines the migration from AT Protocol to Sonet backend APIs for Lists and Starterpacks functionality.

## Overview

The migration replaces AT Protocol's decentralized approach with a centralized Sonet backend, providing:
- Better performance and consistency
- Simplified client-server architecture
- Enhanced security and permissions
- Unified data management

## Architecture Changes

### Before (AT Protocol)
```
Client → AT Protocol → Multiple PDS instances → IPFS/Blockchain
```

### After (Sonet)
```
Client → Sonet Gateway → Go Microservices → postgresql
```

## API Endpoints

### Lists Service

#### AT Protocol Endpoints → Sonet Endpoints

| AT Protocol | Sonet | Description |
|-------------|-------|-------------|
| `app.bsky.graph.getList` | `GET /api/v1/lists/{listId}` | Get list details |
| `app.bsky.graph.list.create` | `NOTE /api/v1/lists` | Create new list |
| `app.bsky.graph.list.delete` | `DELETE /api/v1/lists/{listId}` | Delete list |
| `app.bsky.graph.listitem.add` | `NOTE /api/v1/lists/{listId}/members` | Add member to list |
| `app.bsky.graph.listitem.remove` | `DELETE /api/v1/lists/{listId}/members/{userId}` | Remove member from list |

#### New Sonet-Specific Endpoints
- `GET /api/v1/users/{userId}/lists` - Get user's lists
- `PUT /api/v1/lists/{listId}` - Update list metadata
- `GET /api/v1/lists/{listId}/members` - Get list members
- `GET /api/v1/lists/{listId}/members/{userId}/check` - Check if user is in list

### Starterpacks Service

#### AT Protocol Endpoints → Sonet Endpoints

| AT Protocol | Sonet | Description |
|-------------|-------|-------------|
| `app.bsky.graph.getStarterPack` | `GET /api/v1/starterpacks/{starterpackId}` | Get starterpack details |
| `app.bsky.graph.starterpack.create` | `NOTE /api/v1/starterpacks` | Create new starterpack |
| `app.bsky.graph.starterpack.delete` | `DELETE /api/v1/starterpacks/{starterpackId}` | Delete starterpack |

#### New Sonet-Specific Endpoints
- `GET /api/v1/users/{userId}/starterpacks` - Get user's starterpacks
- `PUT /api/v1/starterpacks/{starterpackId}` - Update starterpack
- `NOTE /api/v1/starterpacks/{starterpackId}/items` - Add item to starterpack
- `DELETE /api/v1/starterpacks/{starterpackId}/items/{itemId}` - Remove item from starterpack
- `GET /api/v1/starterpacks/{starterpackId}/items` - Get starterpack items
- `GET /api/v1/starterpacks/suggested` - Get suggested starterpacks

## Data Model Changes

### Lists

#### AT Protocol Model
```typescript
interface AppBskyGraphList {
  purpose: 'app.bsky.graph.defs#curatelist' | 'app.bsky.graph.defs#modlist'
  name: string
  description: string
  descriptionFacets?: Facet[]
  avatar?: BlobRef
  createdAt: string
}
```

#### Sonet Model
```typescript
interface SonetList {
  list_id: string
  owner_id: string
  name: string
  description: string
  is_public: boolean
  list_type: 'custom' | 'close_friends' | 'family' | 'work' | 'school'
  created_at: string
  updated_at: string
  member_count: number
}
```

### Starterpacks

#### AT Protocol Model
```typescript
interface AppBskyGraphStarterpack {
  name: string
  description: string
  descriptionFacets?: Facet[]
  list: string
  feeds: {uri: string}[]
  createdAt: string
}
```

#### Sonet Model
```typescript
interface SonetStarterpack {
  starterpack_id: string
  creator_id: string
  name: string
  description: string
  avatar_url: string
  is_public: boolean
  created_at: string
  updated_at: string
  item_count: number
}
```

## Client-Side Migration

### 1. Replace Query Files

Replace the existing query files with Sonet equivalents:

```bash
# Backup original files
mv src/state/queries/list.ts src/state/queries/list.ts.atproto
mv src/state/queries/starter-packs.ts src/state/queries/starter-packs.ts.atproto

# Use new Sonet files
cp src/state/queries/sonet-list.ts src/state/queries/list.ts
cp src/state/queries/sonet-starterpack.ts src/state/queries/starterpack.ts
```

### 2. Update Imports

Update component imports to use new query hooks:

```typescript
// Before
import {useListQuery, useListCreateMutation} from '#/state/queries/list'

// After
import {useListQuery, useCreateListMutation} from '#/state/queries/sonet-list'
```

### 3. Update Component Usage

#### Lists Component Example

```typescript
// Before (AT Protocol)
const {data: list} = useListQuery(uri)
const createList = useListCreateMutation()

const handleCreate = () => {
  createList.mutate({
    purpose: 'app.bsky.graph.defs#curatelist',
    name: 'My List',
    description: 'Description',
    descriptionFacets: [],
    avatar: null
  })
}

// After (Sonet)
const {data: list} = useListQuery(listId)
const createList = useCreateListMutation()

const handleCreate = () => {
  createList.mutate({
    name: 'My List',
    description: 'Description',
    is_public: true,
    list_type: 'custom'
  })
}
```

#### Starterpacks Component Example

```typescript
// Before (AT Protocol)
const {data: starterpack} = useStarterPackQuery({uri})
const createStarterpack = useCreateStarterPackMutation()

const handleCreate = () => {
  createStarterpack.mutate({
    name: 'My Starterpack',
    description: 'Description',
    profiles: [],
    feeds: []
  })
}

// After (Sonet)
const {data: starterpack} = useStarterpackQuery(starterpackId)
const createStarterpack = useCreateStarterpackMutation()

const handleCreate = () => {
  createStarterpack.mutate({
    name: 'My Starterpack',
    description: 'Description',
    is_public: true
  })
}
```

## Authentication

### JWT Token Usage

The Sonet APIs use JWT tokens for authentication. The client automatically includes the token:

```typescript
// Automatically handled by apiRequest function
const response = await fetch(`${API_BASE}/v1/lists`, {
  headers: {
    'Authorization': `Bearer ${currentAccount.accessJwt}`,
    'Content-Type': 'application/json'
  }
})
```

## Error Handling

### AT Protocol Errors
```typescript
// AT Protocol errors were often network-related or PDS-specific
catch (error) {
  if (error.message.includes('PDS')) {
    // Handle PDS-specific error
  }
}
```

### Sonet Errors
```typescript
// Sonet provides structured error responses
catch (error) {
  if (error.message.includes('permission denied')) {
    // Handle permission error
  } else if (error.message.includes('not found')) {
    // Handle not found error
  }
}
```

## Migration Steps

### Phase 1: Setup Infrastructure
1. Deploy Sonet services (Lists and Starterpacks)
2. Set up database schemas
3. Configure gateway routing
4. Test API endpoints

### Phase 2: Client Migration
1. Replace query files with Sonet equivalents
2. Update component imports and usage
3. Test functionality with new APIs
4. Remove AT Protocol dependencies

### Phase 3: Data Migration
1. Export existing AT Protocol data
2. Transform data to Sonet format
3. Import data into Sonet database
4. Verify data integrity

### Phase 4: Cleanup
1. Remove AT Protocol code
2. Update documentation
3. Monitor performance
4. Gather user feedback

## Testing

### API Testing
```bash
# Test Lists API
curl -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/v1/lists

# Test Starterpacks API
curl -H "Authorization: Bearer $JWT" \
  http://localhost:3000/api/v1/starterpacks
```

### Integration Testing
```typescript
// Test list creation
const response = await fetch('/api/v1/lists', {
  method: 'NOTE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test List',
    description: 'Test Description',
    is_public: true
  })
})
```

## Performance Benefits

### Before (AT Protocol)
- Multiple network hops to PDS instances
- IPFS/blockchain latency
- Complex synchronization
- Variable response times

### After (Sonet)
- Direct database queries
- Consistent response times
- Simplified caching
- Better error handling

## Security Improvements

### Permission Model
- Fine-grained access control
- User-based permissions
- Audit logging
- Rate limiting

### Data Protection
- Encrypted data at rest
- Secure API endpoints
- Input validation
- SQL injection prevention

## Monitoring and Observability

### Metrics to Track
- API response times
- Error rates
- User engagement
- Database performance

### Logging
- Request/response logs
- Error logs
- Performance metrics
- Security events

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Switch back to AT Protocol endpoints
2. **Data Recovery**: Restore from AT Protocol data
3. **Investigation**: Identify and fix issues
4. **Re-deployment**: Re-deploy with fixes

## Support

For migration support:
- Check the Sonet documentation
- Review API specifications
- Test in staging environment
- Monitor error logs

## Conclusion

The migration to Sonet APIs provides a more robust, performant, and maintainable solution for Lists and Starterpacks functionality. The centralized approach simplifies the architecture while providing better user experience and developer experience.