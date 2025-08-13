import {
  SonetActorDefs,
  SonetEmbedRecord,
  SonetFeedDefs,
  SonetFeedGetQuotes,
  AtUri,
} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useAgent} from '#/state/session'
import {
  userIdOrUsernameUriMatches,
  embedViewRecordToNoteView,
  getEmbeddedNote,
} from './util'

const PAGE_SIZE = 30
type RQPageParam = string | undefined

const RQKEY_ROOT = 'note-quotes'
export const RQKEY = (resolvedUri: string) => [RQKEY_ROOT, resolvedUri]

export function useNoteQuotesQuery(resolvedUri: string | undefined) {
  const agent = useAgent()
  return useInfiniteQuery<
    SonetFeedGetQuotes.OutputSchema,
    Error,
    InfiniteData<SonetFeedGetQuotes.OutputSchema>,
    QueryKey,
    RQPageParam
  >({
    queryKey: RQKEY(resolvedUri || ''),
    async queryFn({pageParam}: {pageParam: RQPageParam}) {
      const res = await agent.api.app.sonet.feed.getQuotes({
        uri: resolvedUri || '',
        limit: PAGE_SIZE,
        cursor: pageParam,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: !!resolvedUri,
    select: data => {
      return {
        ...data,
        pages: data.pages.map(page => {
          return {
            ...page,
            notes: page.notes.filter(note => {
              if (note.embed && SonetEmbedRecord.isView(note.embed)) {
                if (SonetEmbedRecord.isViewDetached(note.embed.record)) {
                  return false
                }
              }
              return true
            }),
          }
        }),
      }
    },
  })
}

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileViewBasic, void> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetFeedGetQuotes.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const item of page.notes) {
        if (item.author.userId === userId) {
          yield item.author
        }
        const quotedNote = getEmbeddedNote(item.embed)
        if (quotedNote?.author.userId === userId) {
          yield quotedNote.author
        }
      }
    }
  }
}

export function* findAllNotesInQueryData(
  queryClient: QueryClient,
  uri: string,
): Generator<SonetFeedDefs.NoteView, undefined> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetFeedGetQuotes.OutputSchema>
  >({
    queryKey: [RQKEY_ROOT],
  })
  const atUri = new AtUri(uri)
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const note of page.notes) {
        if (userIdOrUsernameUriMatches(atUri, note)) {
          yield note
        }

        const quotedNote = getEmbeddedNote(note.embed)
        if (quotedNote && userIdOrUsernameUriMatches(atUri, quotedNote)) {
          yield embedViewRecordToNoteView(quotedNote)
        }
      }
    }
  }
}
