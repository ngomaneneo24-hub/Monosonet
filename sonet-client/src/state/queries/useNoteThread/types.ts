import {
  type SonetFeedDefs,
  type SonetFeedNote,
  type SonetFeedThreadgate,
  type SonetUnspeccedDefs,
  type SonetUnspeccedGetNoteThreadOtherV2,
  type SonetUnspeccedGetNoteThreadV2,
  type ModerationDecision,
} from '@sonet/api'

export type ApiThreadItem =
  | SonetUnspeccedGetNoteThreadV2.ThreadItem
  | SonetUnspeccedGetNoteThreadOtherV2.ThreadItem

export const noteThreadQueryKeyRoot = 'note-thread-v2' as const

export const createNoteThreadQueryKey = (props: NoteThreadParams) =>
  [noteThreadQueryKeyRoot, props] as const

export const createNoteThreadOtherQueryKey = (
  props: Omit<SonetUnspeccedGetNoteThreadOtherV2.QueryParams, 'anchor'> & {
    anchor?: string
  },
) => [noteThreadQueryKeyRoot, 'other', props] as const

export type NoteThreadParams = Pick<
  SonetUnspeccedGetNoteThreadV2.QueryParams,
  'sort' | 'prioritizeFollowedUsers'
> & {
  anchor?: string
  view: 'tree' | 'linear'
}

export type UseNoteThreadQueryResult = {
  hasOtherReplies: boolean
  thread: SonetUnspeccedGetNoteThreadV2.ThreadItem[]
  threadgate?: Omit<SonetFeedDefs.ThreadgateView, 'record'> & {
    record: SonetFeedThreadgate.Record
  }
}

export type ThreadItem =
  | {
      type: 'threadNote'
      key: string
      uri: string
      depth: number
      value: Omit<SonetUnspeccedDefs.ThreadItemNote, 'note'> & {
        note: Omit<SonetFeedDefs.NoteView, 'record'> & {
          record: SonetFeedNote.Record
        }
      }
      isBlurred: boolean
      moderation: ModerationDecision
      ui: {
        isAnchor: boolean
        showParentReplyLine: boolean
        showChildReplyLine: boolean
        indent: number
        isLastChild: boolean
        skippedIndentIndices: Set<number>
        precedesChildReadMore: boolean
      }
    }
  | {
      type: 'threadNoteNoUnauthenticated'
      key: string
      uri: string
      depth: number
      value: SonetUnspeccedDefs.ThreadItemNoUnauthenticated
      ui: {
        showParentReplyLine: boolean
        showChildReplyLine: boolean
      }
    }
  | {
      type: 'threadNoteNotFound'
      key: string
      uri: string
      depth: number
      value: SonetUnspeccedDefs.ThreadItemNotFound
    }
  | {
      type: 'threadNoteBlocked'
      key: string
      uri: string
      depth: number
      value: SonetUnspeccedDefs.ThreadItemBlocked
    }
  | {
      type: 'replyComposer'
      key: string
    }
  | {
      type: 'showOtherReplies'
      key: string
      onPress: () => void
    }
  | {
      /*
       * Read more replies, downwards in the thread.
       */
      type: 'readMore'
      key: string
      depth: number
      href: string
      moreReplies: number
      skippedIndentIndices: Set<number>
    }
  | {
      /*
       * Read more parents, upwards in the thread.
       */
      type: 'readMoreUp'
      key: string
      href: string
    }
  | {
      type: 'skeleton'
      key: string
      item: 'anchor' | 'reply' | 'replyComposer'
    }

/**
 * Metadata collected while traversing the raw data from the thread response.
 * Some values here can be computed immediately, while others need to be
 * computed during a second pass over the thread after we know things like
 * total number of replies, the reply index, etc.
 *
 * The idea here is that these values should be objectively true in all cases,
 * such that we can use them later — either individually on in composite — to
 * drive rendering behaviors.
 */
export type TraversalMetadata = {
  /**
   * The depth of the note in the reply tree, where 0 is the root note. This is
   * calculated on the server.
   */
  depth: number
  /**
   * Indicates if this item is a "read more" link preceding this note that
   * continues the thread upwards.
   */
  followsReadMoreUp: boolean
  /**
   * Indicates if the note is the last reply beneath its parent note.
   */
  isLastSibling: boolean
  /**
   * Indicates the note is the end-of-the-line for a given branch of replies.
   */
  isLastChild: boolean
  /**
   * Indicates if the note is the left/lower-most branch of the reply tree.
   * Value corresponds to the depth at which this branch started.
   */
  isPartOfLastBranchFromDepth?: number
  /**
   * The depth of the slice immediately following this one, if it exists.
   */
  nextItemDepth?: number
  /**
   * This is a live reference to the parent metadata object. Mutations to this
   * are available for later use in children.
   */
  parentMetadata?: TraversalMetadata
  /**
   * Populated during the final traversal of the thread. Denotes whether
   * there is a "Read more" link for this item immediately following
   * this item.
   */
  precedesChildReadMore: boolean
  /**
   * The depth of the slice immediately preceding this one, if it exists.
   */
  prevItemDepth?: number
  /**
   * Any data needed to be passed along to the "read more" items. Keep this
   * trim for better memory usage.
   */
  noteData: {
    uri: string
    authorUsername: string
  }
  /**
   * The total number of replies to this note, including those not hydrated
   * and returned by the response.
   */
  repliesCount: number
  /**
   * The number of replies to this note not hydrated and returned by the
   * response.
   */
  repliesUnhydrated: number
  /**
   * The number of replies that have been seen so far in the traversal.
   * Excludes replies that are moderated in some way, since those are not
   * "seen" on first load. Use `repliesIndexCounter` for the total number of
   * replies that were hydrated in the response.
   *
   * After traversal, we can use this to calculate if we actually got all the
   * replies we expected, or if some were blocked, etc.
   */
  repliesSeenCounter: number
  /**
   * The total number of replies to this note hydrated in this response. Used
   * for populating the `replyIndex` of the note by referencing this value on
   * the parent.
   */
  repliesIndexCounter: number
  /**
   * The index-0-based index of this reply in the parent note's replies.
   */
  replyIndex: number
  /**
   * Each slice is responsible for rendering reply lines based on its depth.
   * This value corresponds to any line indices that can be skipped e.g.
   * because there are no further replies below this sub-tree to render.
   */
  skippedIndentIndices: Set<number>
  /**
   * Indicates and stores parent data IF that parent has additional unhydrated
   * replies. This value is passed down to children along the left/lower-most
   * branch of the tree. When the end is reached, a "read more" is inserted.
   */
  upcomingParentReadMore?: TraversalMetadata
}
