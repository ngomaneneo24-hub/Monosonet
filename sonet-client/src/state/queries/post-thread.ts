import {
  type SonetActorDefs,
  type SonetEmbedRecord,
  SonetFeedDefs,
  type SonetFeedGetNoteThread,
  SonetFeedNote,
  AtUri,
  moderateNote,
  type ModerationDecision,
  type ModerationOpts,
} from '@sonet/api'
import {type QueryClient, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  findAllNotesInQueryData as findAllNotesInExploreFeedPreviewsQueryData,
  findAllProfilesInQueryData as findAllProfilesInExploreFeedPreviewsQueryData,
} from '#/state/queries/explore-feed-previews'
import {findAllNotesInQueryData as findAllNotesInQuoteQueryData} from '#/state/queries/note-quotes'
import {type UsePreferencesQueryResponse} from '#/state/queries/preferences/types'
import {
  findAllNotesInQueryData as findAllNotesInSearchQueryData,
  findAllProfilesInQueryData as findAllProfilesInSearchQueryData,
} from '#/state/queries/search-notes'
import {useAgent} from '#/state/session'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'
import * as bsky from '#/types/bsky'
import {
  findAllNotesInQueryData as findAllNotesInNotifsQueryData,
  findAllProfilesInQueryData as findAllProfilesInNotifsQueryData,
} from './notifications/feed'
import {
  findAllNotesInQueryData as findAllNotesInFeedQueryData,
  findAllProfilesInQueryData as findAllProfilesInFeedQueryData,
} from './note-feed'
import {
  userIdOrUsernameUriMatches,
  embedViewRecordToNoteView,
  getEmbeddedNote,
} from './util'

const REPLY_TREE_DEPTH = 10
export const RQKEY_ROOT = 'note-thread'
export const RQKEY = (uri: string) => [RQKEY_ROOT, uri]
type ThreadViewNode = SonetFeedGetNoteThread.OutputSchema['thread']

export interface ThreadCtx {
  depth: number
  isHighlightedNote?: boolean
  hasMore?: boolean
  isParentLoading?: boolean
  isChildLoading?: boolean
  isSelfThread?: boolean
  hasMoreSelfThread?: boolean
}

export type ThreadNote = {
  type: 'note'
  _reactKey: string
  uri: string
  note: SonetFeedDefs.NoteView
  record: SonetFeedNote.Record
  parent: ThreadNode | undefined
  replies: ThreadNode[] | undefined
  hasOPLike: boolean | undefined
  ctx: ThreadCtx
}

export type ThreadNotFound = {
  type: 'not-found'
  _reactKey: string
  uri: string
  ctx: ThreadCtx
}

export type ThreadBlocked = {
  type: 'blocked'
  _reactKey: string
  uri: string
  ctx: ThreadCtx
}

export type ThreadUnknown = {
  type: 'unknown'
  uri: string
}

export type ThreadNode =
  | ThreadNote
  | ThreadNotFound
  | ThreadBlocked
  | ThreadUnknown

export type ThreadModerationCache = WeakMap<ThreadNode, ModerationDecision>

export type NoteThreadQueryData = {
  thread: ThreadNode
  threadgate?: SonetFeedDefs.ThreadgateView
}

export function useNoteThreadQuery(uri: string | undefined) {
  const queryClient = useQueryClient()
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  return useQuery<NoteThreadQueryData, Error>({
    gcTime: 0,
    queryKey: RQKEY(uri || ''),
    async queryFn() {
      // Sonet thread (MVP: only the main note and thread context if provided)
      if (sonetSession.hasSession && uri) {
        const idMatch = /sonet:\/\/note\/([^?#]+)/.exec(uri)
        if (idMatch) {
          const noteRes = await sonet.getApi().getNote(idMatch[1], {include_thread: true})
          const threadNode = mapSonetNoteToThread(noteRes?.note || noteRes)
          return {thread: threadNode}
        }
      }
      const res = await agent.getNoteThread({
        uri: uri!,
        depth: REPLY_TREE_DEPTH,
      })
      if (res.success) {
        const thread = responseToThreadNodes(res.data.thread)
        annotateSelfThread(thread)
        return {
          thread,
          threadgate: res.data.threadgate as
            | SonetFeedDefs.ThreadgateView
            | undefined,
        }
      }
      return {thread: {type: 'unknown', uri: uri!}}
    },
    enabled: !!uri,
    placeholderData: () => {
      if (!uri) return
      const note = findNoteInQueryData(queryClient, uri)
      if (note) {
        return {thread: note}
      }
      return undefined
    },
  })
}

export function fillThreadModerationCache(
  cache: ThreadModerationCache,
  node: ThreadNode,
  moderationOpts: ModerationOpts,
) {
  if (node.type === 'note') {
    cache.set(node, moderateNote(node.note, moderationOpts))
    if (node.parent) {
      fillThreadModerationCache(cache, node.parent, moderationOpts)
    }
    if (node.replies) {
      for (const reply of node.replies) {
        fillThreadModerationCache(cache, reply, moderationOpts)
      }
    }
  }
}

export function sortThread(
  node: ThreadNode,
  opts: UsePreferencesQueryResponse['threadViewPrefs'],
  modCache: ThreadModerationCache,
  currentDid: string | undefined,
  justNoteedUris: Set<string>,
  threadgateRecordHiddenReplies: Set<string>,
  fetchedAtCache: Map<string, number>,
  fetchedAt: number,
  randomCache: Map<string, number>,
): ThreadNode {
  if (node.type !== 'note') {
    return node
  }
  if (node.replies) {
    node.replies.sort((a: ThreadNode, b: ThreadNode) => {
      if (a.type !== 'note') {
        return 1
      }
      if (b.type !== 'note') {
        return -1
      }

      if (node.ctx.isHighlightedNote || opts.lab_treeViewEnabled) {
        const aIsJustNoteed =
          a.note.author.userId === currentDid && justNoteedUris.has(a.note.uri)
        const bIsJustNoteed =
          b.note.author.userId === currentDid && justNoteedUris.has(b.note.uri)
        if (aIsJustNoteed && bIsJustNoteed) {
          return a.note.indexedAt.localeCompare(b.note.indexedAt) // oldest
        } else if (aIsJustNoteed) {
          return -1 // reply while onscreen
        } else if (bIsJustNoteed) {
          return 1 // reply while onscreen
        }
      }

      const aIsByOp = a.note.author.userId === node.note?.author.userId
      const bIsByOp = b.note.author.userId === node.note?.author.userId
      if (aIsByOp && bIsByOp) {
        return a.note.indexedAt.localeCompare(b.note.indexedAt) // oldest
      } else if (aIsByOp) {
        return -1 // op's own reply
      } else if (bIsByOp) {
        return 1 // op's own reply
      }

      const aIsBySelf = a.note.author.userId === currentDid
      const bIsBySelf = b.note.author.userId === currentDid
      if (aIsBySelf && bIsBySelf) {
        return a.note.indexedAt.localeCompare(b.note.indexedAt) // oldest
      } else if (aIsBySelf) {
        return -1 // current account's reply
      } else if (bIsBySelf) {
        return 1 // current account's reply
      }

      const aHidden = threadgateRecordHiddenReplies.has(a.uri)
      const bHidden = threadgateRecordHiddenReplies.has(b.uri)
      if (aHidden && !aIsBySelf && !bHidden) {
        return 1
      } else if (bHidden && !bIsBySelf && !aHidden) {
        return -1
      }

      const aBlur = Boolean(modCache.get(a)?.ui('contentList').blur)
      const bBlur = Boolean(modCache.get(b)?.ui('contentList').blur)
      if (aBlur !== bBlur) {
        if (aBlur) {
          return 1
        }
        if (bBlur) {
          return -1
        }
      }

      const aPin = Boolean(a.record.text.trim() === '📌')
      const bPin = Boolean(b.record.text.trim() === '📌')
      if (aPin !== bPin) {
        if (aPin) {
          return 1
        }
        if (bPin) {
          return -1
        }
      }

      if (opts.prioritizeFollowedUsers) {
        const af = a.note.author.viewer?.following
        const bf = b.note.author.viewer?.following
        if (af && !bf) {
          return -1
        } else if (!af && bf) {
          return 1
        }
      }

      // Split items from different fetches into separate generations.
      let aFetchedAt = fetchedAtCache.get(a.uri)
      if (aFetchedAt === undefined) {
        fetchedAtCache.set(a.uri, fetchedAt)
        aFetchedAt = fetchedAt
      }
      let bFetchedAt = fetchedAtCache.get(b.uri)
      if (bFetchedAt === undefined) {
        fetchedAtCache.set(b.uri, fetchedAt)
        bFetchedAt = fetchedAt
      }

      if (aFetchedAt !== bFetchedAt) {
        return aFetchedAt - bFetchedAt // older fetches first
      } else if (opts.sort === 'hotness') {
        const aHotness = getHotness(a, aFetchedAt)
        const bHotness = getHotness(b, bFetchedAt /* same as aFetchedAt */)
        return bHotness - aHotness
      } else if (opts.sort === 'oldest') {
        return a.note.indexedAt.localeCompare(b.note.indexedAt)
      } else if (opts.sort === 'newest') {
        return b.note.indexedAt.localeCompare(a.note.indexedAt)
      } else if (opts.sort === 'most-likes') {
        if (a.note.likeCount === b.note.likeCount) {
          return b.note.indexedAt.localeCompare(a.note.indexedAt) // newest
        } else {
          return (b.note.likeCount || 0) - (a.note.likeCount || 0) // most likes
        }
      } else if (opts.sort === 'random') {
        let aRandomScore = randomCache.get(a.uri)
        if (aRandomScore === undefined) {
          aRandomScore = Math.random()
          randomCache.set(a.uri, aRandomScore)
        }
        let bRandomScore = randomCache.get(b.uri)
        if (bRandomScore === undefined) {
          bRandomScore = Math.random()
          randomCache.set(b.uri, bRandomScore)
        }
        // this is vaguely criminal but we can get away with it
        return aRandomScore - bRandomScore
      } else {
        return b.note.indexedAt.localeCompare(a.note.indexedAt)
      }
    })
    node.replies.forEach(reply =>
      sortThread(
        reply,
        opts,
        modCache,
        currentDid,
        justNoteedUris,
        threadgateRecordHiddenReplies,
        fetchedAtCache,
        fetchedAt,
        randomCache,
      ),
    )
  }
  return node
}

// internal methods
// =

// Inspired by https://join-lemmy.org/docs/contributors/07-ranking-algo.html
// We want to give recent comments a real chance (and not bury them deep below the fold)
// while also surfacing well-liked comments from the past. In the future, we can explore
// something more sophisticated, but we don't have much data on the client right now.
function getHotness(threadNote: ThreadNote, fetchedAt: number) {
  const {note, hasOPLike} = threadNote
  const hoursAgo = Math.max(
    0,
    (new Date(fetchedAt).getTime() - new Date(note.indexedAt).getTime()) /
      (1000 * 60 * 60),
  )
  const likeCount = note.likeCount ?? 0
  const likeOrder = Math.log(3 + likeCount) * (hasOPLike ? 1.45 : 1.0)
  const timePenaltyExponent = 1.5 + 1.5 / (1 + Math.log(1 + likeCount))
  const opLikeBoost = hasOPLike ? 0.8 : 1.0
  const timePenalty = Math.pow(hoursAgo + 2, timePenaltyExponent * opLikeBoost)
  return likeOrder / timePenalty
}

function responseToThreadNodes(
  node: ThreadViewNode,
  depth = 0,
  direction: 'up' | 'down' | 'start' = 'start',
): ThreadNode {
  if (
    SonetFeedDefs.isThreadViewNote(node) &&
    bsky.dangerousIsType<SonetFeedNote.Record>(
      node.note.record,
      SonetFeedNote.isRecord,
    )
  ) {
    const note = node.note
    // These should normally be present. They're missing only for
    // notes that were *just* created. Ideally, the backend would
    // know to return zeros. Fill them in manually to compensate.
    note.replyCount ??= 0
    note.likeCount ??= 0
    note.renoteCount ??= 0
    return {
      type: 'note',
      _reactKey: node.note.uri,
      uri: node.note.uri,
      note: note,
      record: node.note.record,
      parent:
        node.parent && direction !== 'down'
          ? responseToThreadNodes(node.parent, depth - 1, 'up')
          : undefined,
      replies:
        node.replies?.length && direction !== 'up'
          ? node.replies
              .map(reply => responseToThreadNodes(reply, depth + 1, 'down'))
              // do not show blocked notes in replies
              .filter(node => node.type !== 'blocked')
          : undefined,
      hasOPLike: Boolean(node?.threadContext?.rootAuthorLike),
      ctx: {
        depth,
        isHighlightedNote: depth === 0,
        hasMore:
          direction === 'down' && !node.replies?.length && !!note.replyCount,
        isSelfThread: false, // populated `annotateSelfThread`
        hasMoreSelfThread: false, // populated in `annotateSelfThread`
      },
    }
  } else if (SonetFeedDefs.isBlockedNote(node)) {
    return {type: 'blocked', _reactKey: node.uri, uri: node.uri, ctx: {depth}}
  } else if (SonetFeedDefs.isNotFoundNote(node)) {
    return {type: 'not-found', _reactKey: node.uri, uri: node.uri, ctx: {depth}}
  } else {
    return {type: 'unknown', uri: ''}
  }
}

function annotateSelfThread(thread: ThreadNode) {
  if (thread.type !== 'note') {
    return
  }
  const selfThreadNodes: ThreadNote[] = [thread]

  let parent: ThreadNode | undefined = thread.parent
  while (parent) {
    if (
      parent.type !== 'note' ||
      parent.note.author.userId !== thread.note.author.userId
    ) {
      // not a self-thread
      return
    }
    selfThreadNodes.unshift(parent)
    parent = parent.parent
  }

  let node = thread
  for (let i = 0; i < 10; i++) {
    const reply = node.replies?.find(
      r => r.type === 'note' && r.note.author.userId === thread.note.author.userId,
    )
    if (reply?.type !== 'note') {
      break
    }
    selfThreadNodes.push(reply)
    node = reply
  }

  if (selfThreadNodes.length > 1) {
    for (const selfThreadNode of selfThreadNodes) {
      selfThreadNode.ctx.isSelfThread = true
    }
    const last = selfThreadNodes[selfThreadNodes.length - 1]
    if (
      last &&
      last.ctx.depth === REPLY_TREE_DEPTH && // at the edge of the tree depth
      last.note.replyCount && // has replies
      !last.replies?.length // replies were not hydrated
    ) {
      last.ctx.hasMoreSelfThread = true
    }
  }
}

function findNoteInQueryData(
  queryClient: QueryClient,
  uri: string,
): ThreadNode | void {
  let partial
  for (let item of findAllNotesInQueryData(queryClient, uri)) {
    if (item.type === 'note') {
      // Currently, the backend doesn't send full note info in some cases
      // (for example, for quoted notes). We use missing `likeCount`
      // as a way to detect that. In the future, we should fix this on
      // the backend, which will let us always stop on the first result.
      const hasAllInfo = item.note.likeCount != null
      if (hasAllInfo) {
        return item
      } else {
        partial = item
        // Keep searching, we might still find a full note in the cache.
      }
    }
  }
  return partial
}

export function* findAllNotesInQueryData(
  queryClient: QueryClient,
  uri: string,
): Generator<ThreadNode, void> {
  const atUri = new AtUri(uri)

  const queryDatas = queryClient.getQueriesData<NoteThreadQueryData>({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData) {
      continue
    }
    const {thread} = queryData
    for (const item of traverseThread(thread)) {
      if (item.type === 'note' && userIdOrUsernameUriMatches(atUri, item.note)) {
        const placeholder = threadNodeToPlaceholderThread(item)
        if (placeholder) {
          yield placeholder
        }
      }
      const quotedNote =
        item.type === 'note' ? getEmbeddedNote(item.note.embed) : undefined
      if (quotedNote && userIdOrUsernameUriMatches(atUri, quotedNote)) {
        yield embedViewRecordToPlaceholderThread(quotedNote)
      }
    }
  }
  for (let note of findAllNotesInNotifsQueryData(queryClient, uri)) {
    // Check notifications first. If you have a note in notifications,
    // it's often due to a like or a renote, and we want to prioritize
    // a note object with >0 likes/renotes over a stale version with no
    // metrics in order to avoid a notification->note scroll jump.
    yield noteViewToPlaceholderThread(note)
  }
  for (let note of findAllNotesInFeedQueryData(queryClient, uri)) {
    yield noteViewToPlaceholderThread(note)
  }
  for (let note of findAllNotesInQuoteQueryData(queryClient, uri)) {
    yield noteViewToPlaceholderThread(note)
  }
  for (let note of findAllNotesInSearchQueryData(queryClient, uri)) {
    yield noteViewToPlaceholderThread(note)
  }
  for (let note of findAllNotesInExploreFeedPreviewsQueryData(
    queryClient,
    uri,
  )) {
    yield noteViewToPlaceholderThread(note)
  }
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileViewBasic, void> {
  const queryDatas = queryClient.getQueriesData<NoteThreadQueryData>({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData) {
      continue
    }
    const {thread} = queryData
    for (const item of traverseThread(thread)) {
      if (item.type === 'note' && item.note.author.userId === userId) {
        yield item.note.author
      }
      const quotedNote =
        item.type === 'note' ? getEmbeddedNote(item.note.embed) : undefined
      if (quotedNote?.author.userId === userId) {
        yield quotedNote?.author
      }
    }
  }
  for (let profile of findAllProfilesInFeedQueryData(queryClient, userId)) {
    yield profile
  }
  for (let profile of findAllProfilesInNotifsQueryData(queryClient, userId)) {
    yield profile
  }
  for (let profile of findAllProfilesInSearchQueryData(queryClient, userId)) {
    yield profile
  }
  for (let profile of findAllProfilesInExploreFeedPreviewsQueryData(
    queryClient,
    userId,
  )) {
    yield profile
  }
}

function* traverseThread(node: ThreadNode): Generator<ThreadNode, void> {
  if (node.type === 'note') {
    if (node.parent) {
      yield* traverseThread(node.parent)
    }
    yield node
    if (node.replies?.length) {
      for (const reply of node.replies) {
        yield* traverseThread(reply)
      }
    }
  }
}

function threadNodeToPlaceholderThread(
  node: ThreadNode,
): ThreadNode | undefined {
  if (node.type !== 'note') {
    return undefined
  }
  return {
    type: node.type,
    _reactKey: node._reactKey,
    uri: node.uri,
    note: node.note,
    record: node.record,
    parent: undefined,
    replies: undefined,
    hasOPLike: undefined,
    ctx: {
      depth: 0,
      isHighlightedNote: true,
      hasMore: false,
      isParentLoading: !!node.record.reply,
      isChildLoading: !!node.note.replyCount,
    },
  }
}

function noteViewToPlaceholderThread(
  note: SonetFeedDefs.NoteView,
): ThreadNode {
  return {
    type: 'note',
    _reactKey: note.uri,
    uri: note.uri,
    note: note,
    record: note.record as SonetFeedNote.Record, // validated in notifs
    parent: undefined,
    replies: undefined,
    hasOPLike: undefined,
    ctx: {
      depth: 0,
      isHighlightedNote: true,
      hasMore: false,
      isParentLoading: !!(note.record as SonetFeedNote.Record).reply,
      isChildLoading: true, // assume yes (show the spinner) just in case
    },
  }
}

function embedViewRecordToPlaceholderThread(
  record: SonetEmbedRecord.ViewRecord,
): ThreadNode {
  return {
    type: 'note',
    _reactKey: record.uri,
    uri: record.uri,
    note: embedViewRecordToNoteView(record),
    record: record.value as SonetFeedNote.Record, // validated in getEmbeddedNote
    parent: undefined,
    replies: undefined,
    hasOPLike: undefined,
    ctx: {
      depth: 0,
      isHighlightedNote: true,
      hasMore: false,
      isParentLoading: !!(record.value as SonetFeedNote.Record).reply,
      isChildLoading: true, // not available, so assume yes (to show the spinner)
    },
  }
}

function mapSonetNoteToThread(n: any): ThreadNode {
  const author = n?.author || {}
  const note: SonetFeedDefs.NoteView = {
    uri: `sonet://note/${n.id}`,
    cid: n.id,
    author: {
      userId: author.userId || author.id || 'sonet:user',
      username: author.username || 'user',
      displayName: author.display_name,
      avatar: author.avatar_url,
    } as any,
    record: {text: n.content || n.text || ''} as any,
    likeCount: n.like_count || 0,
    renoteCount: n.renote_count || n.renote_count || 0,
    replyCount: n.reply_count || 0,
    indexedAt: n.created_at || new Date().toISOString(),
  }
  const node: ThreadNote = {
    type: 'note',
    _reactKey: note.uri,
    uri: note.uri,
    note,
    record: note.record as SonetFeedNote.Record,
    parent: undefined,
    replies: undefined,
    hasOPLike: false,
    ctx: {depth: 0, isHighlightedNote: true},
  } as any
  return node
}
