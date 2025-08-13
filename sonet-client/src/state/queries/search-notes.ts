import React from 'react'
import {
  SonetActorDefs,
  SonetFeedDefs,
  SonetFeedSearchNotes,
  AtUri,
  moderateNote,
} from '@sonet/api'
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useAgent} from '#/state/session'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'
import {
  userIdOrUsernameUriMatches,
  embedViewRecordToNoteView,
  getEmbeddedNote,
} from './util'

const searchNotesQueryKeyRoot = 'search-notes'
const searchNotesQueryKey = ({query, sort}: {query: string; sort?: string}) => [
  searchNotesQueryKeyRoot,
  query,
  sort,
]

export function useSearchNotesQuery({
  query,
  sort,
  enabled,
}: {
  query: string
  sort?: 'top' | 'latest'
  enabled?: boolean
}) {
  const agent = useAgent()
  const sonet = useSonetApi()
  const sonetSession = useSonetSession()
  const moderationOpts = useModerationOpts()
  const selectArgs = React.useMemo(
    () => ({
      isSearchingSpecificUser: /from:(\w+)/.test(query),
      moderationOpts,
    }),
    [query, moderationOpts],
  )
  const lastRun = React.useRef<{
    data: InfiniteData<SonetFeedSearchNotes.OutputSchema>
    args: typeof selectArgs
    result: InfiniteData<SonetFeedSearchNotes.OutputSchema>
  } | null>(null)

  return useInfiniteQuery<
    SonetFeedSearchNotes.OutputSchema,
    Error,
    InfiniteData<SonetFeedSearchNotes.OutputSchema>,
    QueryKey,
    string | undefined
  >({
    queryKey: searchNotesQueryKey({query, sort}),
    queryFn: async ({pageParam}) => {
      if (sonetSession.hasSession) {
        const res = await sonet.getApi().search(query, 'notes', {limit: 25, cursor: pageParam})
        const notes = Array.isArray(res?.results) ? res.results : []
        return {
          cursor: res?.pagination?.cursor,
          hitsTotal: notes.length,
          notes: notes.map((n: any) => ({
            uri: `sonet://note/${n.id}`,
            cid: n.id,
            author: {userId: n.author?.id || 'sonet:user'} as any,
            record: {text: n.content || n.text || ''} as any,
          } as any)),
        } as any
      }
      const res = await agent.app.sonet.feed.searchNotes({
        q: query,
        limit: 25,
        cursor: pageParam,
        sort,
      })
      return res.data
    },
    initialPageParam: undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: enabled ?? !!moderationOpts,
    select: React.useCallback(
      (data: InfiniteData<SonetFeedSearchNotes.OutputSchema>) => {
        const {moderationOpts, isSearchingSpecificUser} = selectArgs

        /*
         * If a user applies the `from:<user>` filter, don't apply any
         * moderation. Note that if we add any more filtering logic below, we
         * may need to adjust this.
         */
        if (isSearchingSpecificUser) {
          return data
        }

        // Keep track of the last run and whether we can reuse
        // some already selected pages from there.
        let reusedPages = []
        if (lastRun.current) {
          const {
            data: lastData,
            args: lastArgs,
            result: lastResult,
          } = lastRun.current
          let canReuse = true
          for (let key in selectArgs) {
            if (selectArgs.hasOwnProperty(key)) {
              if ((selectArgs as any)[key] !== (lastArgs as any)[key]) {
                // Can't do reuse anything if any input has changed.
                canReuse = false
                break
              }
            }
          }
          if (canReuse) {
            for (let i = 0; i < data.pages.length; i++) {
              if (data.pages[i] && lastData.pages[i] === data.pages[i]) {
                reusedPages.push(lastResult.pages[i])
                continue
              }
              // Stop as soon as pages stop matching up.
              break
            }
          }
        }

        const result = {
          ...data,
          pages: [
            ...reusedPages,
            ...data.pages.slice(reusedPages.length).map(page => {
              return {
                ...page,
                notes: page.notes.filter(note => {
                  const mod = moderateNote(note, moderationOpts!)
                  return !mod.ui('contentList').filter
                }),
              }
            }),
          ],
        }

        lastRun.current = {data, result, args: selectArgs}

        return result
      },
      [selectArgs],
    ),
  })
}

export function* findAllNotesInQueryData(
  queryClient: QueryClient,
  uri: string,
): Generator<SonetFeedDefs.NoteView, undefined> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetFeedSearchNotes.OutputSchema>
  >({
    queryKey: [searchNotesQueryKeyRoot],
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

export function* findAllProfilesInQueryData(
  queryClient: QueryClient,
  userId: string,
): Generator<SonetActorDefs.ProfileViewBasic, undefined> {
  const queryDatas = queryClient.getQueriesData<
    InfiniteData<SonetFeedSearchNotes.OutputSchema>
  >({
    queryKey: [searchNotesQueryKeyRoot],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const note of page.notes) {
        if (note.author.userId === userId) {
          yield note.author
        }
        const quotedNote = getEmbeddedNote(note.embed)
        if (quotedNote?.author.userId === userId) {
          yield quotedNote.author
        }
      }
    }
  }
}
