import React from 'react'
import {
  SonetEmbedRecord,
  SonetEmbedRecordWithMedia,
  type SonetFeedDefs,
  SonetFeedNotegate,
  AtUri,
  type SonetAppAgent,
} from '@sonet/api'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {networkRetry, retry} from '#/lib/async/retry'
import {logger} from '#/logger'
import {updateNoteShadow} from '#/state/cache/note-shadow'
import {STALE} from '#/state/queries'
import {useGetNotes} from '#/state/queries/note'
import {
  createMaybeDetachedQuoteEmbed,
  createNotegateRecord,
  mergeNotegateRecords,
  NOTEGATE_COLLECTION,
} from '#/state/queries/notegate/util'
import {useAgent} from '#/state/session'
import * as bsky from '#/types/bsky'

export async function getNotegateRecord({
  agent,
  noteUri,
}: {
  agent: SonetAppAgent
  noteUri: string
}): Promise<SonetFeedNotegate.Record | undefined> {
  const urip = new AtUri(noteUri)

  if (!urip.host.startsWith('userId:')) {
    const res = await agent.resolveUsername({
      username: urip.host,
    })
    urip.host = res.data.userId
  }

  try {
    const {data} = await retry(
      2,
      e => {
        /*
         * If the record doesn't exist, we want to return null instead of
         * throwing an error. NB: This will also catch reference errors, such as
         * a typo in the URI.
         */
        if (e.message.includes(`Could not locate record:`)) {
          return false
        }
        return true
      },
      () =>
        agent.api.com.sonet.repo.getRecord({
          repo: urip.host,
          collection: NOTEGATE_COLLECTION,
          rkey: urip.rkey,
        }),
    )

    if (
      data.value &&
      bsky.validate(data.value, SonetFeedNotegate.validateRecord)
    ) {
      return data.value
    } else {
      return undefined
    }
  } catch (e: any) {
    /*
     * If the record doesn't exist, we want to return null instead of
     * throwing an error. NB: This will also catch reference errors, such as
     * a typo in the URI.
     */
    if (e.message.includes(`Could not locate record:`)) {
      return undefined
    } else {
      throw e
    }
  }
}

export async function writeNotegateRecord({
  agent,
  noteUri,
  notegate,
}: {
  agent: SonetAppAgent
  noteUri: string
  notegate: SonetFeedNotegate.Record
}) {
  const noteUrip = new AtUri(noteUri)

  await networkRetry(2, () =>
    agent.api.com.sonet.repo.putRecord({
      repo: agent.session!.userId,
      collection: NOTEGATE_COLLECTION,
      rkey: noteUrip.rkey,
      record: notegate,
    }),
  )
}

export async function upsertNotegate(
  {
    agent,
    noteUri,
  }: {
    agent: SonetAppAgent
    noteUri: string
  },
  callback: (
    notegate: SonetFeedNotegate.Record | undefined,
  ) => Promise<SonetFeedNotegate.Record | undefined>,
) {
  const prev = await getNotegateRecord({
    agent,
    noteUri,
  })
  const next = await callback(prev)
  if (!next) return
  await writeNotegateRecord({
    agent,
    noteUri,
    notegate: next,
  })
}

export const createNotegateQueryKey = (noteUri: string) => [
  'notegate-record',
  noteUri,
]
export function useNotegateQuery({noteUri}: {noteUri: string}) {
  const agent = useAgent()
  return useQuery({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: createNotegateQueryKey(noteUri),
    async queryFn() {
      return await getNotegateRecord({agent, noteUri}).then(res => res ?? null)
    },
  })
}

export function useWriteNotegateMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      noteUri,
      notegate,
    }: {
      noteUri: string
      notegate: SonetFeedNotegate.Record
    }) => {
      return writeNotegateRecord({
        agent,
        noteUri,
        notegate,
      })
    },
    onSuccess(_, {noteUri}) {
      queryClient.invalidateQueries({
        queryKey: createNotegateQueryKey(noteUri),
      })
    },
  })
}

export function useToggleQuoteDetachmentMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const getNotes = useGetNotes()
  const prevEmbed = React.useRef<SonetFeedDefs.NoteView['embed']>()

  return useMutation({
    mutationFn: async ({
      note,
      quoteUri,
      action,
    }: {
      note: SonetFeedDefs.NoteView
      quoteUri: string
      action: 'detach' | 'reattach'
    }) => {
      // cache here since note shadow mutates original object
      prevEmbed.current = note.embed

      if (action === 'detach') {
        updateNoteShadow(queryClient, note.uri, {
          embed: createMaybeDetachedQuoteEmbed({
            note,
            quote: undefined,
            quoteUri,
            detached: true,
          }),
        })
      }

      await upsertNotegate({agent, noteUri: quoteUri}, async prev => {
        if (prev) {
          if (action === 'detach') {
            return mergeNotegateRecords(prev, {
              detachedEmbeddingUris: [note.uri],
            })
          } else if (action === 'reattach') {
            return {
              ...prev,
              detachedEmbeddingUris:
                prev.detachedEmbeddingUris?.filter(uri => uri !== note.uri) ||
                [],
            }
          }
        } else {
          if (action === 'detach') {
            return createNotegateRecord({
              note: quoteUri,
              detachedEmbeddingUris: [note.uri],
            })
          }
        }
      })
    },
    async onSuccess(_data, {note, quoteUri, action}) {
      if (action === 'reattach') {
        try {
          const [quote] = await getNotes({uris: [quoteUri]})
          updateNoteShadow(queryClient, note.uri, {
            embed: createMaybeDetachedQuoteEmbed({
              note,
              quote,
              quoteUri: undefined,
              detached: false,
            }),
          })
        } catch (e: any) {
          // ok if this fails, it's just optimistic UI
          logger.error(`Notegate: failed to get quote note for re-attachment`, {
            safeMessage: e.message,
          })
        }
      }
    },
    onError(_, {note, action}) {
      if (action === 'detach' && prevEmbed.current) {
        // detach failed, add the embed back
        if (
          SonetEmbedRecord.isView(prevEmbed.current) ||
          SonetEmbedRecordWithMedia.isView(prevEmbed.current)
        ) {
          updateNoteShadow(queryClient, note.uri, {
            embed: prevEmbed.current,
          })
        }
      }
    },
    onSettled() {
      prevEmbed.current = undefined
    },
  })
}

export function useToggleQuotenoteEnabledMutation() {
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({
      noteUri,
      action,
    }: {
      noteUri: string
      action: 'enable' | 'disable'
    }) => {
      await upsertNotegate({agent, noteUri: noteUri}, async prev => {
        if (prev) {
          if (action === 'disable') {
            return mergeNotegateRecords(prev, {
              embeddingRules: [{type: "sonet"}],
            })
          } else if (action === 'enable') {
            return {
              ...prev,
              embeddingRules: [],
            }
          }
        } else {
          if (action === 'disable') {
            return createNotegateRecord({
              note: noteUri,
              embeddingRules: [{type: "sonet"}],
            })
          }
        }
      })
    },
  })
}
