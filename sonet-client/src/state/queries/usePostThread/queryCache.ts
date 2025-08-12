import {
  type $Typed,
  type SonetActorDefs,
  type SonetFeedDefs,
  SonetUnspeccedDefs,
  type SonetUnspeccedGetNoteThreadOtherV2,
  type SonetUnspeccedGetNoteThreadV2,
  AtUri,
} from '@sonet/api'
import {type QueryClient} from '@tanstack/react-query'

import {findAllNotesInQueryData as findAllNotesInExploreFeedPreviewsQueryData} from '#/state/queries/explore-feed-previews'
import {findAllNotesInQueryData as findAllNotesInNotifsQueryData} from '#/state/queries/notifications/feed'
import {findAllNotesInQueryData as findAllNotesInFeedQueryData} from '#/state/queries/note-feed'
import {findAllNotesInQueryData as findAllNotesInQuoteQueryData} from '#/state/queries/note-quotes'
import {findAllNotesInQueryData as findAllNotesInSearchQueryData} from '#/state/queries/search-notes'
import {getBranch} from '#/state/queries/useNoteThread/traversal'
import {
  type ApiThreadItem,
  type createNoteThreadOtherQueryKey,
  type createNoteThreadQueryKey,
  type NoteThreadParams,
  noteThreadQueryKeyRoot,
} from '#/state/queries/useNoteThread/types'
import {getRootNoteAtUri} from '#/state/queries/useNoteThread/utils'
import {noteViewToThreadPlaceholder} from '#/state/queries/useNoteThread/views'
import {userIdOrUsernameUriMatches, getEmbeddedNote} from '#/state/queries/util'
import {embedViewRecordToNoteView} from '#/state/queries/util'

export function createCacheMutator({
  queryClient,
  noteThreadQueryKey,
  noteThreadOtherQueryKey,
  params,
}: {
  queryClient: QueryClient
  noteThreadQueryKey: ReturnType<typeof createNoteThreadQueryKey>
  noteThreadOtherQueryKey: ReturnType<typeof createNoteThreadOtherQueryKey>
  params: Pick<NoteThreadParams, 'view'> & {below: number}
}) {
  return {
    insertReplies(
      parentUri: string,
      replies: SonetUnspeccedGetNoteThreadV2.ThreadItem[],
    ) {
      /*
       * Main thread query mutator.
       */
      queryClient.setQueryData<SonetUnspeccedGetNoteThreadV2.OutputSchema>(
        noteThreadQueryKey,
        data => {
          if (!data) return
          return {
            ...data,
            thread: mutator<SonetUnspeccedGetNoteThreadV2.ThreadItem>([
              ...data.thread,
            ]),
          }
        },
      )

      /*
       * Additional replies query mutator.
       */
      queryClient.setQueryData<SonetUnspeccedGetNoteThreadOtherV2.OutputSchema>(
        noteThreadOtherQueryKey,
        data => {
          if (!data) return
          return {
            ...data,
            thread: mutator<SonetUnspeccedGetNoteThreadOtherV2.ThreadItem>([
              ...data.thread,
            ]),
          }
        },
      )

      function mutator<T>(thread: ApiThreadItem[]): T[] {
        for (let i = 0; i < thread.length; i++) {
          const parent = thread[i]

          if (!SonetUnspeccedDefs.isThreadItemNote(parent.value)) continue
          if (parent.uri !== parentUri) continue

          /*
           * Update parent data
           */
          parent.value.note = {
            ...parent.value.note,
            replyCount: (parent.value.note.replyCount || 0) + 1,
          }

          const opDid = getRootNoteAtUri(parent.value.note)?.host
          const nextPreexistingItem = thread.at(i + 1)
          const isEndOfReplyChain =
            !nextPreexistingItem || nextPreexistingItem.depth <= parent.depth
          const isParentRoot = parent.depth === 0
          const isParentBelowRoot = parent.depth > 0
          const optimisticReply = replies.at(0)
          const opIsReplier = SonetUnspeccedDefs.isThreadItemNote(
            optimisticReply?.value,
          )
            ? opDid === optimisticReply.value.note.author.userId
            : false

          /*
           * Always insert replies if the following conditions are met. Max
           * depth checks are usernamed below.
           */
          const canAlwaysInsertReplies =
            isParentRoot ||
            (params.view === 'tree' && isParentBelowRoot) ||
            (params.view === 'linear' && isEndOfReplyChain)
          /*
           * Maybe insert replies if we're in linear view, the replier is the
           * OP, and certain conditions are met
           */
          const shouldReplaceWithOPReplies =
            params.view === 'linear' && opIsReplier && isParentBelowRoot

          if (canAlwaysInsertReplies || shouldReplaceWithOPReplies) {
            const branch = getBranch(thread, i, parent.depth)
            /*
             * OP insertions replace other replies _in linear view_.
             */
            const itemsToRemove = shouldReplaceWithOPReplies ? branch.length : 0
            const itemsToInsert = replies
              .map((r, ri) => {
                r.depth = parent.depth + 1 + ri
                return r
              })
              .filter(r => {
                // Filter out replies that are too deep for our UI
                return r.depth <= params.below
              })

            thread.splice(i + 1, itemsToRemove, ...itemsToInsert)
          }
        }

        return thread as T[]
      }
    },
    /**
     * Unused atm, note shadow does the trick, but it would be nice to clean up
     * the whole sub-tree on deletes.
     */
    deleteNote(note: SonetUnspeccedGetNoteThreadV2.ThreadItem) {
      queryClient.setQueryData<SonetUnspeccedGetNoteThreadV2.OutputSchema>(
        noteThreadQueryKey,
        queryData => {
          if (!queryData) return

          const thread = [...queryData.thread]

          for (let i = 0; i < thread.length; i++) {
            const existingNote = thread[i]
            if (!SonetUnspeccedDefs.isThreadItemNote(note.value)) continue

            if (existingNote.uri === note.uri) {
              const branch = getBranch(thread, i, existingNote.depth)
              thread.splice(branch.start, branch.length)
              break
            }
          }

          return {
            ...queryData,
            thread,
          }
        },
      )
    },
  }
}

export function getThreadPlaceholder(
  queryClient: QueryClient,
  uri: string,
): $Typed<SonetUnspeccedGetNoteThreadV2.ThreadItem> | void {
  let partial
  for (let item of getThreadPlaceholderCanuserIdates(queryClient, uri)) {
    /*
     * Currently, the backend doesn't send full note info in some cases (for
     * example, for quoted notes). We use missing `likeCount` as a way to
     * detect that. In the future, we should fix this on the backend, which
     * will let us always stop on the first result.
     *
     * TODO can we send in feeds and quotes?
     */
    const hasAllInfo = item.value.note.likeCount != null
    if (hasAllInfo) {
      return item
    } else {
      // Keep searching, we might still find a full note in the cache.
      partial = item
    }
  }
  return partial
}

export function* getThreadPlaceholderCanuserIdates(
  queryClient: QueryClient,
  uri: string,
): Generator<
  $Typed<
    Omit<SonetUnspeccedGetNoteThreadV2.ThreadItem, 'value'> & {
      value: $Typed<SonetUnspeccedDefs.ThreadItemNote>
    }
  >,
  void
> {
  /*
   * Check note thread queries first
   */
  for (const note of findAllNotesInQueryData(queryClient, uri)) {
    yield noteViewToThreadPlaceholder(note)
  }

  /*
   * Check notifications first. If you have a note in notifications, it's
   * often due to a like or a renote, and we want to prioritize a note object
   * with >0 likes/renotes over a stale version with no metrics in order to
   * avoid a notification->note scroll jump.
   */
  for (let note of findAllNotesInNotifsQueryData(queryClient, uri)) {
    yield noteViewToThreadPlaceholder(note)
  }
  for (let note of findAllNotesInFeedQueryData(queryClient, uri)) {
    yield noteViewToThreadPlaceholder(note)
  }
  for (let note of findAllNotesInQuoteQueryData(queryClient, uri)) {
    yield noteViewToThreadPlaceholder(note)
  }
  for (let note of findAllNotesInSearchQueryData(queryClient, uri)) {
    yield noteViewToThreadPlaceholder(note)
  }
  for (let note of findAllNotesInExploreFeedPreviewsQueryData(
    queryClient,
    uri,
  )) {
    yield noteViewToThreadPlaceholder(note)
  }
}

export function* findAllNotesInQueryData(
  queryClient: QueryClient,
  uri: string,
): Generator<SonetFeedDefs.NoteView, void> {
  const atUri = new AtUri(uri)
  const queryDatas =
    queryClient.getQueriesData<SonetUnspeccedGetNoteThreadV2.OutputSchema>({
      queryKey: [noteThreadQueryKeyRoot],
    })

  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData) continue

    const {thread} = queryData

    for (const item of thread) {
      if (SonetUnspeccedDefs.isThreadItemNote(item.value)) {
        if (userIdOrUsernameUriMatches(atUri, item.value.note)) {
          yield item.value.note
        }

        const qp = getEmbeddedNote(item.value.note.embed)
        if (qp && userIdOrUsernameUriMatches(atUri, qp)) {
          yield embedViewRecordToNoteView(qp)
        }
      }
    }
  }
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileViewBasic, void> {
  const queryDatas =
    queryClient.getQueriesData<SonetUnspeccedGetNoteThreadV2.OutputSchema>({
      queryKey: [noteThreadQueryKeyRoot],
    })

  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData) continue

    const {thread} = queryData

    for (const item of thread) {
      if (SonetUnspeccedDefs.isThreadItemNote(item.value)) {
        if (item.value.note.author.userId === userId) {
          yield item.value.note.author
        }

        const qp = getEmbeddedNote(item.value.note.embed)
        if (qp && qp.author.userId === userId) {
          yield qp.author
        }
      }
    }
  }
}
