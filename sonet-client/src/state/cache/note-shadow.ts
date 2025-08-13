import {useEffect, useMemo, useState} from 'react'
import {
  SonetEmbedRecord,
  SonetEmbedRecordWithMedia,
  type SonetFeedDefs,
} from '@sonet/api'
import {type QueryClient} from '@tanstack/react-query'
import EventEmitter from 'eventemitter3'

import {batchedUpdates} from '#/lib/batchedUpdates'
import {findAllNotesInQueryData as findAllNotesInExploreFeedPreviewsQueryData} from '#/state/queries/explore-feed-previews'
import {findAllNotesInQueryData as findAllNotesInNotifsQueryData} from '#/state/queries/notifications/feed'
import {findAllNotesInQueryData as findAllNotesInFeedQueryData} from '#/state/queries/note-feed'
import {findAllNotesInQueryData as findAllNotesInQuoteQueryData} from '#/state/queries/note-quotes'
import {findAllNotesInQueryData as findAllNotesInThreadQueryData} from '#/state/queries/note-thread'
import {findAllNotesInQueryData as findAllNotesInSearchQueryData} from '#/state/queries/search-notes'
import {findAllNotesInQueryData as findAllNotesInThreadV2QueryData} from '#/state/queries/useNoteThread/queryCache'
import {castAsShadow, type Shadow} from './types'
export type {Shadow} from './types'

export interface NoteShadow {
  likeUri: string | undefined
  renoteUri: string | undefined
  isDeleted: boolean
  embed: SonetEmbedRecord.View | SonetEmbedRecordWithMedia.View | undefined
  pinned: boolean
}

export const NOTE_TOMBSTONE = Symbol('NoteTombstone')

const emitter = new EventEmitter()
const shadows: WeakMap<
  SonetFeedDefs.NoteView,
  Partial<NoteShadow>
> = new WeakMap()

export function useNoteShadow(
  note: SonetFeedDefs.NoteView,
): Shadow<SonetFeedDefs.NoteView> | typeof NOTE_TOMBSTONE {
  const [shadow, setShadow] = useState(() => shadows.get(note))
  const [prevNote, setPrevNote] = useState(note)
  if (note !== prevNote) {
    setPrevNote(note)
    setShadow(shadows.get(note))
  }

  useEffect(() => {
    function onUpdate() {
      setShadow(shadows.get(note))
    }
    emitter.addListener(note.uri, onUpdate)
    return () => {
      emitter.removeListener(note.uri, onUpdate)
    }
  }, [note, setShadow])

  return useMemo(() => {
    if (shadow) {
      return mergeShadow(note, shadow)
    } else {
      return castAsShadow(note)
    }
  }, [note, shadow])
}

function mergeShadow(
  note: SonetFeedDefs.NoteView,
  shadow: Partial<NoteShadow>,
): Shadow<SonetFeedDefs.NoteView> | typeof NOTE_TOMBSTONE {
  if (shadow.isDeleted) {
    return NOTE_TOMBSTONE
  }

  let likeCount = note.likeCount ?? 0
  if ('likeUri' in shadow) {
    const wasLiked = !!note.viewer?.like
    const isLiked = !!shadow.likeUri
    if (wasLiked && !isLiked) {
      likeCount--
    } else if (!wasLiked && isLiked) {
      likeCount++
    }
    likeCount = Math.max(0, likeCount)
  }

  let renoteCount = note.renoteCount ?? 0
  if ('renoteUri' in shadow) {
    const wasRenoteed = !!note.viewer?.renote
    const isRenoteed = !!shadow.renoteUri
    if (wasRenoteed && !isRenoteed) {
      renoteCount--
    } else if (!wasRenoteed && isRenoteed) {
      renoteCount++
    }
    renoteCount = Math.max(0, renoteCount)
  }

  let embed: typeof note.embed
  if ('embed' in shadow) {
    if (
      (SonetEmbedRecord.isView(note.embed) &&
        SonetEmbedRecord.isView(shadow.embed)) ||
      (SonetEmbedRecordWithMedia.isView(note.embed) &&
        SonetEmbedRecordWithMedia.isView(shadow.embed))
    ) {
      embed = shadow.embed
    }
  }

  return castAsShadow({
    ...note,
    embed: embed || note.embed,
    likeCount: likeCount,
    renoteCount: renoteCount,
    viewer: {
      ...(note.viewer || {}),
      like: 'likeUri' in shadow ? shadow.likeUri : note.viewer?.like,
      renote: 'renoteUri' in shadow ? shadow.renoteUri : note.viewer?.renote,
      pinned: 'pinned' in shadow ? shadow.pinned : note.viewer?.pinned,
    },
  })
}

export function updateNoteShadow(
  queryClient: QueryClient,
  uri: string,
  value: Partial<NoteShadow>,
) {
  const cachedNotes = findNotesInCache(queryClient, uri)
  for (let note of cachedNotes) {
    shadows.set(note, {...shadows.get(note), ...value})
  }
  batchedUpdates(() => {
    emitter.emit(uri)
  })
}

function* findNotesInCache(
  queryClient: QueryClient,
  uri: string,
): Generator<SonetFeedDefs.NoteView, void> {
  for (let note of findAllNotesInFeedQueryData(queryClient, uri)) {
    yield note
  }
  for (let note of findAllNotesInNotifsQueryData(queryClient, uri)) {
    yield note
  }
  for (let node of findAllNotesInThreadQueryData(queryClient, uri)) {
    if (node.type === 'note') {
      yield node.note
    }
  }
  for (let note of findAllNotesInThreadV2QueryData(queryClient, uri)) {
    yield note
  }
  for (let note of findAllNotesInSearchQueryData(queryClient, uri)) {
    yield note
  }
  for (let note of findAllNotesInQuoteQueryData(queryClient, uri)) {
    yield note
  }
  for (let note of findAllNotesInExploreFeedPreviewsQueryData(
    queryClient,
    uri,
  )) {
    yield note
  }
}
