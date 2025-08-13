# Sonet Client Refactor & AT Protocol Removal Plan

## Objective
Transition the existing rebranded `sonet-client` codebase from Bluesky/AT Protocol dependencies to a centralized Sonet backend (gRPC/REST + WebSocket) while retaining core social functionality (feed, noteing, interactions, profiles, search, notifications) and simplifying moderation & identity.

## Scope Summary
| Area | Current (AT Proto) | Target (Sonet) | Notes |
|------|--------------------|----------------|-------|
| Identity | DIDs (`did:plc:*`) | `user_id` (UUID/ULID) | Optional one-time import mapping |
| URIs | `at://` scheme | Plain IDs / REST paths | Translation shim in Phase 1 only |
| Collections | `app.bsky.feed.note`, `graph.*` | REST/gRPC resources (notes, follow) | Flatten hierarchy |
| Rich Text | Facets (mentions/links) | Simple extracted tokens | Regex parse client-side |
| Feeds | Generators & custom feeds | Timeline sources (following/recommended/trending) | Query param `source` |
| Moderation | Labeler DID + multi-label logic | Server flags + simple client gating | Provide unified flags |
| Noteing | Repo record ops (CreateRecord) | NOTE /notes | Unified endpoint |
| Reactions | Record-based like/renote | NOTE /notes/:id/react | `type` param |
| Realtime | Firehose/XRPC (if used) | WebSocket channel | JSON messages |
| Auth | Session agent + DID | JWT (access + refresh) | Local secure storage |
| Media | Blob endpoints | /media/upload (TBD) | Standard multipart |
| Lists/Starter Packs | graph.list / starterpack | Deferred | Optional Phase 3 |

## Phased Plan
### Phase 0: Scaffold
- Add `src/api/` module (auth, timeline, follow, search base files).
- Add `src/models/` (note, user, timeline, moderation, embed).
- Add environment config: `SONET_API_BASE`, `SONET_WS_URL`.

### Phase 1: Core Feed + Auth
- Implement `/auth/login`, `/auth/refresh` clients.
- Implement `/timeline` GET wrapper and replace first feed hook.
- Wrap legacy AT Proto calls behind adapter returning new `Note` shape.
- Introduce `Note` & `TimelineResponse` TS interfaces.
- ESLint rule to warn on new `@atproto/` imports.

### Phase 2: Noteing, Interactions, Realtime
- Endpoints: `NOTE /notes`, `NOTE /notes/:id/react`, `DELETE /notes/:id/react`.
- WebSocket client for timeline & notification deltas.
- Remove record mutation utilities & RichText facet builder.
- Introduce server-provided moderation flags.

### Phase 3: Profiles, Search, Notifications
- Endpoints: `/users/:id`, `PATCH /users/:id`, `/search`, `/notifications`.
- Replace profile & search AT Proto logic.
- Remove remaining `at://` parsing utilities.

### Phase 4: Cleanup & Hardening
- Delete legacy adapters.
- Remove `@atproto` packages from `package.json`.
- Add lint error (not just warn) for banned imports.
- Add tests ensuring no `app.bsky.` strings remain.

### Phase 5: Optional Enhancements
- Implement lists/collections alternative.
- Onboarding bundles (replacement for starter packs).
- Performance profile & caching review.

## Data Model (Target)
```ts
interface UserSummary {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  verified?: boolean;
  moderation?: ModerationFlags;
}

interface ModerationFlags {
  muted?: boolean;
  blocked?: boolean;
  nsfw?: boolean;
  spamSuspect?: boolean;
  reason?: string;
}

interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface NoteMetrics {
  likes: number;
  renotes: number;
  comments: number;
  views: number;
}

interface Note {
  id: string;
  author: UserSummary;
  content: string;
  mentions: string[];
  hashtags: string[];
  media?: MediaAsset[];
  metrics: NoteMetrics;
  createdAt: string;
  parentId?: string;
  threadRootId?: string;
  moderation?: ModerationFlags;
}

interface TimelineResponse {
  notes: Note[];
  nextCursor?: string;
  source: string; // following|recommended|trending|hybrid
  generatedAt: string;
  algorithmVersion?: string;
}
```

## Endpoint Contract Draft
| Method | Path | Purpose | Query/Body | Returns |
|--------|------|---------|------------|---------|
| NOTE | /auth/login | Login | { identifier, password } | { access_token, refresh_token, user } |
| NOTE | /auth/refresh | Refresh token | { refresh_token } | { access_token } |
| GET | /timeline | Fetch feed | source, cursor, limit | `TimelineResponse` |
| NOTE | /timeline/refresh | Force refresh | { source? } | `TimelineResponse` |
| NOTE | /notes | Create note | { content, reply_to?, media?, mentions?, hashtags? } | `Note` |
| GET | /notes/:id | Get note | - | `Note` |
| NOTE | /notes/:id/react | React | { type } | { success } |
| DELETE | /notes/:id/react | Remove reaction | type (query) | { success } |
| GET | /users/:id | Get profile | - | `UserSummary & { bio, followers, following }` |
| PATCH | /users/:id | Update profile | { displayName?, bio?, avatar? } | updated profile |
| NOTE | /follow | Follow user | { target_user_id } | { success } |
| DELETE | /follow/:target_user_id | Unfollow | - | { success } |
| GET | /search | Search | q, type=user|note, cursor | { results, nextCursor } |
| GET | /notifications | List notifications | cursor | { notifications, nextCursor } |
| WS | /realtime | Stream events | auth header | event messages |

## Realtime Message Types
```jsonc
// timeline.update
{ "type": "timeline.update", "user_id": "u123", "note_ids": ["n456","n789"] }
// notification.new
{ "type": "notification.new", "id": "notif123", "category": "mention" }
// connection.ack
{ "type": "connection.ack", "session_id": "abc" }
```

## Migration Mechanics
| Task | Tooling | Notes |
|------|---------|-------|
| Detect @atproto imports | ESLint custom rule | Phase 1 warn → Phase 4 error |
| Generate API clients | Lightweight hand-written wrappers initially | Optionally add OpenAPI later |
| Replace at:// URIs | Regex + adapter util | Provide `translateAtUri(atUri): { type, id }` during Phase 1–2 |
| Remove facet logic | Custom mention/hashtag extractor | Markdown safe fallback |
| Moderation flags | Server field mapping | Document reasoning codes |
| Reaction handlers | Unified `react(noteId,type)` | Replace multiple record ops |

## Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| Silent break in deep component using AT Proto type | TS alias types + progressive removal script |
| Cursor mismatch | Shared test vectors (JSON fixtures) for timeline pagination |
| Auth race conditions | Central request wrapper with refresh lock |
| Realtime duplication / missed events | Idempotent client merge (set by note_id) + gap detection on reconnect |

## Success Criteria
- No `@atproto` packages in `package.json` by Phase 4.
- All feeds load exclusively via `/timeline` endpoint.
- Noteing & reactions use Sonet endpoints end-to-end.
- All tests updated: zero references to `app.bsky.` outside `migration/` folder until removed.
- Realtime updates append or update feed within <250ms average (local).

## Immediate Implementation Steps
1. Create `src/api/` scaffolding (auth.ts, timeline.ts).
2. Add `src/models/note.ts` with interfaces above.
3. Add `src/utils/text.ts` for mention/hashtag extraction.
4. Implement `useTimelineQuery` that calls new API (feature flag: `SONET_FEED=1`).
5. Introduce ESLint rule to flag `@atproto/` imports.
6. Remove direct `@atproto/api` usage in one feed path and test.

## Decommission Timeline
| Phase | Removal Action |
|-------|----------------|
| 2 | Deprecation notice in adapter logs |
| 3 | Remove adapter exports (breaking) |
| 4 | Delete adapter files & tests |

## Directory Restructuring (Client)
```
sonet-client/src/
  api/
    auth.ts
    timeline.ts
    follow.ts
    search.ts
    notes.ts
  models/
    note.ts
    user.ts
    moderation.ts
  realtime/
    client.ts
  utils/
    text.ts
    http.ts
  state/
    timeline.ts
    session.ts
  migration/ (temporary)
    atproto_adapter.ts
```

## Appendix A: Regex Aids
- Find imports: `import .* from ['"]@atproto/` 
- Find at://: `at:\/\/[^\s'"`]+`
- Find bsky collection types: `app\.bsky\.[a-z0-9_.#]+`

## Appendix B: Mention & Hashtag Extraction
```ts
const MENTION_RE = /@([a-z0-9_\.\-]+)/gi;
const HASHTAG_RE = /#([\p{L}0-9_]{2,50})/giu;
```

---
Prepared for implementation. Approve to proceed with Phase 0–1 scaffolding.
