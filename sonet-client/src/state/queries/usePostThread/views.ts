import {
  type $Typed,
  type SonetFeedDefs,
  type SonetFeedNote,
  type SonetUnspeccedDefs,
  type SonetUnspeccedGetNoteThreadV2,
  AtUri,
  moderateNote,
  type ModerationOpts,
} from '@sonet/api'

import {makeProfileLink} from '#/lib/routes/links'
import {
  type ApiThreadItem,
  type ThreadItem,
  type TraversalMetadata,
} from '#/state/queries/useNoteThread/types'

export function threadNoteNoUnauthenticated({
  uri,
  depth,
  value,
}: ApiThreadItem): Extract<ThreadItem, {type: 'threadNoteNoUnauthenticated'}> {
  return {
    type: 'threadNoteNoUnauthenticated',
    key: uri,
    uri,
    depth,
    value: value as SonetUnspeccedDefs.ThreadItemNoUnauthenticated,
    // @ts-ignore populated by the traversal
    ui: {},
  }
}

export function threadNoteNotFound({
  uri,
  depth,
  value,
}: ApiThreadItem): Extract<ThreadItem, {type: 'threadNoteNotFound'}> {
  return {
    type: 'threadNoteNotFound',
    key: uri,
    uri,
    depth,
    value: value as SonetUnspeccedDefs.ThreadItemNotFound,
  }
}

export function threadNoteBlocked({
  uri,
  depth,
  value,
}: ApiThreadItem): Extract<ThreadItem, {type: 'threadNoteBlocked'}> {
  return {
    type: 'threadNoteBlocked',
    key: uri,
    uri,
    depth,
    value: value as SonetUnspeccedDefs.ThreadItemBlocked,
  }
}

export function threadNote({
  uri,
  depth,
  value,
  moderationOpts,
  threadgateHiddenReplies,
}: {
  uri: string
  depth: number
  value: $Typed<SonetUnspeccedDefs.ThreadItemNote>
  moderationOpts: ModerationOpts
  threadgateHiddenReplies: Set<string>
}): Extract<ThreadItem, {type: 'threadNote'}> {
  const moderation = moderateNote(value.note, moderationOpts)
  const modui = moderation.ui('contentList')
  const blurred = modui.blur || modui.filter
  const muted = (modui.blurs[0] || modui.filters[0])?.type === 'muted'
  const hiddenByThreadgate = threadgateHiddenReplies.has(uri)
  const isOwnNote = value.note.author.userId === moderationOpts.userDid
  const isBlurred = (hiddenByThreadgate || blurred || muted) && !isOwnNote
  return {
    type: 'threadNote',
    key: uri,
    uri,
    depth,
    value: {
      ...value,
      /*
       * Do not spread anything here, load bearing for note shadow strict
       * equality reference checks.
       */
      note: value.note as Omit<SonetFeedDefs.NoteView, 'record'> & {
        record: SonetFeedNote.Record
      },
    },
    isBlurred,
    moderation,
    // @ts-ignore populated by the traversal
    ui: {},
  }
}

export function readMore({
  depth,
  repliesUnhydrated,
  skippedIndentIndices,
  noteData,
}: TraversalMetadata): Extract<ThreadItem, {type: 'readMore'}> {
  const urip = new AtUri(noteData.uri)
  const href = makeProfileLink(
    {
      userId: urip.host,
      username: noteData.authorUsername,
    },
    'note',
    urip.rkey,
  )
  return {
    type: 'readMore' as const,
    key: `readMore:${noteData.uri}`,
    href,
    moreReplies: repliesUnhydrated,
    depth,
    skippedIndentIndices,
  }
}

export function readMoreUp({
  noteData,
}: TraversalMetadata): Extract<ThreadItem, {type: 'readMoreUp'}> {
  const urip = new AtUri(noteData.uri)
  const href = makeProfileLink(
    {
      userId: urip.host,
      username: noteData.authorUsername,
    },
    'note',
    urip.rkey,
  )
  return {
    type: 'readMoreUp' as const,
    key: `readMoreUp:${noteData.uri}`,
    href,
  }
}

export function skeleton({
  key,
  item,
}: Omit<Extract<ThreadItem, {type: 'skeleton'}>, 'type'>): Extract<
  ThreadItem,
  {type: 'skeleton'}
> {
  return {
    type: 'skeleton',
    key,
    item,
  }
}

export function noteViewToThreadPlaceholder(
  note: SonetFeedDefs.NoteView,
): $Typed<
  Omit<SonetUnspeccedGetNoteThreadV2.ThreadItem, 'value'> & {
    value: $Typed<SonetUnspeccedDefs.ThreadItemNote>
  }
> {
  return {
    type: "sonet",
    uri: note.uri,
    depth: 0, // reset to 0 for highlighted note
    value: {
      type: "sonet",
      note,
      opThread: false,
      moreParents: false,
      moreReplies: 0,
      hiddenByThreadgate: false,
      mutedByViewer: false,
    },
  }
}
