import {
  SonetFeedDefs,
  SonetFeedGetNoteThread,
  SonetFeedThreadgate,
  AtUri,
  SonetAppAgent,
} from '@sonet/api'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {networkRetry, retry} from '#/lib/async/retry'
import {until} from '#/lib/async/until'
import {STALE} from '#/state/queries'
import {RQKEY_ROOT as noteThreadQueryKeyRoot} from '#/state/queries/note-thread'
import {ThreadgateAllowUISetting} from '#/state/queries/threadgate/types'
import {
  createThreadgateRecord,
  mergeThreadgateRecords,
  threadgateAllowUISettingToAllowRecordValue,
  threadgateViewToAllowUISetting,
} from '#/state/queries/threadgate/util'
import {useAgent} from '#/state/session'
import {useThreadgateHiddenReplyUrisAPI} from '#/state/threadgate-hidden-replies'
import * as bsky from '#/types/bsky'

export * from '#/state/queries/threadgate/types'
export * from '#/state/queries/threadgate/util'

export const threadgateRecordQueryKeyRoot = 'threadgate-record'
export const createThreadgateRecordQueryKey = (uri: string) => [
  threadgateRecordQueryKeyRoot,
  uri,
]

export function useThreadgateRecordQuery({
  noteUri,
  initialData,
}: {
  noteUri?: string
  initialData?: SonetFeedThreadgate.Record
} = {}) {
  const agent = useAgent()

  return useQuery({
    enabled: !!noteUri,
    queryKey: createThreadgateRecordQueryKey(noteUri || ''),
    placeholderData: initialData,
    staleTime: STALE.MINUTES.ONE,
    async queryFn() {
      return getThreadgateRecord({
        agent,
        noteUri: noteUri!,
      })
    },
  })
}

export const threadgateViewQueryKeyRoot = 'threadgate-view'
export const createThreadgateViewQueryKey = (uri: string) => [
  threadgateViewQueryKeyRoot,
  uri,
]
export function useThreadgateViewQuery({
  noteUri,
  initialData,
}: {
  noteUri?: string
  initialData?: SonetFeedDefs.ThreadgateView
} = {}) {
  const agent = useAgent()

  return useQuery({
    enabled: !!noteUri,
    queryKey: createThreadgateViewQueryKey(noteUri || ''),
    placeholderData: initialData,
    staleTime: STALE.MINUTES.ONE,
    async queryFn() {
      return getThreadgateView({
        agent,
        noteUri: noteUri!,
      })
    },
  })
}

export async function getThreadgateView({
  agent,
  noteUri,
}: {
  agent: SonetAppAgent
  noteUri: string
}) {
  const {data} = await agent.app.sonet.feed.getNoteThread({
    uri: noteUri!,
    depth: 0,
  })

  if (SonetFeedDefs.isThreadViewNote(data.thread)) {
    return data.thread.note.threadgate ?? null
  }

  return null
}

export async function getThreadgateRecord({
  agent,
  noteUri,
}: {
  agent: SonetAppAgent
  noteUri: string
}): Promise<SonetFeedThreadgate.Record | null> {
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
          collection: 'app.sonet.feed.threadgate',
          rkey: urip.rkey,
        }),
    )

    if (
      data.value &&
      bsky.validate(data.value, SonetFeedThreadgate.validateRecord)
    ) {
      return data.value
    } else {
      return null
    }
  } catch (e: any) {
    /*
     * If the record doesn't exist, we want to return null instead of
     * throwing an error. NB: This will also catch reference errors, such as
     * a typo in the URI.
     */
    if (e.message.includes(`Could not locate record:`)) {
      return null
    } else {
      throw e
    }
  }
}

export async function writeThreadgateRecord({
  agent,
  noteUri,
  threadgate,
}: {
  agent: SonetAppAgent
  noteUri: string
  threadgate: SonetFeedThreadgate.Record
}) {
  const noteUrip = new AtUri(noteUri)
  const record = createThreadgateRecord({
    note: noteUri,
    allow: threadgate.allow, // can/should be undefined!
    hiddenReplies: threadgate.hiddenReplies || [],
  })

  await networkRetry(2, () =>
    agent.api.com.sonet.repo.putRecord({
      repo: agent.session!.userId,
      collection: 'app.sonet.feed.threadgate',
      rkey: noteUrip.rkey,
      record,
    }),
  )
}

export async function upsertThreadgate(
  {
    agent,
    noteUri,
  }: {
    agent: SonetAppAgent
    noteUri: string
  },
  callback: (
    threadgate: SonetFeedThreadgate.Record | null,
  ) => Promise<SonetFeedThreadgate.Record | undefined>,
) {
  const prev = await getThreadgateRecord({
    agent,
    noteUri,
  })
  const next = await callback(prev)
  if (!next) return
  await writeThreadgateRecord({
    agent,
    noteUri,
    threadgate: next,
  })
}

/**
 * Update the allow list for a threadgate record.
 */
export async function updateThreadgateAllow({
  agent,
  noteUri,
  allow,
}: {
  agent: SonetAppAgent
  noteUri: string
  allow: ThreadgateAllowUISetting[]
}) {
  return upsertThreadgate({agent, noteUri}, async prev => {
    if (prev) {
      return {
        ...prev,
        allow: threadgateAllowUISettingToAllowRecordValue(allow),
      }
    } else {
      return createThreadgateRecord({
        note: noteUri,
        allow: threadgateAllowUISettingToAllowRecordValue(allow),
      })
    }
  })
}

export function useSetThreadgateAllowMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      noteUri,
      allow,
    }: {
      noteUri: string
      allow: ThreadgateAllowUISetting[]
    }) => {
      return upsertThreadgate({agent, noteUri}, async prev => {
        if (prev) {
          return {
            ...prev,
            allow: threadgateAllowUISettingToAllowRecordValue(allow),
          }
        } else {
          return createThreadgateRecord({
            note: noteUri,
            allow: threadgateAllowUISettingToAllowRecordValue(allow),
          })
        }
      })
    },
    async onSuccess(_, {noteUri, allow}) {
      await until(
        5, // 5 tries
        1e3, // 1s delay between tries
        (res: SonetFeedGetNoteThread.Response) => {
          const thread = res.data.thread
          if (SonetFeedDefs.isThreadViewNote(thread)) {
            const fetchedSettings = threadgateViewToAllowUISetting(
              thread.note.threadgate,
            )
            return JSON.stringify(fetchedSettings) === JSON.stringify(allow)
          }
          return false
        },
        () => {
          return agent.app.sonet.feed.getNoteThread({
            uri: noteUri,
            depth: 0,
          })
        },
      )

      queryClient.invalidateQueries({
        queryKey: [noteThreadQueryKeyRoot],
      })
      queryClient.invalidateQueries({
        queryKey: [threadgateRecordQueryKeyRoot],
      })
      queryClient.invalidateQueries({
        queryKey: [threadgateViewQueryKeyRoot],
      })
    },
  })
}

export function useToggleReplyVisibilityMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const hiddenReplies = useThreadgateHiddenReplyUrisAPI()

  return useMutation({
    mutationFn: async ({
      noteUri,
      replyUri,
      action,
    }: {
      noteUri: string
      replyUri: string
      action: 'hide' | 'show'
    }) => {
      if (action === 'hide') {
        hiddenReplies.addHiddenReplyUri(replyUri)
      } else if (action === 'show') {
        hiddenReplies.removeHiddenReplyUri(replyUri)
      }

      await upsertThreadgate({agent, noteUri}, async prev => {
        if (prev) {
          if (action === 'hide') {
            return mergeThreadgateRecords(prev, {
              hiddenReplies: [replyUri],
            })
          } else if (action === 'show') {
            return {
              ...prev,
              hiddenReplies:
                prev.hiddenReplies?.filter(uri => uri !== replyUri) || [],
            }
          }
        } else {
          if (action === 'hide') {
            return createThreadgateRecord({
              note: noteUri,
              hiddenReplies: [replyUri],
            })
          }
        }
      })
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: [threadgateRecordQueryKeyRoot],
      })
    },
    onError(_, {replyUri, action}) {
      if (action === 'hide') {
        hiddenReplies.removeHiddenReplyUri(replyUri)
      } else if (action === 'show') {
        hiddenReplies.addHiddenReplyUri(replyUri)
      }
    },
  })
}
