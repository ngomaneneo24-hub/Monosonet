import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  LayoutAnimation,
  type ListRenderItemInfo,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
import {
  type SonetProfile,
  type SonetNote,
  type SonetEmbed,
} from '#/types/sonet'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {isStatusStillActive, validateStatus} from '#/lib/actor-status'
import {DISCOVER_FEED_URI, KNOWN_SHUTDOWN_FEEDS} from '#/lib/constants'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {logEvent} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {isIOS, isNative, isWeb} from '#/platform/detection'
import {listenNoteCreated} from '#/state/events'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {useTrendingSettings} from '#/state/preferences/trending'
import {STALE} from '#/state/queries'
import {
  type AuthorFilter,
  type FeedDescriptor,
  type FeedParams,
  type FeedNoteSlice,
  type FeedNoteSliceItem,
  pollLatest,
  RQKEY,
  useNoteFeedQuery,
} from '#/state/queries/note-feed'
import {useLiveNowConfig} from '#/state/service-config'
import {useSession} from '#/state/session'
import {useProgressGuide} from '#/state/shell/progress-guide'
import {useSelectedFeed} from '#/state/shell/selected-feed'
import {List, type ListRef} from '#/view/com/util/List'
import {NoteFeedLoadingPlaceholder} from '#/view/com/util/LoadingPlaceholder'
import {LoadMoreRetryBtn} from '#/view/com/util/LoadMoreRetryBtn'
import {type VideoFeedSourceContext} from '#/screens/VideoFeed/types'
import {useBreakpoints, useLayoutBreakpoints} from '#/alf'
import {
  AgeAssuranceDismissibleFeedBanner,
  useInternalState as useAgeAssuranceBannerState,
} from '#/components/ageAssurance/AgeAssuranceDismissibleFeedBanner'
import {ProgressGuide, SuggestedFollows} from '#/components/FeedInterstitials'
import {
  NoteFeedVideoGridRow,
  NoteFeedVideoGridRowPlaceholder,
} from '#/components/feeds/NoteFeedVideoGridRow'
import {TrendingInterstitial} from '#/components/interstitials/Trending'
import {TrendingVideos as TrendingVideosInterstitial} from '#/components/interstitials/TrendingVideos'
import {DiscoverFallbackHeader} from './DiscoverFallbackHeader'
import {FeedShutdownMsg} from './FeedShutdownMsg'
import {NoteFeedErrorMessage} from './NoteFeedErrorMessage'
import {NoteFeedItem} from './NoteFeedItem'
import {ShowLessFollowup} from './ShowLessFollowup'
import {ViewFullThread} from './ViewFullThread'

type FeedRow =
  | {
      type: 'loading'
      key: string
    }
  | {
      type: 'empty'
      key: string
    }
  | {
      type: 'error'
      key: string
    }
  | {
      type: 'loadMoreError'
      key: string
    }
  | {
      type: 'feedShutdownMsg'
      key: string
    }
  | {
      type: 'fallbackMarker'
      key: string
    }
  | {
      type: 'sliceItem'
      key: string
      slice: FeedNoteSlice
      indexInSlice: number
      showReplyTo: boolean
    }
  | {
      type: 'videoGridRowPlaceholder'
      key: string
    }
  | {
      type: 'videoGridRow'
      key: string
      items: FeedNoteSliceItem[]
      sourceFeedUri: string
      feedContexts: (string | undefined)[]
      reqIds: (string | undefined)[]
    }
  | {
      type: 'sliceViewFullThread'
      key: string
      uri: string
    }
  | {
      type: 'interstitialFollows'
      key: string
    }
  | {
      type: 'interstitialProgressGuide'
      key: string
    }
  | {
      type: 'interstitialTrending'
      key: string
    }
  | {
      type: 'interstitialTrendingVideos'
      key: string
    }
  | {
      type: 'showLessFollowup'
      key: string
    }
  | {
      type: 'ageAssuranceBanner'
      key: string
    }

export function getItemsForFeedback(feedRow: FeedRow): {
  item: FeedNoteSliceItem
  feedContext: string | undefined
  reqId: string | undefined
}[] {
  if (feedRow.type === 'sliceItem') {
    return feedRow.slice.items.map(item => ({
      item,
      feedContext: feedRow.slice.feedContext,
      reqId: feedRow.slice.reqId,
    }))
  } else if (feedRow.type === 'videoGridRow') {
    return feedRow.items.map((item, i) => ({
      item,
      feedContext: feedRow.feedContexts[i],
      reqId: feedRow.reqIds[i],
    }))
  } else {
    return []
  }
}

// DISABLED need to check if this is causing random feed refreshes -prf
// const REFRESH_AFTER = STALE.HOURS.ONE
const CHECK_LATEST_AFTER = STALE.SECONDS.THIRTY

let NoteFeed = ({
  feed,
  feedParams,
  ignoreFilterFor,
  style,
  enabled,
  pollInterval,
  disablePoll,
  scrollElRef,
  onScrolledDownChange,
  onHasNew,
  renderEmptyState,
  renderEndOfFeed,
  testID,
  headerOffset = 0,
  progressViewOffset,
  desktopFixedHeightOffset,
  ListHeaderComponent,
  extraData,
  savedFeedConfig,
  initialNumToRender: initialNumToRenderOverride,
  isVideoFeed = false,
}: {
  feed: FeedDescriptor
  feedParams?: FeedParams
  ignoreFilterFor?: string
  style?: StyleProp<ViewStyle>
  enabled?: boolean
  pollInterval?: number
  disablePoll?: boolean
  scrollElRef?: ListRef
  onHasNew?: (v: boolean) => void
  onScrolledDownChange?: (isScrolledDown: boolean) => void
  renderEmptyState: () => JSX.Element
  renderEndOfFeed?: () => JSX.Element
  testID?: string
  headerOffset?: number
  progressViewOffset?: number
  desktopFixedHeightOffset?: number
  ListHeaderComponent?: () => JSX.Element
  extraData?: any
  savedFeedConfig?: SonetSavedFeed
  initialNumToRender?: number
  isVideoFeed?: boolean
}): React.ReactNode => {
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const {currentAccount, hasSession} = useSession()
  const initialNumToRender = useInitialNumToRender()
  const feedFeedback = useFeedFeedbackContext()
  const [isPTRing, setIsPTRing] = useState(false)
  const lastFetchRef = useRef<number>(Date.now())
  const [feedType, feedUriOrActorDid, feedTab] = feed.split('|')
  const {gtMobile} = useBreakpoints()
  const {rightNavVisible} = useLayoutBreakpoints()
  const areVideoFeedsEnabled = isNative

  const [hasPressedShowLessUris, setHasPressedShowLessUris] = useState(
    () => new Set<string>(),
  )
  const onPressShowLess = useCallback(
    (interaction: SonetInteraction) => {
      if (interaction.item) {
        const uri = interaction.item
        setHasPressedShowLessUris(prev => new Set([...prev, uri]))
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      }
    },
    [],
  )

  const feedCacheKey = feedParams?.feedCacheKey
  const opts = useMemo(
    () => ({enabled, ignoreFilterFor}),
    [enabled, ignoreFilterFor],
  )
  const {
    data,
    isFetching,
    isFetched,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNoteFeedQuery(feed, feedParams, opts)
  const lastFetchedAt = data?.pages[0].fetchedAt
  if (lastFetchedAt) {
    lastFetchRef.current = lastFetchedAt
  }
  const isEmpty = useMemo(
    () => !isFetching && !data?.pages?.some(page => page.slices.length),
    [isFetching, data],
  )

  const checkForNew = useNonReactiveCallback(async () => {
    if (!data?.pages[0] || isFetching || !onHasNew || !enabled || disablePoll) {
      return
    }

    // Discover always has fresh content
    if (feedUriOrActorDid === DISCOVER_FEED_URI) {
      return onHasNew(true)
    }

    try {
      if (await pollLatest(data.pages[0])) {
        if (isEmpty) {
          refetch()
        } else {
          onHasNew(true)
        }
      }
    } catch (e) {
      logger.error('Poll latest failed', {feed, message: String(e)})
    }
  })

  const myDid = currentAccount?.userId || ''
  const onNoteCreated = useCallback(() => {
    // NOTE
    // only invalidate if there's 1 page
    // more than 1 page can trigger some UI freakouts on iOS and android
    // -prf
    if (
      data?.pages.length === 1 &&
      (feed === 'following' ||
        feed === `author|${myDid}|notes_and_author_threads`)
    ) {
      queryClient.invalidateQueries({queryKey: RQKEY(feed)})
    }
  }, [queryClient, feed, data, myDid])
  useEffect(() => {
    return listenNoteCreated(onNoteCreated)
  }, [onNoteCreated])

  useEffect(() => {
    if (enabled && !disablePoll) {
      const timeSinceFirstLoad = Date.now() - lastFetchRef.current
      if (isEmpty || timeSinceFirstLoad > CHECK_LATEST_AFTER) {
        // check for new on enable (aka on focus)
        checkForNew()
      }
    }
  }, [enabled, isEmpty, disablePoll, checkForNew])

  useEffect(() => {
    let cleanup1: () => void | undefined, cleanup2: () => void | undefined
    const subscription = AppState.addEventListener('change', nextAppState => {
      // check for new on app foreground
      if (nextAppState === 'active') {
        checkForNew()
      }
    })
    cleanup1 = () => subscription.remove()
    if (pollInterval) {
      // check for new on interval
      const i = setInterval(() => {
        checkForNew()
      }, pollInterval)
      cleanup2 = () => clearInterval(i)
    }
    return () => {
      cleanup1?.()
      cleanup2?.()
    }
  }, [pollInterval, checkForNew])

  const followProgressGuide = useProgressGuide('follow-10')
  const followAndLikeProgressGuide = useProgressGuide('like-10-and-follow-7')

  const showProgressIntersitial =
    (followProgressGuide || followAndLikeProgressGuide) && !rightNavVisible

  const {trendingDisabled, trendingVideoDisabled} = useTrendingSettings()

  const ageAssuranceBannerState = useAgeAssuranceBannerState()
  const selectedFeed = useSelectedFeed()
  /**
   * Cached value of whether the current feed was selected at startup. We don't
   * want this to update when user swipes.
   */
  const [isCurrentFeedAtStartupSelected] = useState(selectedFeed === feed)

  const feedItems: FeedRow[] = useMemo(() => {
    // wraps a slice item, and replaces it with a showLessFollowup item
    // if the user has pressed show less on it
    const sliceItem = (row: Extract<FeedRow, {type: 'sliceItem'}>) => {
      if (hasPressedShowLessUris.has(row.slice.items[row.indexInSlice]?.uri)) {
        return {
          type: 'showLessFollowup',
          key: row.key,
        } as const
      } else {
        return row
      }
    }

    let feedKind: 'following' | 'discover' | 'profile' | 'thevids' | undefined
    if (feedType === 'following') {
      feedKind = 'following'
    } else if (feedUriOrActorDid === DISCOVER_FEED_URI) {
      feedKind = 'discover'
    } else if (
      feedType === 'author' &&
      (feedTab === 'notes_and_author_threads' ||
        feedTab === 'notes_with_replies')
    ) {
      feedKind = 'profile'
    }

    let arr: FeedRow[] = []
    if (KNOWN_SHUTDOWN_FEEDS.includes(feedUriOrActorDid)) {
      arr.push({
        type: 'feedShutdownMsg',
        key: 'feedShutdownMsg',
      })
    }
    if (isFetched) {
      if (isError && isEmpty) {
        arr.push({
          type: 'error',
          key: 'error',
        })
      } else if (isEmpty) {
        arr.push({
          type: 'empty',
          key: 'empty',
        })
      } else if (data) {
        let sliceIndex = -1

        if (isVideoFeed) {
          const videos: {
            item: FeedNoteSliceItem
            feedContext: string | undefined
            reqId: string | undefined
          }[] = []
          for (const page of data.pages) {
            for (const slice of page.slices) {
              const item = slice.items.find(
                // eslint-disable-next-line @typescript-eslint/no-shadow
                item => item.uri === slice.feedNoteUri,
              )
              if (item && SonetEmbedVideo.isView(item.note.embed)) {
                videos.push({
                  item,
                  feedContext: slice.feedContext,
                  reqId: slice.reqId,
                })
              }
            }
          }

          const rows: {
            item: FeedNoteSliceItem
            feedContext: string | undefined
            reqId: string | undefined
          }[][] = []
          for (let i = 0; i < videos.length; i++) {
            const video = videos[i]
            const item = video.item
            const cols = gtMobile ? 3 : 2
            const rowItem = {
              item,
              feedContext: video.feedContext,
              reqId: video.reqId,
            }
            if (i % cols === 0) {
              rows.push([rowItem])
            } else {
              rows[rows.length - 1].push(rowItem)
            }
          }

          for (const row of rows) {
            sliceIndex++
            arr.push({
              type: 'videoGridRow',
              key: row.map(r => r.item._reactKey).join('-'),
              items: row.map(r => r.item),
              sourceFeedUri: feedUriOrActorDid,
              feedContexts: row.map(r => r.feedContext),
              reqIds: row.map(r => r.reqId),
            })
          }
        } else {
          for (const page of data?.pages) {
            for (const slice of page.slices) {
              sliceIndex++

              if (hasSession) {
                if (feedKind === 'discover') {
                  if (sliceIndex === 0) {
                    if (showProgressIntersitial) {
                      arr.push({
                        type: 'interstitialProgressGuide',
                        key: 'interstitial-' + sliceIndex + '-' + lastFetchedAt,
                      })
                    } else {
                      /*
                       * Only insert if Discover was the last selected feed at
                       * startup, the progress guide isn't shown, and the
                       * banner is eligible to be shown.
                       */
                      if (
                        isCurrentFeedAtStartupSelected &&
                        ageAssuranceBannerState.visible
                      ) {
                        arr.push({
                          type: 'ageAssuranceBanner',
                          key: 'ageAssuranceBanner-' + sliceIndex,
                        })
                      }
                    }
                    if (!rightNavVisible && !trendingDisabled) {
                      arr.push({
                        type: 'interstitialTrending',
                        key:
                          'interstitial2-' + sliceIndex + '-' + lastFetchedAt,
                      })
                    }
                  } else if (sliceIndex === 15) {
                    if (areVideoFeedsEnabled && !trendingVideoDisabled) {
                      arr.push({
                        type: 'interstitialTrendingVideos',
                        key: 'interstitial-' + sliceIndex + '-' + lastFetchedAt,
                      })
                    }
                  } else if (sliceIndex === 30) {
                    arr.push({
                      type: 'interstitialFollows',
                      key: 'interstitial-' + sliceIndex + '-' + lastFetchedAt,
                    })
                  }
                } else if (feedKind === 'profile') {
                  if (sliceIndex === 5) {
                    arr.push({
                      type: 'interstitialFollows',
                      key: 'interstitial-' + sliceIndex + '-' + lastFetchedAt,
                    })
                  }
                } else {
                  /*
                   * Only insert if this feed was the last selected feed at
                   * startup and the banner is eligible to be shown.
                   */
                  if (sliceIndex === 0 && isCurrentFeedAtStartupSelected) {
                    arr.push({
                      type: 'ageAssuranceBanner',
                      key: 'ageAssuranceBanner-' + sliceIndex,
                    })
                  }
                }
              }

              if (slice.isFallbackMarker) {
                arr.push({
                  type: 'fallbackMarker',
                  key:
                    'sliceFallbackMarker-' + sliceIndex + '-' + lastFetchedAt,
                })
              } else if (slice.isIncompleteThread && slice.items.length >= 3) {
                const beforeLast = slice.items.length - 2
                const last = slice.items.length - 1
                arr.push(
                  sliceItem({
                    type: 'sliceItem',
                    key: slice.items[0]._reactKey,
                    slice: slice,
                    indexInSlice: 0,
                    showReplyTo: false,
                  }),
                )
                arr.push({
                  type: 'sliceViewFullThread',
                  key: slice._reactKey + '-viewFullThread',
                  uri: slice.items[0].uri,
                })
                arr.push(
                  sliceItem({
                    type: 'sliceItem',
                    key: slice.items[beforeLast]._reactKey,
                    slice: slice,
                    indexInSlice: beforeLast,
                    showReplyTo:
                      slice.items[beforeLast].parentAuthor?.userId !==
                      slice.items[beforeLast].note.author.userId,
                  }),
                )
                arr.push(
                  sliceItem({
                    type: 'sliceItem',
                    key: slice.items[last]._reactKey,
                    slice: slice,
                    indexInSlice: last,
                    showReplyTo: false,
                  }),
                )
              } else {
                for (let i = 0; i < slice.items.length; i++) {
                  arr.push(
                    sliceItem({
                      type: 'sliceItem',
                      key: slice.items[i]._reactKey,
                      slice: slice,
                      indexInSlice: i,
                      showReplyTo: i === 0,
                    }),
                  )
                }
              }
            }
          }
        }
      }
      if (isError && !isEmpty) {
        arr.push({
          type: 'loadMoreError',
          key: 'loadMoreError',
        })
      }
    } else {
      if (isVideoFeed) {
        arr.push({
          type: 'videoGridRowPlaceholder',
          key: 'videoGridRowPlaceholder',
        })
      } else {
        arr.push({
          type: 'loading',
          key: 'loading',
        })
      }
    }

    return arr
  }, [
    isFetched,
    isError,
    isEmpty,
    lastFetchedAt,
    data,
    feedType,
    feedUriOrActorDid,
    feedTab,
    hasSession,
    showProgressIntersitial,
    trendingDisabled,
    trendingVideoDisabled,
    rightNavVisible,
    gtMobile,
    isVideoFeed,
    areVideoFeedsEnabled,
    hasPressedShowLessUris,
    ageAssuranceBannerState,
    isCurrentFeedAtStartupSelected,
  ])

  // events
  // =

  const onRefresh = useCallback(async () => {
    logEvent('feed:refresh', {
      feedType: feedType,
      feedUrl: feed,
      reason: 'pull-to-refresh',
    })
    setIsPTRing(true)
    try {
      await refetch()
      onHasNew?.(false)
    } catch (err) {
      logger.error('Failed to refresh notes feed', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, setIsPTRing, onHasNew, feed, feedType])

  const onEndReached = useCallback(async () => {
    if (isFetching || !hasNextPage || isError) return

    logEvent('feed:endReached', {
      feedType: feedType,
      feedUrl: feed,
      itemCount: feedItems.length,
    })
    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more notes', {message: err})
    }
  }, [
    isFetching,
    hasNextPage,
    isError,
    fetchNextPage,
    feed,
    feedType,
    feedItems.length,
  ])

  const onPressTryAgain = useCallback(() => {
    refetch()
    onHasNew?.(false)
  }, [refetch, onHasNew])

  const onPressRetryLoadMore = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  // rendering
  // =

  const renderItem = useCallback(
    ({item: row, index: rowIndex}: ListRenderItemInfo<FeedRow>) => {
      if (row.type === 'empty') {
        return renderEmptyState()
      } else if (row.type === 'error') {
        return (
          <NoteFeedErrorMessage
            feedDesc={feed}
            error={error ?? undefined}
            onPressTryAgain={onPressTryAgain}
            savedFeedConfig={savedFeedConfig}
          />
        )
      } else if (row.type === 'loadMoreError') {
        return (
          <LoadMoreRetryBtn
            label={_(
              msg`There was an issue fetching notes. Tap here to try again.`,
            )}
            onPress={onPressRetryLoadMore}
          />
        )
      } else if (row.type === 'loading') {
        return <NoteFeedLoadingPlaceholder />
      } else if (row.type === 'feedShutdownMsg') {
        return <FeedShutdownMsg feedUri={feedUriOrActorDid} />
      } else if (row.type === 'interstitialFollows') {
        return <SuggestedFollows feed={feed} />
      } else if (row.type === 'interstitialProgressGuide') {
        return <ProgressGuide />
      } else if (row.type === 'ageAssuranceBanner') {
        return <AgeAssuranceDismissibleFeedBanner />
      } else if (row.type === 'interstitialTrending') {
        return <TrendingInterstitial />
      } else if (row.type === 'interstitialTrendingVideos') {
        return <TrendingVideosInterstitial />
      } else if (row.type === 'fallbackMarker') {
        // HACK
        // tell the user we fell back to discover
        // see home.ts (feed api) for more info
        // -prf
        return <DiscoverFallbackHeader />
      } else if (row.type === 'sliceItem') {
        const slice = row.slice
        const indexInSlice = row.indexInSlice
        const item = slice.items[indexInSlice]
        return (
          <NoteFeedItem
            note={item.note}
            record={item.record}
            reason={indexInSlice === 0 ? slice.reason : undefined}
            feedContext={slice.feedContext}
            reqId={slice.reqId}
            moderation={item.moderation}
            parentAuthor={item.parentAuthor}
            showReplyTo={row.showReplyTo}
            isThreadParent={isThreadParentAt(slice.items, indexInSlice)}
            isThreadChild={isThreadChildAt(slice.items, indexInSlice)}
            isThreadLastChild={
              isThreadChildAt(slice.items, indexInSlice) &&
              slice.items.length === indexInSlice + 1
            }
            isParentBlocked={item.isParentBlocked}
            isParentNotFound={item.isParentNotFound}
            hideTopBorder={rowIndex === 0 && indexInSlice === 0}
            rootNote={slice.items[0].note}
            onShowLess={onPressShowLess}
          />
        )
      } else if (row.type === 'sliceViewFullThread') {
        return <ViewFullThread uri={row.uri} />
      } else if (row.type === 'videoGridRowPlaceholder') {
        return (
          <View>
            <NoteFeedVideoGridRowPlaceholder />
            <NoteFeedVideoGridRowPlaceholder />
            <NoteFeedVideoGridRowPlaceholder />
          </View>
        )
      } else if (row.type === 'videoGridRow') {
        let sourceContext: VideoFeedSourceContext
        if (feedType === 'author') {
          sourceContext = {
            type: 'author',
            userId: feedUriOrActorDid,
            filter: feedTab as AuthorFilter,
          }
        } else {
          sourceContext = {
            type: 'feedgen',
            uri: row.sourceFeedUri,
            sourceInterstitial: feedCacheKey ?? 'none',
          }
        }

        return (
          <NoteFeedVideoGridRow
            items={row.items}
            sourceContext={sourceContext}
          />
        )
      } else if (row.type === 'showLessFollowup') {
        return <ShowLessFollowup />
      } else {
        return null
      }
    },
    [
      renderEmptyState,
      feed,
      error,
      onPressTryAgain,
      savedFeedConfig,
      _,
      onPressRetryLoadMore,
      feedType,
      feedUriOrActorDid,
      feedTab,
      feedCacheKey,
      onPressShowLess,
    ],
  )

  const shouldRenderEndOfFeed =
    !hasNextPage && !isEmpty && !isFetching && !isError && !!renderEndOfFeed
  const FeedFooter = useCallback(() => {
    /**
     * A bit of padding at the bottom of the feed as you scroll and when you
     * reach the end, so that content isn't cut off by the bottom of the
     * screen.
     */
    const offset = Math.max(headerOffset, 32) * (isWeb ? 1 : 2)

    return isFetchingNextPage ? (
      <View style={[styles.feedFooter]}>
        <ActivityIndicator />
        <View style={{height: offset}} />
      </View>
    ) : shouldRenderEndOfFeed ? (
      <View style={{minHeight: offset}}>{renderEndOfFeed()}</View>
    ) : (
      <View style={{height: offset}} />
    )
  }, [isFetchingNextPage, shouldRenderEndOfFeed, renderEndOfFeed, headerOffset])

  const liveNowConfig = useLiveNowConfig()

  const seenActorWithStatusRef = useRef<Set<string>>(new Set())
  const onItemSeen = useCallback(
    (item: FeedRow) => {
      feedFeedback.onItemSeen(item)
      if (item.type === 'sliceItem') {
        const actor = item.slice.items[item.indexInSlice].note.author

        if (
          actor.status &&
          validateStatus(actor.userId, actor.status, liveNowConfig) &&
          isStatusStillActive(actor.status.expiresAt)
        ) {
          if (!seenActorWithStatusRef.current.has(actor.userId)) {
            seenActorWithStatusRef.current.add(actor.userId)
            logger.metric(
              'live:view:note',
              {
                subject: actor.userId,
                feed,
              },
              {statsig: false},
            )
          }
        }
      }
    },
    [feedFeedback, feed, liveNowConfig],
  )

  return (
    <View testID={testID} style={style}>
      <List
        testID={testID ? `${testID}-flatlist` : undefined}
        ref={scrollElRef}
        data={feedItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ListFooterComponent={FeedFooter}
        ListHeaderComponent={ListHeaderComponent}
        refreshing={isPTRing}
        onRefresh={onRefresh}
        headerOffset={headerOffset}
        progressViewOffset={progressViewOffset}
        contentContainerStyle={{
          minHeight: Dimensions.get('window').height * 1.5,
        }}
        onScrolledDownChange={onScrolledDownChange}
        onEndReached={onEndReached}
        onEndReachedThreshold={2} // number of notes left to trigger load more
        removeClippedSubviews={true}
        extraData={extraData}
        desktopFixedHeight={
          desktopFixedHeightOffset ? desktopFixedHeightOffset : true
        }
        initialNumToRender={initialNumToRenderOverride ?? initialNumToRender}
        windowSize={9}
        maxToRenderPerBatch={isIOS ? 5 : 1}
        updateCellsBatchingPeriod={40}
        onItemSeen={onItemSeen}
      />
    </View>
  )
}
NoteFeed = memo(NoteFeed)
export {NoteFeed}

const styles = StyleSheet.create({
  feedFooter: {paddingTop: 20},
})

export function isThreadParentAt<T>(arr: Array<T>, i: number) {
  if (arr.length === 1) {
    return false
  }
  return i < arr.length - 1
}

export function isThreadChildAt<T>(arr: Array<T>, i: number) {
  if (arr.length === 1) {
    return false
  }
  return i > 0
}
