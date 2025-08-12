import {
  type SonetActorDefs,
  SonetEmbedRecord,
  SonetEmbedRecordWithMedia,
  SonetFeedDefs,
  SonetFeedNote,
} from '@sonet/api'

import * as bsky from '#/types/bsky'
import {isNoteInLanguage} from '../../locale/helpers'
import {FALLBACK_MARKER_POST} from './feed/home'
import {type ReasonFeedSource} from './feed/types'

type FeedViewNote = SonetFeedDefs.FeedViewNote

export type FeedTunerFn = (
  tuner: FeedTuner,
  slices: FeedViewNotesSlice[],
  dryRun: boolean,
) => FeedViewNotesSlice[]

type FeedSliceItem = {
  note: SonetFeedDefs.NoteView
  record: SonetFeedNote.Record
  parentAuthor: SonetActorDefs.ProfileViewBasic | undefined
  isParentBlocked: boolean
  isParentNotFound: boolean
}

type AuthorContext = {
  author: SonetActorDefs.ProfileViewBasic
  parentAuthor: SonetActorDefs.ProfileViewBasic | undefined
  grandparentAuthor: SonetActorDefs.ProfileViewBasic | undefined
  rootAuthor: SonetActorDefs.ProfileViewBasic | undefined
}

export class FeedViewNotesSlice {
  _reactKey: string
  _feedNote: FeedViewNote
  items: FeedSliceItem[]
  isIncompleteThread: boolean
  isFallbackMarker: boolean
  isOrphan: boolean
  isThreadMuted: boolean
  rootUri: string
  feedNoteUri: string

  constructor(feedNote: FeedViewNote) {
    const {note, reply, reason} = feedNote
    this.items = []
    this.isIncompleteThread = false
    this.isFallbackMarker = false
    this.isOrphan = false
    this.isThreadMuted = note.viewer?.threadMuted ?? false
    this.feedNoteUri = note.uri
    if (SonetFeedDefs.isNoteView(reply?.root)) {
      this.rootUri = reply.root.uri
    } else {
      this.rootUri = note.uri
    }
    this._feedNote = feedNote
    this._reactKey = `slice-${note.uri}-${
      feedNote.reason && 'indexedAt' in feedNote.reason
        ? feedNote.reason.indexedAt
        : note.indexedAt
    }`
    if (feedNote.note.uri === FALLBACK_MARKER_POST.note.uri) {
      this.isFallbackMarker = true
      return
    }
    if (
      !SonetFeedNote.isRecord(note.record) ||
      !bsky.validate(note.record, SonetFeedNote.validateRecord)
    ) {
      return
    }
    const parent = reply?.parent
    const isParentBlocked = SonetFeedDefs.isBlockedNote(parent)
    const isParentNotFound = SonetFeedDefs.isNotFoundNote(parent)
    let parentAuthor: SonetActorDefs.ProfileViewBasic | undefined
    if (SonetFeedDefs.isNoteView(parent)) {
      parentAuthor = parent.author
    }
    this.items.push({
      note,
      record: note.record,
      parentAuthor,
      isParentBlocked,
      isParentNotFound,
    })
    if (!reply) {
      if (note.record.reply) {
        // This reply wasn't properly hydrated by the AppView.
        this.isOrphan = true
        this.items[0].isParentNotFound = true
      }
      return
    }
    if (reason) {
      return
    }
    if (
      !SonetFeedDefs.isNoteView(parent) ||
      !SonetFeedNote.isRecord(parent.record) ||
      !bsky.validate(parent.record, SonetFeedNote.validateRecord)
    ) {
      this.isOrphan = true
      return
    }
    const root = reply.root
    const rootIsView =
      SonetFeedDefs.isNoteView(root) ||
      SonetFeedDefs.isBlockedNote(root) ||
      SonetFeedDefs.isNotFoundNote(root)
    /*
     * If the parent is also the root, we just so happen to have the data we
     * need to compute if the parent's parent (grandparent) is blocked. This
     * doesn't always happen, of course, but we can take advantage of it when
     * it does.
     */
    const grandparent =
      rootIsView && parent.record.reply?.parent.uri === root.uri
        ? root
        : undefined
    const grandparentAuthor = reply.grandparentAuthor
    const isGrandparentBlocked = Boolean(
      grandparent && SonetFeedDefs.isBlockedNote(grandparent),
    )
    const isGrandparentNotFound = Boolean(
      grandparent && SonetFeedDefs.isNotFoundNote(grandparent),
    )
    this.items.unshift({
      note: parent,
      record: parent.record,
      parentAuthor: grandparentAuthor,
      isParentBlocked: isGrandparentBlocked,
      isParentNotFound: isGrandparentNotFound,
    })
    if (isGrandparentBlocked) {
      this.isOrphan = true
      // Keep going, it might still have a root, and we need this for thread
      // de-deduping
    }
    if (
      !SonetFeedDefs.isNoteView(root) ||
      !SonetFeedNote.isRecord(root.record) ||
      !bsky.validate(root.record, SonetFeedNote.validateRecord)
    ) {
      this.isOrphan = true
      return
    }
    if (root.uri === parent.uri) {
      return
    }
    this.items.unshift({
      note: root,
      record: root.record,
      isParentBlocked: false,
      isParentNotFound: false,
      parentAuthor: undefined,
    })
    if (parent.record.reply?.parent.uri !== root.uri) {
      this.isIncompleteThread = true
    }
  }

  get isQuoteNote() {
    const embed = this._feedNote.note.embed
    return (
      SonetEmbedRecord.isView(embed) ||
      SonetEmbedRecordWithMedia.isView(embed)
    )
  }

  get isReply() {
    return (
      SonetFeedNote.isRecord(this._feedNote.note.record) &&
      !!this._feedNote.note.record.reply
    )
  }

  get reason() {
    return '__source' in this._feedNote
      ? (this._feedNote.__source as ReasonFeedSource)
      : this._feedNote.reason
  }

  get feedContext() {
    return this._feedNote.feedContext
  }

  get reqId() {
    return this._feedNote.reqId
  }

  get isRenote() {
    const reason = this._feedNote.reason
    return SonetFeedDefs.isReasonRenote(reason)
  }

  get likeCount() {
    return this._feedNote.note.likeCount ?? 0
  }

  containsUri(uri: string) {
    return !!this.items.find(item => item.note.uri === uri)
  }

  getAuthors(): AuthorContext {
    const feedNote = this._feedNote
    let author: SonetActorDefs.ProfileViewBasic = feedNote.note.author
    let parentAuthor: SonetActorDefs.ProfileViewBasic | undefined
    let grandparentAuthor: SonetActorDefs.ProfileViewBasic | undefined
    let rootAuthor: SonetActorDefs.ProfileViewBasic | undefined
    if (feedNote.reply) {
      if (SonetFeedDefs.isNoteView(feedNote.reply.parent)) {
        parentAuthor = feedNote.reply.parent.author
      }
      if (feedNote.reply.grandparentAuthor) {
        grandparentAuthor = feedNote.reply.grandparentAuthor
      }
      if (SonetFeedDefs.isNoteView(feedNote.reply.root)) {
        rootAuthor = feedNote.reply.root.author
      }
    }
    return {
      author,
      parentAuthor,
      grandparentAuthor,
      rootAuthor,
    }
  }
}

export class FeedTuner {
  seenKeys: Set<string> = new Set()
  seenUris: Set<string> = new Set()
  seenRootUris: Set<string> = new Set()

  constructor(public tunerFns: FeedTunerFn[]) {}

  tune(
    feed: FeedViewNote[],
    {dryRun}: {dryRun: boolean} = {
      dryRun: false,
    },
  ): FeedViewNotesSlice[] {
    let slices: FeedViewNotesSlice[] = feed
      .map(item => new FeedViewNotesSlice(item))
      .filter(s => s.items.length > 0 || s.isFallbackMarker)

    // run the custom tuners
    for (const tunerFn of this.tunerFns) {
      slices = tunerFn(this, slices.slice(), dryRun)
    }

    slices = slices.filter(slice => {
      if (this.seenKeys.has(slice._reactKey)) {
        return false
      }
      // Some feeds, like Following, dedupe by thread, so you only see the most recent reply.
      // However, we don't want per-thread dedupe for author feeds (where we need to show every note)
      // or for feedgens (where we want to let the feed serve multiple replies if it chooses to).
      // To avoid showing the same context (root and/or parent) more than once, we do last resort
      // per-note deduplication. It hides already seen notes as long as this doesn't break the thread.
      for (let i = 0; i < slice.items.length; i++) {
        const item = slice.items[i]
        if (this.seenUris.has(item.note.uri)) {
          if (i === 0) {
            // Omit contiguous seen leading items.
            // For example, [A -> B -> C], [A -> D -> E], [A -> D -> F]
            // would turn into [A -> B -> C], [D -> E], [F].
            slice.items.splice(0, 1)
            i--
          }
          if (i === slice.items.length - 1) {
            // If the last item in the slice was already seen, omit the whole slice.
            // This means we'd miss its parents, but the user can "show more" to see them.
            // For example, [A ... E -> F], [A ... D -> E], [A ... C -> D], [A -> B -> C]
            // would get collapsed into [A ... E -> F], with B/C/D considered seen.
            return false
          }
        } else {
          if (!dryRun) {
            // Renoteing a reply elevates it to top-level, so its parent/root won't be displayed.
            // Disable in-thread dedupe for this case since we don't want to miss them later.
            const disableDedupe = slice.isReply && slice.isRenote
            if (!disableDedupe) {
              this.seenUris.add(item.note.uri)
            }
          }
        }
      }
      if (!dryRun) {
        this.seenKeys.add(slice._reactKey)
      }
      return true
    })

    return slices
  }

  static removeReplies(
    tuner: FeedTuner,
    slices: FeedViewNotesSlice[],
    _dryRun: boolean,
  ) {
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i]
      if (
        slice.isReply &&
        !slice.isRenote &&
        // This is not perfect but it's close as we can get to
        // detecting threads without having to peek ahead.
        !areSameAuthor(slice.getAuthors())
      ) {
        slices.splice(i, 1)
        i--
      }
    }
    return slices
  }

  static removeRenotes(
    tuner: FeedTuner,
    slices: FeedViewNotesSlice[],
    _dryRun: boolean,
  ) {
    for (let i = 0; i < slices.length; i++) {
      if (slices[i].isRenote) {
        slices.splice(i, 1)
        i--
      }
    }
    return slices
  }

  static removeQuoteNotes(
    tuner: FeedTuner,
    slices: FeedViewNotesSlice[],
    _dryRun: boolean,
  ) {
    for (let i = 0; i < slices.length; i++) {
      if (slices[i].isQuoteNote) {
        slices.splice(i, 1)
        i--
      }
    }
    return slices
  }

  static removeOrphans(
    tuner: FeedTuner,
    slices: FeedViewNotesSlice[],
    _dryRun: boolean,
  ) {
    for (let i = 0; i < slices.length; i++) {
      if (slices[i].isOrphan) {
        slices.splice(i, 1)
        i--
      }
    }
    return slices
  }

  static removeMutedThreads(
    tuner: FeedTuner,
    slices: FeedViewNotesSlice[],
    _dryRun: boolean,
  ) {
    for (let i = 0; i < slices.length; i++) {
      if (slices[i].isThreadMuted) {
        slices.splice(i, 1)
        i--
      }
    }
    return slices
  }

  static dedupThreads(
    tuner: FeedTuner,
    slices: FeedViewNotesSlice[],
    dryRun: boolean,
  ): FeedViewNotesSlice[] {
    for (let i = 0; i < slices.length; i++) {
      const rootUri = slices[i].rootUri
      if (!slices[i].isRenote && tuner.seenRootUris.has(rootUri)) {
        slices.splice(i, 1)
        i--
      } else {
        if (!dryRun) {
          tuner.seenRootUris.add(rootUri)
        }
      }
    }
    return slices
  }

  static followedRepliesOnly({userDid}: {userDid: string}) {
    return (
      tuner: FeedTuner,
      slices: FeedViewNotesSlice[],
      _dryRun: boolean,
    ): FeedViewNotesSlice[] => {
      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i]
        if (
          slice.isReply &&
          !slice.isRenote &&
          !shouldDisplayReplyInFollowing(slice.getAuthors(), userDid)
        ) {
          slices.splice(i, 1)
          i--
        }
      }
      return slices
    }
  }

  /**
   * This function filters a list of FeedViewNotesSlice items based on whether they contain text in a
   * preferred language.
   * @param {string[]} preferredLangsCode2 - An array of preferred language codes in ISO 639-1 or ISO 639-2 format.
   * @returns A function that takes in a `FeedTuner` and an array of `FeedViewNotesSlice` objects and
   * returns an array of `FeedViewNotesSlice` objects.
   */
  static preferredLangOnly(preferredLangsCode2: string[]) {
    return (
      tuner: FeedTuner,
      slices: FeedViewNotesSlice[],
      _dryRun: boolean,
    ): FeedViewNotesSlice[] => {
      // early return if no languages have been specified
      if (!preferredLangsCode2.length || preferredLangsCode2.length === 0) {
        return slices
      }

      const canuserIdateSlices = slices.filter(slice => {
        for (const item of slice.items) {
          if (isNoteInLanguage(item.note, preferredLangsCode2)) {
            return true
          }
        }
        // if item does not fit preferred language, remove it
        return false
      })

      // if the language filter cleared out the entire page, return the original set
      // so that something always shows
      if (canuserIdateSlices.length === 0) {
        return slices
      }

      return canuserIdateSlices
    }
  }
}

function areSameAuthor(authors: AuthorContext): boolean {
  const {author, parentAuthor, grandparentAuthor, rootAuthor} = authors
  const authorDid = author.userId
  if (parentAuthor && parentAuthor.userId !== authorDid) {
    return false
  }
  if (grandparentAuthor && grandparentAuthor.userId !== authorDid) {
    return false
  }
  if (rootAuthor && rootAuthor.userId !== authorDid) {
    return false
  }
  return true
}

function shouldDisplayReplyInFollowing(
  authors: AuthorContext,
  userDid: string,
): boolean {
  const {author, parentAuthor, grandparentAuthor, rootAuthor} = authors
  if (!isSelfOrFollowing(author, userDid)) {
    // Only show replies from self or people you follow.
    return false
  }
  if (
    (!parentAuthor || parentAuthor.userId === author.userId) &&
    (!rootAuthor || rootAuthor.userId === author.userId) &&
    (!grandparentAuthor || grandparentAuthor.userId === author.userId)
  ) {
    // Always show self-threads.
    return true
  }
  // From this point on we need at least one more reason to show it.
  if (
    parentAuthor &&
    parentAuthor.userId !== author.userId &&
    isSelfOrFollowing(parentAuthor, userDid)
  ) {
    return true
  }
  if (
    grandparentAuthor &&
    grandparentAuthor.userId !== author.userId &&
    isSelfOrFollowing(grandparentAuthor, userDid)
  ) {
    return true
  }
  if (
    rootAuthor &&
    rootAuthor.userId !== author.userId &&
    isSelfOrFollowing(rootAuthor, userDid)
  ) {
    return true
  }
  return false
}

function isSelfOrFollowing(
  profile: SonetActorDefs.ProfileViewBasic,
  userDid: string,
) {
  return Boolean(profile.userId === userDid || profile.viewer?.following)
}
