import React, {memo, useRef, useState} from 'react'
import {useWindowDimensions, View} from 'react-native'
import {runOnJS, useAnimatedStyle} from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import {
  SonetFeedDefs,
  type SonetFeedThreadgate,
  moderateNote,
} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {HITSLOP_10} from '#/lib/constants'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {ScrollProvider} from '#/lib/ScrollContext'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {cleanError} from '#/lib/strings/errors'
import {isAndroid, isNative, isWeb} from '#/platform/detection'
import {useFeedFeedback} from '#/state/feed-feedback'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {
  fillThreadModerationCache,
  sortThread,
  type ThreadBlocked,
  type ThreadModerationCache,
  type ThreadNode,
  type ThreadNotFound,
  type ThreadNote,
  useNoteThreadQuery,
} from '#/state/queries/note-thread'
import {useSetThreadViewPreferencesMutation} from '#/state/queries/preferences'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {useUnstableNoteSource} from '#/state/unstable-note-source'
import {List, type ListMethods} from '#/view/com/util/List'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {SettingsSliderVertical_Stroke2_Corner0_Rounded as SettingsSlider} from '#/components/icons/SettingsSlider'
import {Header} from '#/components/Layout'
import {ListFooter, ListMaybePlaceholder} from '#/components/Lists'
import * as Menu from '#/components/Menu'
import {Text} from '#/components/Typography'
import {NoteThreadComposePrompt} from './NoteThreadComposePrompt'
import {NoteThreadItem} from './NoteThreadItem'
import {NoteThreadLoadMore} from './NoteThreadLoadMore'
import {NoteThreadShowHiddenReplies} from './NoteThreadShowHiddenReplies'

// FlatList maintainVisibleContentPosition breaks if too many items
// are prepended. This seems to be an optimal number based on *shrug*.
const PARENTS_CHUNK_SIZE = 15

const MAINTAIN_VISIBLE_CONTENT_POSITION = {
  // We don't insert any elements before the root row while loading.
  // So the row we want to use as the scroll anchor is the first row.
  minIndexForVisible: 0,
}

const REPLY_PROMPT = {_reactKey: '__reply__'}
const LOAD_MORE = {_reactKey: '__load_more__'}
const SHOW_HIDDEN_REPLIES = {_reactKey: '__show_hidden_replies__'}
const SHOW_MUTED_REPLIES = {_reactKey: '__show_muted_replies__'}

enum HiddenRepliesState {
  Hide,
  Show,
  ShowAndOverrideNoteHider,
}

type YieldedItem =
  | ThreadNote
  | ThreadBlocked
  | ThreadNotFound
  | typeof SHOW_HIDDEN_REPLIES
  | typeof SHOW_MUTED_REPLIES
type RowItem =
  | YieldedItem
  // TODO: TS doesn't actually enforce it's one of these, it only enforces matching shape.
  | typeof REPLY_PROMPT
  | typeof LOAD_MORE

type ThreadSkeletonParts = {
  parents: YieldedItem[]
  highlightedNote: ThreadNode
  replies: YieldedItem[]
}

const keyExtractor = (item: RowItem) => {
  return item._reactKey
}

export function NoteThread({uri}: {uri: string}) {
  const {hasSession, currentAccount} = useSession()
  const {_} = useLingui()
  const t = useTheme()
  const {isMobile} = useWebMediaQueries()
  const initialNumToRender = useInitialNumToRender()
  const {height: windowHeight} = useWindowDimensions()
  const [hiddenRepliesState, setHiddenRepliesState] = React.useState(
    HiddenRepliesState.Hide,
  )
  const headerRef = React.useRef<View | null>(null)
  const anchorNoteSource = useUnstableNoteSource(uri)
  const feedFeedback = useFeedFeedback(anchorNoteSource?.feed, hasSession)

  const {data: preferences} = usePreferencesQuery()
  const {
    isFetching,
    isError: isThreadError,
    error: threadError,
    refetch,
    data: {thread, threadgate} = {},
    dataUpdatedAt: fetchedAt,
  } = useNoteThreadQuery(uri)

  // The original source of truth for these are the server settings.
  const serverPrefs = preferences?.threadViewPrefs
  const serverPrioritizeFollowedUsers =
    serverPrefs?.prioritizeFollowedUsers ?? true
  const serverTreeViewEnabled = serverPrefs?.lab_treeViewEnabled ?? false
  const serverSortReplies = serverPrefs?.sort ?? 'hotness'

  // However, we also need these to work locally for PWI (without persistence).
  // So we're mirroring them locally.
  const prioritizeFollowedUsers = serverPrioritizeFollowedUsers
  const [treeViewEnabled, setTreeViewEnabled] = useState(serverTreeViewEnabled)
  const [sortReplies, setSortReplies] = useState(serverSortReplies)

  // We'll reset the local state if new server state flows down to us.
  const [prevServerPrefs, setPrevServerPrefs] = useState(serverPrefs)
  if (prevServerPrefs !== serverPrefs) {
    setPrevServerPrefs(serverPrefs)
    setTreeViewEnabled(serverTreeViewEnabled)
    setSortReplies(serverSortReplies)
  }

  // And we'll update the local state when mutating the server prefs.
  const {mutate: mutateThreadViewPrefs} = useSetThreadViewPreferencesMutation()
  function updateTreeViewEnabled(newTreeViewEnabled: boolean) {
    setTreeViewEnabled(newTreeViewEnabled)
    if (hasSession) {
      mutateThreadViewPrefs({lab_treeViewEnabled: newTreeViewEnabled})
    }
  }
  function updateSortReplies(newSortReplies: string) {
    setSortReplies(newSortReplies)
    if (hasSession) {
      mutateThreadViewPrefs({sort: newSortReplies})
    }
  }

  const treeView = React.useMemo(
    () => treeViewEnabled && hasBranchingReplies(thread),
    [treeViewEnabled, thread],
  )

  const rootNote = thread?.type === 'note' ? thread.note : undefined
  const rootNoteRecord = thread?.type === 'note' ? thread.record : undefined
  const threadgateRecord = threadgate?.record as
    | SonetFeedThreadgate.Record
    | undefined
  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
  })

  const moderationOpts = useModerationOpts()
  const isNoPwi = React.useMemo(() => {
    const mod =
      rootNote && moderationOpts
        ? moderateNote(rootNote, moderationOpts)
        : undefined
    return !!mod
      ?.ui('contentList')
      .blurs.find(
        cause =>
          cause.type === 'label' &&
          cause.labelDef.identifier === '!no-unauthenticated',
      )
  }, [rootNote, moderationOpts])

  // Values used for proper rendering of parents
  const ref = useRef<ListMethods>(null)
  const highlightedNoteRef = useRef<View | null>(null)
  const [maxParents, setMaxParents] = React.useState(
    isWeb ? Infinity : PARENTS_CHUNK_SIZE,
  )
  const [maxReplies, setMaxReplies] = React.useState(50)

  useSetTitle(
    rootNote && !isNoPwi
      ? `${sanitizeDisplayName(
          rootNote.author.displayName || `@${rootNote.author.username}`,
        )}: "${rootNoteRecord!.text}"`
      : '',
  )

  // On native, this is going to start out `true`. We'll toggle it to `false` after the initial render if flushed.
  // This ensures that the first render contains no parents--even if they are already available in the cache.
  // We need to delay showing them so that we can use maintainVisibleContentPosition to keep the main note on screen.
  // On the web this is not necessary because we can synchronously adjust the scroll in onContentSizeChange instead.
  const [deferParents, setDeferParents] = React.useState(isNative)

  const currentDid = currentAccount?.userId
  const threadModerationCache = React.useMemo(() => {
    const cache: ThreadModerationCache = new WeakMap()
    if (thread && moderationOpts) {
      fillThreadModerationCache(cache, thread, moderationOpts)
    }
    return cache
  }, [thread, moderationOpts])

  const [justNoteedUris, setJustNoteedUris] = React.useState(
    () => new Set<string>(),
  )

  const [fetchedAtCache] = React.useState(() => new Map<string, number>())
  const [randomCache] = React.useState(() => new Map<string, number>())
  const skeleton = React.useMemo(() => {
    if (!thread) return null
    return createThreadSkeleton(
      sortThread(
        thread,
        {
          // Prefer local state as the source of truth.
          sort: sortReplies,
          lab_treeViewEnabled: treeViewEnabled,
          prioritizeFollowedUsers,
        },
        threadModerationCache,
        currentDid,
        justNoteedUris,
        threadgateHiddenReplies,
        fetchedAtCache,
        fetchedAt,
        randomCache,
      ),
      currentDid,
      treeView,
      threadModerationCache,
      hiddenRepliesState !== HiddenRepliesState.Hide,
      threadgateHiddenReplies,
    )
  }, [
    thread,
    prioritizeFollowedUsers,
    sortReplies,
    treeViewEnabled,
    currentDid,
    treeView,
    threadModerationCache,
    hiddenRepliesState,
    justNoteedUris,
    threadgateHiddenReplies,
    fetchedAtCache,
    fetchedAt,
    randomCache,
  ])

  const error = React.useMemo(() => {
    if (SonetFeedDefs.isNotFoundNote(thread)) {
      return {
        title: _(msg`Note not found`),
        message: _(msg`The note may have been deleted.`),
      }
    } else if (skeleton?.highlightedNote.type === 'blocked') {
      return {
        title: _(msg`Note hidden`),
        message: _(
          msg`You have blocked the author or you have been blocked by the author.`,
        ),
      }
    } else if (threadError?.message.startsWith('Note not found')) {
      return {
        title: _(msg`Note not found`),
        message: _(msg`The note may have been deleted.`),
      }
    } else if (isThreadError) {
      return {
        message: threadError ? cleanError(threadError) : undefined,
      }
    }

    return null
  }, [thread, skeleton?.highlightedNote, isThreadError, _, threadError])

  // construct content
  const notes = React.useMemo(() => {
    if (!skeleton) return []

    const {parents, highlightedNote, replies} = skeleton
    let arr: RowItem[] = []
    if (highlightedNote.type === 'note') {
      // We want to wait for parents to load before rendering.
      // If you add something here, you'll need to update both
      // maintainVisibleContentPosition and onContentSizeChange
      // to "hold onto" the correct row instead of the first one.

      /*
       * This is basically `!!parents.length`, see notes on `isParentLoading`
       */
      if (!highlightedNote.ctx.isParentLoading && !deferParents) {
        // When progressively revealing parents, rendering a placeholder
        // here will cause scrolling jumps. Don't add it unless you test it.
        // QT'ing this thread is a great way to test all the scrolling hacks:
        // https://sonet.app/profile/samuel.bsky.team/note/3kjqhblh6qk2o

        // Everything is loaded
        let startIndex = Math.max(0, parents.length - maxParents)
        for (let i = startIndex; i < parents.length; i++) {
          arr.push(parents[i])
        }
      }
      arr.push(highlightedNote)
      if (!highlightedNote.note.viewer?.replyDisabled) {
        arr.push(REPLY_PROMPT)
      }
      for (let i = 0; i < replies.length; i++) {
        arr.push(replies[i])
        if (i === maxReplies) {
          break
        }
      }
    }
    return arr
  }, [skeleton, deferParents, maxParents, maxReplies])

  // This is only used on the web to keep the note in view when its parents load.
  // On native, we rely on `maintainVisibleContentPosition` instead.
  const userIdAdjustScrollWeb = useRef<boolean>(false)
  const onContentSizeChangeWeb = React.useCallback(() => {
    // only run once
    if (userIdAdjustScrollWeb.current) {
      return
    }
    // wait for loading to finish
    if (thread?.type === 'note' && !!thread.parent) {
      // Measure synchronously to avoid a layout jump.
      const noteNode = highlightedNoteRef.current
      const headerNode = headerRef.current
      if (noteNode && headerNode) {
        let pageY = (noteNode as any as Element).getBoundingClientRect().top
        pageY -= (headerNode as any as Element).getBoundingClientRect().height
        pageY = Math.max(0, pageY)
        ref.current?.scrollToOffset({
          animated: false,
          offset: pageY,
        })
      }
      userIdAdjustScrollWeb.current = true
    }
  }, [thread])

  // On native, we reveal parents in chunks. Although they're all already
  // loaded and FlatList already has its own virtualization, unfortunately FlatList
  // has a bug that causes the content to jump around if too many items are getting
  // prepended at once. It also jumps around if items get prepended during scroll.
  // To work around this, we prepend rows after scroll bumps against the top and rests.
  const needsBumpMaxParents = React.useRef(false)
  const onStartReached = React.useCallback(() => {
    if (skeleton?.parents && maxParents < skeleton.parents.length) {
      needsBumpMaxParents.current = true
    }
  }, [maxParents, skeleton?.parents])
  const bumpMaxParentsIfNeeded = React.useCallback(() => {
    if (!isNative) {
      return
    }
    if (needsBumpMaxParents.current) {
      needsBumpMaxParents.current = false
      setMaxParents(n => n + PARENTS_CHUNK_SIZE)
    }
  }, [])
  const onScrollToTop = bumpMaxParentsIfNeeded
  const onMomentumEnd = React.useCallback(() => {
    'worklet'
    runOnJS(bumpMaxParentsIfNeeded)()
  }, [bumpMaxParentsIfNeeded])

  const onEndReached = React.useCallback(() => {
    if (isFetching || notes.length < maxReplies) return
    setMaxReplies(prev => prev + 50)
  }, [isFetching, maxReplies, notes.length])

  const onNoteReply = React.useCallback(
    (noteUri: string | undefined) => {
      refetch()
      if (noteUri) {
        setJustNoteedUris(set => {
          const nextSet = new Set(set)
          nextSet.add(noteUri)
          return nextSet
        })
      }
    },
    [refetch],
  )

  const {openComposer} = useOpenComposer()
  const onReplyToAnchor = React.useCallback(() => {
    if (thread?.type !== 'note') {
      return
    }
    if (anchorNoteSource) {
      feedFeedback.sendInteraction({
        item: thread.note.uri,
        event: 'app.sonet.feed.defs#interactionReply',
        feedContext: anchorNoteSource.note.feedContext,
        reqId: anchorNoteSource.note.reqId,
      })
    }
    openComposer({
      replyTo: {
        uri: thread.note.uri,
        cid: thread.note.cid,
        text: thread.record.text,
        author: thread.note.author,
        embed: thread.note.embed,
        moderation: threadModerationCache.get(thread),
      },
      onNote: onNoteReply,
    })
  }, [
    openComposer,
    thread,
    onNoteReply,
    threadModerationCache,
    anchorNoteSource,
    feedFeedback,
  ])

  const canReply = !error && rootNote && !rootNote.viewer?.replyDisabled
  const hasParents =
    skeleton?.highlightedNote?.type === 'note' &&
    (skeleton.highlightedNote.ctx.isParentLoading ||
      Boolean(skeleton?.parents && skeleton.parents.length > 0))

  const renderItem = ({item, index}: {item: RowItem; index: number}) => {
    if (item === REPLY_PROMPT && hasSession) {
      return (
        <View>
          {!isMobile && (
            <NoteThreadComposePrompt onPressCompose={onReplyToAnchor} />
          )}
        </View>
      )
    } else if (item === SHOW_HIDDEN_REPLIES || item === SHOW_MUTED_REPLIES) {
      return (
        <NoteThreadShowHiddenReplies
          type={item === SHOW_HIDDEN_REPLIES ? 'hidden' : 'muted'}
          onPress={() =>
            setHiddenRepliesState(
              item === SHOW_HIDDEN_REPLIES
                ? HiddenRepliesState.Show
                : HiddenRepliesState.ShowAndOverrideNoteHider,
            )
          }
          hideTopBorder={index === 0}
        />
      )
    } else if (isThreadNotFound(item)) {
      return (
        <View
          style={[
            a.p_lg,
            index !== 0 && a.border_t,
            t.atoms.border_contrast_low,
            t.atoms.bg_contrast_25,
          ]}>
          <Text style={[a.font_bold, a.text_md, t.atoms.text_contrast_medium]}>
            <Trans>Deleted note.</Trans>
          </Text>
        </View>
      )
    } else if (isThreadBlocked(item)) {
      return (
        <View
          style={[
            a.p_lg,
            index !== 0 && a.border_t,
            t.atoms.border_contrast_low,
            t.atoms.bg_contrast_25,
          ]}>
          <Text style={[a.font_bold, a.text_md, t.atoms.text_contrast_medium]}>
            <Trans>Blocked note.</Trans>
          </Text>
        </View>
      )
    } else if (isThreadNote(item)) {
      const prev = isThreadNote(notes[index - 1])
        ? (notes[index - 1] as ThreadNote)
        : undefined
      const next = isThreadNote(notes[index + 1])
        ? (notes[index + 1] as ThreadNote)
        : undefined
      const showChildReplyLine = (next?.ctx.depth || 0) > item.ctx.depth
      const showParentReplyLine =
        (item.ctx.depth < 0 && !!item.parent) || item.ctx.depth > 1
      const hasUnrevealedParents =
        index === 0 && skeleton?.parents && maxParents < skeleton.parents.length

      if (!treeView && prev && item.ctx.hasMoreSelfThread) {
        return <NoteThreadLoadMore note={prev.note} />
      }

      return (
        <View
          ref={item.ctx.isHighlightedNote ? highlightedNoteRef : undefined}
          onLayout={deferParents ? () => setDeferParents(false) : undefined}>
          <NoteThreadItem
            note={item.note}
            record={item.record}
            threadgateRecord={threadgateRecord ?? undefined}
            moderation={threadModerationCache.get(item)}
            treeView={treeView}
            depth={item.ctx.depth}
            prevNote={prev}
            nextNote={next}
            isHighlightedNote={item.ctx.isHighlightedNote}
            hasMore={item.ctx.hasMore}
            showChildReplyLine={showChildReplyLine}
            showParentReplyLine={showParentReplyLine}
            hasPrecedingItem={showParentReplyLine || !!hasUnrevealedParents}
            overrideBlur={
              hiddenRepliesState ===
                HiddenRepliesState.ShowAndOverrideNoteHider &&
              item.ctx.depth > 0
            }
            onNoteReply={onNoteReply}
            hideTopBorder={index === 0 && !item.ctx.isParentLoading}
            anchorNoteSource={anchorNoteSource}
          />
        </View>
      )
    }
    return null
  }

  if (!thread || !preferences || error) {
    return (
      <ListMaybePlaceholder
        isLoading={!error}
        isError={Boolean(error)}
        noEmpty
        onRetry={refetch}
        errorTitle={error?.title}
        errorMessage={error?.message}
      />
    )
  }

  return (
    <>
      <Header.Outer headerRef={headerRef}>
        <Header.BackButton />
        <Header.Content>
          <Header.TitleText>
            <Trans context="description">Note</Trans>
          </Header.TitleText>
        </Header.Content>
        <Header.Slot>
          <ThreadMenu
            sortReplies={sortReplies}
            treeViewEnabled={treeViewEnabled}
            setSortReplies={updateSortReplies}
            setTreeViewEnabled={updateTreeViewEnabled}
          />
        </Header.Slot>
      </Header.Outer>

      <ScrollProvider onMomentumEnd={onMomentumEnd}>
        <List
          ref={ref}
          data={notes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onContentSizeChange={isNative ? undefined : onContentSizeChangeWeb}
          onStartReached={onStartReached}
          onEndReached={onEndReached}
          onEndReachedThreshold={2}
          onScrollToTop={onScrollToTop}
          /**
           * @see https://reactnative.dev/docs/scrollview#maintainvisiblecontentposition
           */
          maintainVisibleContentPosition={
            isNative && hasParents
              ? MAINTAIN_VISIBLE_CONTENT_POSITION
              : undefined
          }
          desktopFixedHeight
          removeClippedSubviews={isAndroid ? false : undefined}
          ListFooterComponent={
            <ListFooter
              // Using `isFetching` over `isFetchingNextPage` is done on purpose here so we get the loader on
              // initial render
              isFetchingNextPage={isFetching}
              error={cleanError(threadError)}
              onRetry={refetch}
              // 300 is based on the minimum height of a note. This is enough extra height for the `maintainVisPos` to
              // work without causing weird jumps on web or glitches on native
              height={windowHeight - 200}
            />
          }
          initialNumToRender={initialNumToRender}
          windowSize={11}
          sideBorders={false}
        />
      </ScrollProvider>
      {isMobile && canReply && hasSession && (
        <MobileComposePrompt onPressReply={onReplyToAnchor} />
      )}
    </>
  )
}

let ThreadMenu = ({
  sortReplies,
  treeViewEnabled,
  setSortReplies,
  setTreeViewEnabled,
}: {
  sortReplies: string
  treeViewEnabled: boolean
  setSortReplies: (newValue: string) => void
  setTreeViewEnabled: (newValue: boolean) => void
}): React.ReactNode => {
  const {_} = useLingui()
  return (
    <Menu.Root>
      <Menu.Trigger label={_(msg`Thread options`)}>
        {({props}) => (
          <Button
            label={_(msg`Thread options`)}
            size="small"
            variant="ghost"
            color="secondary"
            shape="round"
            hitSlop={HITSLOP_10}
            {...props}>
            <ButtonIcon icon={SettingsSlider} size="md" />
          </Button>
        )}
      </Menu.Trigger>
      <Menu.Outer>
        <Menu.LabelText>
          <Trans>Show replies as</Trans>
        </Menu.LabelText>
        <Menu.Group>
          <Menu.Item
            label={_(msg`Linear`)}
            onPress={() => {
              setTreeViewEnabled(false)
            }}>
            <Menu.ItemText>
              <Trans>Linear</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={!treeViewEnabled} />
          </Menu.Item>
          <Menu.Item
            label={_(msg`Threaded`)}
            onPress={() => {
              setTreeViewEnabled(true)
            }}>
            <Menu.ItemText>
              <Trans>Threaded</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={treeViewEnabled} />
          </Menu.Item>
        </Menu.Group>
        <Menu.Divider />
        <Menu.LabelText>
          <Trans>Reply sorting</Trans>
        </Menu.LabelText>
        <Menu.Group>
          <Menu.Item
            label={_(msg`Hot replies first`)}
            onPress={() => {
              setSortReplies('hotness')
            }}>
            <Menu.ItemText>
              <Trans>Hot replies first</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={sortReplies === 'hotness'} />
          </Menu.Item>
          <Menu.Item
            label={_(msg`Oldest replies first`)}
            onPress={() => {
              setSortReplies('oldest')
            }}>
            <Menu.ItemText>
              <Trans>Oldest replies first</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={sortReplies === 'oldest'} />
          </Menu.Item>
          <Menu.Item
            label={_(msg`Newest replies first`)}
            onPress={() => {
              setSortReplies('newest')
            }}>
            <Menu.ItemText>
              <Trans>Newest replies first</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={sortReplies === 'newest'} />
          </Menu.Item>
          <Menu.Item
            label={_(msg`Most-liked replies first`)}
            onPress={() => {
              setSortReplies('most-likes')
            }}>
            <Menu.ItemText>
              <Trans>Most-liked replies first</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={sortReplies === 'most-likes'} />
          </Menu.Item>
          <Menu.Item
            label={_(msg`Random (aka "Noteer's Roulette")`)}
            onPress={() => {
              setSortReplies('random')
            }}>
            <Menu.ItemText>
              <Trans>Random (aka "Noteer's Roulette")</Trans>
            </Menu.ItemText>
            <Menu.ItemRadio selected={sortReplies === 'random'} />
          </Menu.Item>
        </Menu.Group>
      </Menu.Outer>
    </Menu.Root>
  )
}
ThreadMenu = memo(ThreadMenu)

function MobileComposePrompt({onPressReply}: {onPressReply: () => unknown}) {
  const {footerHeight} = useShellLayout()

  const animatedStyle = useAnimatedStyle(() => {
    return {
      bottom: footerHeight.get(),
    }
  })

  return (
    <Animated.View style={[a.fixed, a.left_0, a.right_0, animatedStyle]}>
      <NoteThreadComposePrompt onPressCompose={onPressReply} />
    </Animated.View>
  )
}

function isThreadNote(v: unknown): v is ThreadNote {
  return !!v && typeof v === 'object' && 'type' in v && v.type === 'note'
}

function isThreadNotFound(v: unknown): v is ThreadNotFound {
  return !!v && typeof v === 'object' && 'type' in v && v.type === 'not-found'
}

function isThreadBlocked(v: unknown): v is ThreadBlocked {
  return !!v && typeof v === 'object' && 'type' in v && v.type === 'blocked'
}

function createThreadSkeleton(
  node: ThreadNode,
  currentDid: string | undefined,
  treeView: boolean,
  modCache: ThreadModerationCache,
  showHiddenReplies: boolean,
  threadgateRecordHiddenReplies: Set<string>,
): ThreadSkeletonParts | null {
  if (!node) return null

  return {
    parents: Array.from(flattenThreadParents(node, !!currentDid)),
    highlightedNote: node,
    replies: Array.from(
      flattenThreadReplies(
        node,
        currentDid,
        treeView,
        modCache,
        showHiddenReplies,
        threadgateRecordHiddenReplies,
      ),
    ),
  }
}

function* flattenThreadParents(
  node: ThreadNode,
  hasSession: boolean,
): Generator<YieldedItem, void> {
  if (node.type === 'note') {
    if (node.parent) {
      yield* flattenThreadParents(node.parent, hasSession)
    }
    if (!node.ctx.isHighlightedNote) {
      yield node
    }
  } else if (node.type === 'not-found') {
    yield node
  } else if (node.type === 'blocked') {
    yield node
  }
}

// The enum is ordered to make them easy to merge
enum HiddenReplyType {
  None = 0,
  Muted = 1,
  Hidden = 2,
}

function* flattenThreadReplies(
  node: ThreadNode,
  currentDid: string | undefined,
  treeView: boolean,
  modCache: ThreadModerationCache,
  showHiddenReplies: boolean,
  threadgateRecordHiddenReplies: Set<string>,
): Generator<YieldedItem, HiddenReplyType> {
  if (node.type === 'note') {
    // dont show pwi-opted-out notes to logged out users
    if (!currentDid && hasPwiOptOut(node)) {
      return HiddenReplyType.None
    }

    // username blurred items
    if (node.ctx.depth > 0) {
      const modui = modCache.get(node)?.ui('contentList')
      if (modui?.blur || modui?.filter) {
        if (!showHiddenReplies || node.ctx.depth > 1) {
          if ((modui.blurs[0] || modui.filters[0]).type === 'muted') {
            return HiddenReplyType.Muted
          }
          return HiddenReplyType.Hidden
        }
      }

      if (!showHiddenReplies) {
        const hiddenByThreadgate = threadgateRecordHiddenReplies.has(
          node.note.uri,
        )
        const authorIsViewer = node.note.author.userId === currentDid
        if (hiddenByThreadgate && !authorIsViewer) {
          return HiddenReplyType.Hidden
        }
      }
    }

    if (!node.ctx.isHighlightedNote) {
      yield node
    }

    if (node.replies?.length) {
      let hiddenReplies = HiddenReplyType.None
      for (const reply of node.replies) {
        let hiddenReply = yield* flattenThreadReplies(
          reply,
          currentDid,
          treeView,
          modCache,
          showHiddenReplies,
          threadgateRecordHiddenReplies,
        )
        if (hiddenReply > hiddenReplies) {
          hiddenReplies = hiddenReply
        }
        if (!treeView && !node.ctx.isHighlightedNote) {
          break
        }
      }

      // show control to enable hidden replies
      if (node.ctx.depth === 0) {
        if (hiddenReplies === HiddenReplyType.Muted) {
          yield SHOW_MUTED_REPLIES
        } else if (hiddenReplies === HiddenReplyType.Hidden) {
          yield SHOW_HIDDEN_REPLIES
        }
      }
    }
  } else if (node.type === 'not-found') {
    yield node
  } else if (node.type === 'blocked') {
    yield node
  }
  return HiddenReplyType.None
}

function hasPwiOptOut(node: ThreadNote) {
  return !!node.note.author.labels?.find(l => l.val === '!no-unauthenticated')
}

function hasBranchingReplies(node?: ThreadNode) {
  if (!node) {
    return false
  }
  if (node.type !== 'note') {
    return false
  }
  if (!node.replies) {
    return false
  }
  if (node.replies.length === 1) {
    return hasBranchingReplies(node.replies[0])
  }
  return true
}
