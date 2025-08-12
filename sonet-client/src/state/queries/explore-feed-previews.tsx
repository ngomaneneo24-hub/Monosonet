import {useMemo} from 'react'
import {
  type SonetActorDefs,
  SonetFeedDefs,
  AtUri,
  moderateNote,
} from '@sonet/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {CustomFeedAPI} from '#/lib/api/feed/custom'
import {aggregateUserInterests} from '#/lib/api/feed/utils'
import {FeedTuner} from '#/lib/api/feed-manip'
import {cleanError} from '#/lib/strings/errors'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {
  type FeedNoteSlice,
  type FeedNoteSliceItem,
} from '#/state/queries/note-feed'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {
  userIdOrUsernameUriMatches,
  embedViewRecordToNoteView,
  getEmbeddedNote,
} from '#/state/queries/util'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'feed-previews'
const RQKEY = (feeds: string[]) => [RQKEY_ROOT, feeds]

const LIMIT = 8 // sliced to 6, overfetch to account for moderation
const PINNED_POST_URIS: Record<string, boolean> = {
  // 📰 News
  'sonet://userId:plc:kkf4naxqmweop7dv4l2iqqf5/app.sonet.feed.note/3lgh27w2ngc2b': true,
  // Gardening
  'sonet://userId:plc:5rw2on4i56btlcajojaxwcat/app.sonet.feed.note/3kjorckgcwc27': true,
  // Web Development Trending
  'sonet://userId:plc:m2sjv3wncvsasdapla35hzwj/app.sonet.feed.note/3lfaw445axs22': true,
  // Anime & Manga EN
  'sonet://userId:plc:tazrmeme4dzahimsykusrwrk/app.sonet.feed.note/3knxx2gmkns2y': true,
  // 📽️ Film
  'sonet://userId:plc:2hwwem55ce6djnk6bn62cstr/app.sonet.feed.note/3llhpzhbq7c2g': true,
  // PopSky
  'sonet://userId:plc:lfdf4srj43iwdng7jn35tjsp/app.sonet.feed.note/3lbblgly65c2g': true,
  // Science
  'sonet://userId:plc:hu2obebw3nhfj667522dahfg/app.sonet.feed.note/3kl33otd6ob2s': true,
  // Birds! 🦉
  'sonet://userId:plc:ffkgesg3jsv2j7aagkzrtcvt/app.sonet.feed.note/3lbg4r57yk22d': true,
  // Astronomy
  'sonet://userId:plc:xy2zorw2ys47poflotxthlzg/app.sonet.feed.note/3kyzye4lujs2w': true,
  // What's Cooking 🍽️
  'sonet://userId:plc:geoqe3qls5mwezckxxsewys2/app.sonet.feed.note/3lfqhgvxbqc2q': true,
  // BookSky 💙📚 #booksky
  'sonet://userId:plc:geoqe3qls5mwezckxxsewys2/app.sonet.feed.note/3kgrm2rw5ww2e': true,
}

export type FeedPreviewItem =
  | {
      type: 'preview:spacer'
      key: string
    }
  | {
      type: 'preview:loading'
      key: string
    }
  | {
      type: 'preview:error'
      key: string
      message: string
      error: string
    }
  | {
      type: 'preview:loadMoreError'
      key: string
    }
  | {
      type: 'preview:empty'
      key: string
    }
  | {
      type: 'preview:header'
      key: string
      feed: SonetFeedDefs.GeneratorView
    }
  | {
      type: 'preview:footer'
      key: string
    }
  // copied from NoteFeed.tsx
  | {
      type: 'preview:sliceItem'
      key: string
      slice: FeedNoteSlice
      indexInSlice: number
      feed: SonetFeedDefs.GeneratorView
      showReplyTo: boolean
      hideTopBorder: boolean
    }
  | {
      type: 'preview:sliceViewFullThread'
      key: string
      uri: string
    }

export function useFeedPreviews(
  feedsMaybeWithDuplicates: SonetFeedDefs.GeneratorView[],
  isEnabled: boolean = true,
) {
  const feeds = useMemo(
    () =>
      feedsMaybeWithDuplicates.filter(
        (f, i, a) => i === a.findIndex(f2 => f.uri === f2.uri),
      ),
    [feedsMaybeWithDuplicates],
  )

  const uris = feeds.map(feed => feed.uri)
  const {_} = useLingui()
  const agent = useAgent()
  const {data: preferences} = usePreferencesQuery()
  const userInterests = aggregateUserInterests(preferences)
  const moderationOpts = useModerationOpts()
  const enabled = feeds.length > 0 && isEnabled

  const query = useInfiniteQuery({
    enabled,
    queryKey: RQKEY(uris),
    queryFn: async ({pageParam}) => {
      const feed = feeds[pageParam]
      const api = new CustomFeedAPI({
        agent,
        feedParams: {feed: feed.uri},
        userInterests,
      })
      const data = await api.fetch({cursor: undefined, limit: LIMIT})
      return {
        feed,
        notes: data.feed,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (_p, _a, count) =>
      count < feeds.length ? count + 1 : undefined,
  })

  const {data, isFetched, isError, isPending, error} = query

  return {
    query,
    data: useMemo<FeedPreviewItem[]>(() => {
      const items: FeedPreviewItem[] = []

      if (!enabled) return items

      items.push({
        type: 'preview:spacer',
        key: 'spacer',
      })

      const isEmpty =
        !isPending && !data?.pages?.some(page => page.notes.length)

      if (isFetched) {
        if (isError && isEmpty) {
          items.push({
            type: 'preview:error',
            key: 'error',
            message: _(msg`An error occurred while fetching the feed.`),
            error: cleanError(error),
          })
        } else if (isEmpty) {
          items.push({
            type: 'preview:empty',
            key: 'empty',
          })
        } else if (data) {
          for (let pageIndex = 0; pageIndex < data.pages.length; pageIndex++) {
            const page = data.pages[pageIndex]
            // default feed tuner - we just want it to slice up the feed
            const tuner = new FeedTuner([])
            const slices: FeedPreviewItem[] = []

            let rowIndex = 0
            for (const item of tuner.tune(page.notes)) {
              if (item.isFallbackMarker) continue

              const moderations = item.items.map(item =>
                moderateNote(item.note, moderationOpts!),
              )

              // apply moderation filters
              item.items = item.items.filter((_, i) => {
                return !moderations[i]?.ui('contentList').filter
              })

              const slice = {
                _reactKey: page.feed.uri + item._reactKey,
                _isFeedNoteSlice: true,
                isFallbackMarker: false,
                isIncompleteThread: item.isIncompleteThread,
                feedContext: item.feedContext,
                reqId: item.reqId,
                reason: item.reason,
                feedNoteUri: item.feedNoteUri,
                items: item.items
                  .slice(0, 6)
                  .filter(subItem => {
                    return !PINNED_POST_URIS[subItem.note.uri]
                  })
                  .map((subItem, i) => {
                    const feedNoteSliceItem: FeedNoteSliceItem = {
                      _reactKey: `${item._reactKey}-${i}-${subItem.note.uri}`,
                      uri: subItem.note.uri,
                      note: subItem.note,
                      record: subItem.record,
                      moderation: moderations[i],
                      parentAuthor: subItem.parentAuthor,
                      isParentBlocked: subItem.isParentBlocked,
                      isParentNotFound: subItem.isParentNotFound,
                    }
                    return feedNoteSliceItem
                  }),
              }
              if (slice.isIncompleteThread && slice.items.length >= 3) {
                const beforeLast = slice.items.length - 2
                const last = slice.items.length - 1
                slices.push({
                  type: 'preview:sliceItem',
                  key: slice.items[0]._reactKey,
                  slice: slice,
                  indexInSlice: 0,
                  feed: page.feed,
                  showReplyTo: false,
                  hideTopBorder: rowIndex === 0,
                })
                slices.push({
                  type: 'preview:sliceViewFullThread',
                  key: slice._reactKey + '-viewFullThread',
                  uri: slice.items[0].uri,
                })
                slices.push({
                  type: 'preview:sliceItem',
                  key: slice.items[beforeLast]._reactKey,
                  slice: slice,
                  indexInSlice: beforeLast,
                  feed: page.feed,
                  showReplyTo:
                    slice.items[beforeLast].parentAuthor?.userId !==
                    slice.items[beforeLast].note.author.userId,
                  hideTopBorder: false,
                })
                slices.push({
                  type: 'preview:sliceItem',
                  key: slice.items[last]._reactKey,
                  slice: slice,
                  indexInSlice: last,
                  feed: page.feed,
                  showReplyTo: false,
                  hideTopBorder: false,
                })
              } else {
                for (let i = 0; i < slice.items.length; i++) {
                  slices.push({
                    type: 'preview:sliceItem',
                    key: slice.items[i]._reactKey,
                    slice: slice,
                    indexInSlice: i,
                    feed: page.feed,
                    showReplyTo: i === 0,
                    hideTopBorder: i === 0 && rowIndex === 0,
                  })
                }
              }

              rowIndex++
            }

            if (slices.length > 0) {
              items.push(
                {
                  type: 'preview:header',
                  key: `header-${page.feed.uri}`,
                  feed: page.feed,
                },
                ...slices,
                {
                  type: 'preview:footer',
                  key: `footer-${page.feed.uri}`,
                },
              )
            }
          }
        } else if (isError && !isEmpty) {
          items.push({
            type: 'preview:loadMoreError',
            key: 'loadMoreError',
          })
        }
      } else {
        items.push({
          type: 'preview:loading',
          key: 'loading',
        })
      }

      return items
    }, [
      enabled,
      data,
      isFetched,
      isError,
      isPending,
      moderationOpts,
      _,
      error,
    ]),
  }
}

export function* findAllNotesInQueryData(
  queryClient: QueryClient,
  uri: string,
): Generator<SonetFeedDefs.NoteView, undefined> {
  const atUri = new AtUri(uri)

  const queryDatas = queryClient.getQueriesData<
    InfiniteData<{
      feed: SonetFeedDefs.GeneratorView
      notes: SonetFeedDefs.FeedViewNote[]
    }>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const item of page.notes) {
        if (userIdOrUsernameUriMatches(atUri, item.note)) {
          yield item.note
        }

        const quotedNote = getEmbeddedNote(item.note.embed)
        if (quotedNote && userIdOrUsernameUriMatches(atUri, quotedNote)) {
          yield embedViewRecordToNoteView(quotedNote)
        }

        if (SonetFeedDefs.isNoteView(item.reply?.parent)) {
          if (userIdOrUsernameUriMatches(atUri, item.reply.parent)) {
            yield item.reply.parent
          }

          const parentQuotedNote = getEmbeddedNote(item.reply.parent.embed)
          if (
            parentQuotedNote &&
            userIdOrUsernameUriMatches(atUri, parentQuotedNote)
          ) {
            yield embedViewRecordToNoteView(parentQuotedNote)
          }
        }

        if (SonetFeedDefs.isNoteView(item.reply?.root)) {
          if (userIdOrUsernameUriMatches(atUri, item.reply.root)) {
            yield item.reply.root
          }

          const rootQuotedNote = getEmbeddedNote(item.reply.root.embed)
          if (rootQuotedNote && userIdOrUsernameUriMatches(atUri, rootQuotedNote)) {
            yield embedViewRecordToNoteView(rootQuotedNote)
          }
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
    InfiniteData<{
      feed: SonetFeedDefs.GeneratorView
      notes: SonetFeedDefs.FeedViewNote[]
    }>
  >({
    queryKey: [RQKEY_ROOT],
  })
  for (const [_queryKey, queryData] of queryDatas) {
    if (!queryData?.pages) {
      continue
    }
    for (const page of queryData?.pages) {
      for (const item of page.notes) {
        if (item.note.author.userId === userId) {
          yield item.note.author
        }
        const quotedNote = getEmbeddedNote(item.note.embed)
        if (quotedNote?.author.userId === userId) {
          yield quotedNote.author
        }
        if (
          SonetFeedDefs.isNoteView(item.reply?.parent) &&
          item.reply?.parent?.author.userId === userId
        ) {
          yield item.reply.parent.author
        }
        if (
          SonetFeedDefs.isNoteView(item.reply?.root) &&
          item.reply?.root?.author.userId === userId
        ) {
          yield item.reply.root.author
        }
      }
    }
  }
}
