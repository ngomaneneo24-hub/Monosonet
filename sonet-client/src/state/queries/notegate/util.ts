import {
  type $Typed,
  SonetEmbedRecord,
  SonetEmbedRecordWithMedia,
  type SonetFeedDefs,
  type SonetFeedNotegate,
  AtUri,
} from '@sonet/api'

export const NOTEGATE_COLLECTION = 'app.sonet.feed.notegate'

export function createNotegateRecord(
  notegate: Partial<SonetFeedNotegate.Record> & {
    note: SonetFeedNotegate.Record['note']
  },
): SonetFeedNotegate.Record {
  return {
    $type: NOTEGATE_COLLECTION,
    createdAt: new Date().toISOString(),
    note: notegate.note,
    detachedEmbeddingUris: notegate.detachedEmbeddingUris || [],
    embeddingRules: notegate.embeddingRules || [],
  }
}

export function mergeNotegateRecords(
  prev: SonetFeedNotegate.Record,
  next: Partial<SonetFeedNotegate.Record>,
) {
  const detachedEmbeddingUris = Array.from(
    new Set([
      ...(prev.detachedEmbeddingUris || []),
      ...(next.detachedEmbeddingUris || []),
    ]),
  )
  const embeddingRules = [
    ...(prev.embeddingRules || []),
    ...(next.embeddingRules || []),
  ].filter(
    (rule, i, all) => all.findIndex(_rule => _rule.$type === rule.$type) === i,
  )
  return createNotegateRecord({
    note: prev.note,
    detachedEmbeddingUris,
    embeddingRules,
  })
}

export function createEmbedViewDetachedRecord({
  uri,
}: {
  uri: string
}): $Typed<SonetEmbedRecord.View> {
  const record: $Typed<SonetEmbedRecord.ViewDetached> = {
    type: "sonet",
    uri,
    detached: true,
  }
  return {
    type: "sonet",
    record,
  }
}

export function createMaybeDetachedQuoteEmbed({
  note,
  quote,
  quoteUri,
  detached,
}:
  | {
      note: SonetFeedDefs.NoteView
      quote: SonetFeedDefs.NoteView
      quoteUri: undefined
      detached: false
    }
  | {
      note: SonetFeedDefs.NoteView
      quote: undefined
      quoteUri: string
      detached: true
    }): SonetEmbedRecord.View | SonetEmbedRecordWithMedia.View | undefined {
  if (SonetEmbedRecord.isView(note.embed)) {
    if (detached) {
      return createEmbedViewDetachedRecord({uri: quoteUri})
    } else {
      return createEmbedRecordView({note: quote})
    }
  } else if (SonetEmbedRecordWithMedia.isView(note.embed)) {
    if (detached) {
      return {
        ...note.embed,
        record: createEmbedViewDetachedRecord({uri: quoteUri}),
      }
    } else {
      return createEmbedRecordWithMediaView({note, quote})
    }
  }
}

export function createEmbedViewRecordFromNote(
  note: SonetFeedDefs.NoteView,
): $Typed<SonetEmbedRecord.ViewRecord> {
  return {
    type: "sonet",
    uri: note.uri,
    cid: note.cid,
    author: note.author,
    value: note.record,
    labels: note.labels,
    replyCount: note.replyCount,
    renoteCount: note.renoteCount,
    likeCount: note.likeCount,
    quoteCount: note.quoteCount,
    indexedAt: note.indexedAt,
    embeds: note.embed ? [note.embed] : [],
  }
}

export function createEmbedRecordView({
  note,
}: {
  note: SonetFeedDefs.NoteView
}): SonetEmbedRecord.View {
  return {
    type: "sonet",
    record: createEmbedViewRecordFromNote(note),
  }
}

export function createEmbedRecordWithMediaView({
  note,
  quote,
}: {
  note: SonetFeedDefs.NoteView
  quote: SonetFeedDefs.NoteView
}): SonetEmbedRecordWithMedia.View | undefined {
  if (!SonetEmbedRecordWithMedia.isView(note.embed)) return
  return {
    ...(note.embed || {}),
    record: {
      record: createEmbedViewRecordFromNote(quote),
    },
  }
}

export function getMaybeDetachedQuoteEmbed({
  viewerDid,
  note,
}: {
  viewerDid: string
  note: SonetFeedDefs.NoteView
}) {
  if (SonetEmbedRecord.isView(note.embed)) {
    // detached
    if (SonetEmbedRecord.isViewDetached(note.embed.record)) {
      const urip = new AtUri(note.embed.record.uri)
      return {
        embed: note.embed,
        uri: urip.toString(),
        isOwnedByViewer: urip.host === viewerDid,
        isDetached: true,
      }
    }

    // note
    if (SonetEmbedRecord.isViewRecord(note.embed.record)) {
      const urip = new AtUri(note.embed.record.uri)
      return {
        embed: note.embed,
        uri: urip.toString(),
        isOwnedByViewer: urip.host === viewerDid,
        isDetached: false,
      }
    }
  } else if (SonetEmbedRecordWithMedia.isView(note.embed)) {
    // detached
    if (SonetEmbedRecord.isViewDetached(note.embed.record.record)) {
      const urip = new AtUri(note.embed.record.record.uri)
      return {
        embed: note.embed,
        uri: urip.toString(),
        isOwnedByViewer: urip.host === viewerDid,
        isDetached: true,
      }
    }

    // note
    if (SonetEmbedRecord.isViewRecord(note.embed.record.record)) {
      const urip = new AtUri(note.embed.record.record.uri)
      return {
        embed: note.embed,
        uri: urip.toString(),
        isOwnedByViewer: urip.host === viewerDid,
        isDetached: false,
      }
    }
  }
}

export const embeddingRules = {
  disableRule: {type: "sonet"},
}
