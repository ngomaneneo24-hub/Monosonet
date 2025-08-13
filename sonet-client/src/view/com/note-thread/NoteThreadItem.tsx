import {memo, useCallback, useMemo, useState} from 'react'
import {
  type GestureResponderEvent,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native'
import { type SonetNote, type SonetProfile, type SonetFeedGenerator, type SonetNoteRecord, type SonetFeedViewNote, type SonetInteraction, type SonetSavedFeed } from '#/types/sonet'
import {msg, Plural, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useActorStatus} from '#/lib/actor-status'
import {MAX_NOTE_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {countLines} from '#/lib/strings/helpers'
import {niceDate} from '#/lib/strings/time'
import {s} from '#/lib/styles'
import {getTranslatorLink, isNoteInLanguage} from '#/locale/helpers'
import {logger} from '#/logger'
import {
  NOTE_TOMBSTONE,
  type Shadow,
  useNoteShadow,
} from '#/state/cache/note-shadow'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {FeedFeedbackProvider, useFeedFeedback} from '#/state/feed-feedback'
import {useLanguagePrefs} from '#/state/preferences'
import {type ThreadNote} from '#/state/queries/note-thread'
import {useSession} from '#/state/session'
import {type OnNoteSuccessData} from '#/state/shell/composer'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {type NoteSource} from '#/state/unstable-note-source'
import {NoteThreadFollowBtn} from '#/view/com/note-thread/NoteThreadFollowBtn'
import {ErrorMessage} from '#/view/com/util/error/ErrorMessage'
import {Link} from '#/view/com/util/Link'
import {formatCount} from '#/view/com/util/numeric/format'
import {NoteMeta} from '#/view/com/util/NoteMeta'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {colors} from '#/components/Admonition'
import {Button} from '#/components/Button'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {CalendarClock_Stroke2_Corner0_Rounded as CalendarClockIcon} from '#/components/icons/CalendarClock'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon} from '#/components/icons/Chevron'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {InlineLinkText} from '#/components/Link'
import {ContentHider} from '#/components/moderation/ContentHider'
import {LabelsOnMyNote} from '#/components/moderation/LabelsOnMe'
import {NoteAlerts} from '#/components/moderation/NoteAlerts'
import {NoteHider} from '#/components/moderation/NoteHider'
import {type AppModerationCause} from '#/components/Pills'
import {Embed, NoteEmbedViewContext} from '#/components/Note/Embed'
import {ShowMoreTextButton} from '#/components/Note/ShowMoreTextButton'
import {NoteControls} from '#/components/NoteControls'
import * as Prompt from '#/components/Prompt'
import {string} from '#/components/string'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import {Text} from '#/components/Typography'
import {VerificationCheckButton} from '#/components/verification/VerificationCheckButton'
import {WhoCanReply} from '#/components/WhoCanReply'
import * as bsky from '#/types/bsky'

export function NoteThreadItem({
  note,
  record,
  moderation,
  treeView,
  depth,
  prevNote,
  nextNote,
  isHighlightedNote,
  hasMore,
  showChildReplyLine,
  showParentReplyLine,
  hasPrecedingItem,
  overrideBlur,
  onNoteReply,
  onNoteSuccess,
  hideTopBorder,
  threadgateRecord,
  anchorNoteSource,
}: {
  note: SonetNote
  record: SonetNoteRecord
  moderation: SonetModerationDecision | undefined
  treeView: boolean
  depth: number
  prevNote: ThreadNote | undefined
  nextNote: ThreadNote | undefined
  isHighlightedNote?: boolean
  hasMore?: boolean
  showChildReplyLine?: boolean
  showParentReplyLine?: boolean
  hasPrecedingItem: boolean
  overrideBlur: boolean
  onNoteReply: (noteUri: string | undefined) => void
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  hideTopBorder?: boolean
  threadgateRecord?: SonetFeedThreadgate.Record
  anchorNoteSource?: NoteSource
}) {
  const noteShadowed = useNoteShadow(note)
  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: record.text,
        facets: record.facets,
      }),
    [record],
  )
  if (noteShadowed === NOTE_TOMBSTONE) {
    return <NoteThreadItemDeleted hideTopBorder={hideTopBorder} />
  }
  if (richText && moderation) {
    return (
      <NoteThreadItemLoaded
        // Safeguard from clobbering per-note state below:
        key={noteShadowed.uri}
        note={noteShadowed}
        prevNote={prevNote}
        nextNote={nextNote}
        record={record}
        richText={richText}
        moderation={moderation}
        treeView={treeView}
        depth={depth}
        isHighlightedNote={isHighlightedNote}
        hasMore={hasMore}
        showChildReplyLine={showChildReplyLine}
        showParentReplyLine={showParentReplyLine}
        hasPrecedingItem={hasPrecedingItem}
        overrideBlur={overrideBlur}
        onNoteReply={onNoteReply}
        onNoteSuccess={onNoteSuccess}
        hideTopBorder={hideTopBorder}
        threadgateRecord={threadgateRecord}
        anchorNoteSource={anchorNoteSource}
      />
    )
  }
  return null
}

function NoteThreadItemDeleted({hideTopBorder}: {hideTopBorder?: boolean}) {
  const t = useTheme()
  return (
    <View
      style={[
        t.atoms.bg,
        t.atoms.border_contrast_low,
        a.p_xl,
        a.pl_lg,
        a.flex_row,
        a.gap_md,
        !hideTopBorder && a.border_t,
      ]}>
      <TrashIcon style={[t.atoms.text]} />
      <Text style={[t.atoms.text_contrast_medium, a.mt_2xs]}>
        <Trans>This note has been deleted.</Trans>
      </Text>
    </View>
  )
}

let NoteThreadItemLoaded = ({
  note,
  record,
  richText,
  moderation,
  treeView,
  depth,
  prevNote,
  nextNote,
  isHighlightedNote,
  hasMore,
  showChildReplyLine,
  showParentReplyLine,
  hasPrecedingItem,
  overrideBlur,
  onNoteReply,
  onNoteSuccess,
  hideTopBorder,
  threadgateRecord,
  anchorNoteSource,
}: {
  note: Shadow<SonetNote>
  record: SonetNoteRecord
  richText: RichTextAPI
  moderation: SonetModerationDecision
  treeView: boolean
  depth: number
  prevNote: ThreadNote | undefined
  nextNote: ThreadNote | undefined
  isHighlightedNote?: boolean
  hasMore?: boolean
  showChildReplyLine?: boolean
  showParentReplyLine?: boolean
  hasPrecedingItem: boolean
  overrideBlur: boolean
  onNoteReply: (noteUri: string | undefined) => void
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  hideTopBorder?: boolean
  threadgateRecord?: SonetFeedThreadgate.Record
  anchorNoteSource?: NoteSource
}): React.ReactNode => {
  const {currentAccount, hasSession} = useSession()
  const feedFeedback = useFeedFeedback(anchorNoteSource?.feed, hasSession)

  const t = useTheme()
  const pal = usePalette('default')
  const {_, i18n} = useLingui()
  const langPrefs = useLanguagePrefs()
  const {openComposer} = useOpenComposer()
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText?.text) >= MAX_NOTE_LINES,
  )
  const shadowedNoteAuthor = useProfileShadow(note.author)
  const rootUri = record.reply?.root?.uri || note.uri
  const noteHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey)
  }, [note.uri, note.author])
  const itemTitle = _(msg`Note by ${note.author.username}`)
  const authorHref = makeProfileLink(note.author)
  const authorTitle = note.author.username
  const isThreadAuthor = getThreadAuthor(note, record) === currentAccount?.userId
  const likesHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey, 'liked-by')
  }, [note.uri, note.author])
  const likesTitle = _(msg`Likes on this note`)
  const renotesHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey, 'renoteed-by')
  }, [note.uri, note.author])
  const renotesTitle = _(msg`Renotes of this note`)
  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
  })
  const additionalNoteAlerts: AppModerationCause[] = useMemo(() => {
    const isNoteHiddenByThreadgate = threadgateHiddenReplies.has(note.uri)
    const isControlledByViewer = new SonetUri(rootUri).host === currentAccount?.userId
    return isControlledByViewer && isNoteHiddenByThreadgate
      ? [
          {
            type: 'reply-hidden',
            source: {type: 'user', userId: currentAccount?.userId},
            priority: 6,
          },
        ]
      : []
  }, [note, currentAccount?.userId, threadgateHiddenReplies, rootUri])
  const quotesHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey, 'quotes')
  }, [note.uri, note.author])
  const quotesTitle = _(msg`Quotes of this note`)
  const onlyFollowersCanReply = !!threadgateRecord?.allow?.find(
    rule => rule.$type === 'app.sonet.feed.threadgate#followerRule',
  )
  const showFollowButton =
    currentAccount?.userId !== note.author.userId && !onlyFollowersCanReply

  const translatorUrl = getTranslatorLink(
    record?.text || '',
    langPrefs.primaryLanguage,
  )
  const needsTranslation = useMemo(
    () =>
      Boolean(
        langPrefs.primaryLanguage &&
          !isNoteInLanguage(note, [langPrefs.primaryLanguage]),
      ),
    [note, langPrefs.primaryLanguage],
  )

  const onPressReply = () => {
    if (anchorNoteSource && isHighlightedNote) {
      feedFeedback.sendInteraction({
        item: note.uri,
        event: 'app.sonet.feed.defs#interactionReply',
        feedContext: anchorNoteSource.note.feedContext,
        reqId: anchorNoteSource.note.reqId,
      })
    }
    openComposer({
      replyTo: {
        uri: note.uri,
        cid: note.cid,
        text: record.text,
        author: note.author,
        embed: note.embed,
        moderation,
      },
      onNote: onNoteReply,
      onNoteSuccess: onNoteSuccess,
    })
  }

  const onOpenAuthor = () => {
    if (anchorNoteSource) {
      feedFeedback.sendInteraction({
        item: note.uri,
        event: 'app.sonet.feed.defs#clickthroughAuthor',
        feedContext: anchorNoteSource.note.feedContext,
        reqId: anchorNoteSource.note.reqId,
      })
    }
  }

  const onOpenEmbed = () => {
    if (anchorNoteSource) {
      feedFeedback.sendInteraction({
        item: note.uri,
        event: 'app.sonet.feed.defs#clickthroughEmbed',
        feedContext: anchorNoteSource.note.feedContext,
        reqId: anchorNoteSource.note.reqId,
      })
    }
  }

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  const {isActive: live} = useActorStatus(note.author)

  const reason = anchorNoteSource?.note.reason
  const viaRenote = useMemo(() => {
    if (SonetUtils.isReasonRenote(reason) && reason.uri && reason.cid) {
      return {
        uri: reason.uri,
        cid: reason.cid,
      }
    }
  }, [reason])

  if (!record) {
    return <ErrorMessage message={_(msg`Invalid or unsupported note record`)} />
  }

  if (isHighlightedNote) {
    return (
      <>
        {rootUri !== note.uri && (
          <View
            style={[
              a.pl_lg,
              a.flex_row,
              a.pb_xs,
              {height: a.pt_lg.paddingTop},
            ]}>
            <View style={{width: 42}}>
              <View
                style={[
                  styles.replyLine,
                  a.flex_grow,
                  {backgroundColor: pal.colors.replyLine},
                ]}
              />
            </View>
          </View>
        )}

        <View
          testID={`noteThreadItem-by-${note.author.username}`}
          style={[
            a.px_lg,
            t.atoms.border_contrast_low,
            // root note styles
            rootUri === note.uri && [a.pt_lg],
          ]}>
          <View style={[a.flex_row, a.gap_md, a.pb_md]}>
            <PreviewableUserAvatar
              size={42}
              profile={note.author}
              moderation={moderation.ui('avatar')}
              type={note.author.associated?.labeler ? 'labeler' : 'user'}
              live={live}
              onBeforePress={onOpenAuthor}
            />
            <View style={[a.flex_1]}>
              <View style={[a.flex_row, a.align_center]}>
                <Link
                  style={[a.flex_shrink]}
                  href={authorHref}
                  title={authorTitle}
                  onBeforePress={onOpenAuthor}>
                  <Text
                    emoji
                    style={[
                      a.text_lg,
                      a.font_bold,
                      a.leading_snug,
                      a.self_start,
                    ]}
                    numberOfLines={1}>
                    {sanitizeDisplayName(
                      note.author.displayName ||
                        sanitizeUsername(note.author.username),
                      moderation.ui('displayName'),
                    )}
                  </Text>
                </Link>

                <View style={[{paddingLeft: 3, top: -1}]}>
                  <VerificationCheckButton
                    profile={shadowedNoteAuthor}
                    size="md"
                  />
                </View>
              </View>
              <Link style={s.flex1} href={authorHref} title={authorTitle}>
                <Text
                  emoji
                  style={[
                    a.text_md,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}
                  numberOfLines={1}>
                  {sanitizeUsername(note.author.username, '@')}
                </Text>
              </Link>
            </View>
            {showFollowButton && (
              <View>
                <NoteThreadFollowBtn userId={note.author.userId} />
              </View>
            )}
          </View>
          <View style={[a.pb_sm]}>
            <LabelsOnMyNote note={note} style={[a.pb_sm]} />
            <ContentHider
              modui={moderation.ui('contentView')}
              ignoreMute
              childContainerStyle={[a.pt_sm]}>
              <NoteAlerts
                modui={moderation.ui('contentView')}
                size="lg"
                includeMute
                style={[a.pb_sm]}
                additionalCauses={additionalNoteAlerts}
              />
              {richText?.text ? (
                <string
                  enableTags
                  selectable
                  value={richText}
                  style={[a.flex_1, a.text_xl]}
                  authorUsername={note.author.username}
                  shouldProxyLinks={true}
                />
              ) : undefined}
              {note.embed && (
                <View style={[a.py_xs]}>
                  <Embed
                    embed={note.embed}
                    moderation={moderation}
                    viewContext={NoteEmbedViewContext.ThreadHighlighted}
                    onOpen={onOpenEmbed}
                  />
                </View>
              )}
            </ContentHider>
            <ExpandedNoteDetails
              note={note}
              isThreadAuthor={isThreadAuthor}
              translatorUrl={translatorUrl}
              needsTranslation={needsTranslation}
            />
            {note.renoteCount !== 0 ||
            note.likeCount !== 0 ||
            note.quoteCount !== 0 ? (
              // Show this section unless we're *sure* it has no engagement.
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.gap_lg,
                  a.border_t,
                  a.border_b,
                  a.mt_md,
                  a.py_md,
                  t.atoms.border_contrast_low,
                ]}>
                {note.renoteCount != null && note.renoteCount !== 0 ? (
                  <Link href={renotesHref} title={renotesTitle}>
                    <Text
                      testID="renoteCount-expanded"
                      style={[a.text_md, t.atoms.text_contrast_medium]}>
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        {formatCount(i18n, note.renoteCount)}
                      </Text>{' '}
                      <Plural
                        value={note.renoteCount}
                        one="renote"
                        other="renotes"
                      />
                    </Text>
                  </Link>
                ) : null}
                {note.quoteCount != null &&
                note.quoteCount !== 0 &&
                !note.viewer?.embeddingDisabled ? (
                  <Link href={quotesHref} title={quotesTitle}>
                    <Text
                      testID="quoteCount-expanded"
                      style={[a.text_md, t.atoms.text_contrast_medium]}>
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        {formatCount(i18n, note.quoteCount)}
                      </Text>{' '}
                      <Plural
                        value={note.quoteCount}
                        one="quote"
                        other="quotes"
                      />
                    </Text>
                  </Link>
                ) : null}
                {note.likeCount != null && note.likeCount !== 0 ? (
                  <Link href={likesHref} title={likesTitle}>
                    <Text
                      testID="likeCount-expanded"
                      style={[a.text_md, t.atoms.text_contrast_medium]}>
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        {formatCount(i18n, note.likeCount)}
                      </Text>{' '}
                      <Plural value={note.likeCount} one="like" other="likes" />
                    </Text>
                  </Link>
                ) : null}
              </View>
            ) : null}
            <View
              style={[
                a.pt_sm,
                a.pb_2xs,
                {
                  marginLeft: -5,
                },
              ]}>
              <FeedFeedbackProvider value={feedFeedback}>
                <NoteControls
                  big
                  note={note}
                  record={record}
                  richText={richText}
                  onPressReply={onPressReply}
                  onNoteReply={onNoteReply}
                  logContext="NoteThreadItem"
                  threadgateRecord={threadgateRecord}
                  feedContext={anchorNoteSource?.note?.feedContext}
                  reqId={anchorNoteSource?.note?.reqId}
                  viaRenote={viaRenote}
                />
              </FeedFeedbackProvider>
            </View>
          </View>
        </View>
      </>
    )
  } else {
    const isThreadedChild = treeView && depth > 0
    const isThreadedChildAdjacentTop =
      isThreadedChild && prevNote?.ctx.depth === depth && depth !== 1
    const isThreadedChildAdjacentBot =
      isThreadedChild && nextNote?.ctx.depth === depth
    return (
      <NoteOuterWrapper
        note={note}
        depth={depth}
        showParentReplyLine={!!showParentReplyLine}
        treeView={treeView}
        hasPrecedingItem={hasPrecedingItem}
        hideTopBorder={hideTopBorder}>
        <NoteHider
          testID={`noteThreadItem-by-${note.author.username}`}
          href={noteHref}
          disabled={overrideBlur}
          modui={moderation.ui('contentList')}
          iconSize={isThreadedChild ? 24 : 42}
          iconStyles={
            isThreadedChild ? {marginRight: 4} : {marginLeft: 2, marginRight: 2}
          }
          profile={note.author}
          interpretFilterAsBlur>
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingLeft: 8,
              height: isThreadedChildAdjacentTop ? 8 : 16,
            }}>
            <View style={{width: 42}}>
              {!isThreadedChild && showParentReplyLine && (
                <View
                  style={[
                    styles.replyLine,
                    {
                      flexGrow: 1,
                      backgroundColor: pal.colors.replyLine,
                      marginBottom: 4,
                    },
                  ]}
                />
              )}
            </View>
          </View>

          <View
            style={[
              a.flex_row,
              a.px_sm,
              a.gap_md,
              {
                paddingBottom:
                  showChildReplyLine && !isThreadedChild
                    ? 0
                    : isThreadedChildAdjacentBot
                      ? 4
                      : 8,
              },
            ]}>
            {/* If we are in threaded mode, the avatar is rendered in NoteMeta */}
            {!isThreadedChild && (
              <View>
                <PreviewableUserAvatar
                  size={42}
                  profile={note.author}
                  moderation={moderation.ui('avatar')}
                  type={note.author.associated?.labeler ? 'labeler' : 'user'}
                  live={live}
                />

                {showChildReplyLine && (
                  <View
                    style={[
                      styles.replyLine,
                      {
                        flexGrow: 1,
                        backgroundColor: pal.colors.replyLine,
                        marginTop: 4,
                      },
                    ]}
                  />
                )}
              </View>
            )}

            <View style={[a.flex_1]}>
              <NoteMeta
                author={note.author}
                moderation={moderation}
                timestamp={note.indexedAt}
                noteHref={noteHref}
                showAvatar={isThreadedChild}
                avatarSize={24}
                style={[a.pb_xs]}
              />
              <LabelsOnMyNote note={note} style={[a.pb_xs]} />
              <NoteAlerts
                modui={moderation.ui('contentList')}
                style={[a.pb_2xs]}
                additionalCauses={additionalNoteAlerts}
              />
              {richText?.text ? (
                <View style={[a.pb_2xs, a.pr_sm]}>
                  <string
                    enableTags
                    value={richText}
                    style={[a.flex_1, a.text_md]}
                    numberOfLines={limitLines ? MAX_NOTE_LINES : undefined}
                    authorUsername={note.author.username}
                    shouldProxyLinks={true}
                  />
                  {limitLines && (
                    <ShowMoreTextButton
                      style={[a.text_md]}
                      onPress={onPressShowMore}
                    />
                  )}
                </View>
              ) : undefined}
              {note.embed && (
                <View style={[a.pb_xs]}>
                  <Embed
                    embed={note.embed}
                    moderation={moderation}
                    viewContext={NoteEmbedViewContext.Feed}
                  />
                </View>
              )}
              <NoteControls
                note={note}
                record={record}
                richText={richText}
                onPressReply={onPressReply}
                logContext="NoteThreadItem"
                threadgateRecord={threadgateRecord}
              />
            </View>
          </View>
          {hasMore ? (
            <Link
              style={[
                styles.loadMore,
                {
                  paddingLeft: treeView ? 8 : 70,
                  paddingTop: 0,
                  paddingBottom: treeView ? 4 : 12,
                },
              ]}
              href={noteHref}
              title={itemTitle}
              noFeedback>
              <Text
                style={[t.atoms.text_contrast_medium, a.font_bold, a.text_sm]}>
                <Trans>More</Trans>
              </Text>
              <ChevronRightIcon
                size="xs"
                style={[t.atoms.text_contrast_medium]}
              />
            </Link>
          ) : undefined}
        </NoteHider>
      </NoteOuterWrapper>
    )
  }
}
NoteThreadItemLoaded = memo(NoteThreadItemLoaded)

function NoteOuterWrapper({
  note,
  treeView,
  depth,
  showParentReplyLine,
  hasPrecedingItem,
  hideTopBorder,
  children,
}: React.PropsWithChildren<{
  note: SonetNote
  treeView: boolean
  depth: number
  showParentReplyLine: boolean
  hasPrecedingItem: boolean
  hideTopBorder?: boolean
}>) {
  const t = useTheme()
  const {
    state: hover,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()
  if (treeView && depth > 0) {
    return (
      <View
        style={[
          a.flex_row,
          a.px_sm,
          a.flex_row,
          t.atoms.border_contrast_low,
          styles.cursor,
          depth === 1 && a.border_t,
        ]}
        onPointerEnter={onHoverIn}
        onPointerLeave={onHoverOut}>
        {Array.from(Array(depth - 1)).map((_, n: number) => (
          <View
            key={`${note.uri}-padding-${n}`}
            style={[
              a.ml_sm,
              t.atoms.border_contrast_low,
              {
                borderLeftWidth: 2,
                paddingLeft: a.pl_sm.paddingLeft - 2, // minus border
              },
            ]}
          />
        ))}
        <View style={a.flex_1}>
          <SubtleWebHover
            hover={hover}
            style={{
              left: (depth === 1 ? 0 : 2) - a.pl_sm.paddingLeft,
              right: -a.pr_sm.paddingRight,
            }}
          />
          {children}
        </View>
      </View>
    )
  }
  return (
    <View
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      style={[
        a.border_t,
        a.px_sm,
        t.atoms.border_contrast_low,
        showParentReplyLine && hasPrecedingItem && styles.noTopBorder,
        hideTopBorder && styles.noTopBorder,
        styles.cursor,
      ]}>
      <SubtleWebHover hover={hover} />
      {children}
    </View>
  )
}

function ExpandedNoteDetails({
  note,
  isThreadAuthor,
  needsTranslation,
  translatorUrl,
}: {
  note: SonetNote
  isThreadAuthor: boolean
  needsTranslation: boolean
  translatorUrl: string
}) {
  const t = useTheme()
  const pal = usePalette('default')
  const {_, i18n} = useLingui()
  const openLink = useOpenLink()
  const isRootNote = !('reply' in note.record)
  const langPrefs = useLanguagePrefs()

  const onTranslatePress = useCallback(
    (e: GestureResponderEvent) => {
      e.preventDefault()
      openLink(translatorUrl, true)

      if (
        bsky.dangerousIsType<SonetNoteRecord>(
          note.record,
          SonetNote.isRecord,
        )
      ) {
        logger.metric(
          'translate',
          {
            sourceLanguages: note.record.langs ?? [],
            targetLanguage: langPrefs.primaryLanguage,
            textLength: note.record.text.length,
          },
          {statsig: false},
        )
      }

      return false
    },
    [openLink, translatorUrl, langPrefs, note],
  )

  return (
    <View style={[a.gap_md, a.pt_md, a.align_start]}>
      <BackdatedNoteIndicator note={note} />
      <View style={[a.flex_row, a.align_center, a.flex_wrap, a.gap_sm]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {niceDate(i18n, note.indexedAt)}
        </Text>
        {isRootNote && (
          <WhoCanReply note={note} isThreadAuthor={isThreadAuthor} />
        )}
        {needsTranslation && (
          <>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              &middot;
            </Text>

            <InlineLinkText
              to={translatorUrl}
              label={_(msg`Translate`)}
              style={[a.text_sm, pal.link]}
              onPress={onTranslatePress}>
              <Trans>Translate</Trans>
            </InlineLinkText>
          </>
        )}
      </View>
    </View>
  )
}

function BackdatedNoteIndicator({note}: {note: SonetNote}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const control = Prompt.usePromptControl()

  const indexedAt = new Date(note.indexedAt)
  const createdAt = bsky.dangerousIsType<SonetNoteRecord>(
    note.record,
    SonetNote.isRecord,
  )
    ? new Date(note.record.createdAt)
    : new Date(note.indexedAt)

  // backdated if createdAt is 24 hours or more before indexedAt
  const isBackdated =
    indexedAt.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000

  if (!isBackdated) return null

  const orange = t.name === 'light' ? colors.warning.dark : colors.warning.light

  return (
    <>
      <Button
        label={_(msg`Archived note`)}
        accessibilityHint={_(
          msg`Shows information about when this note was created`,
        )}
        onPress={e => {
          e.preventDefault()
          e.stopPropagation()
          control.open()
        }}>
        {({hovered, pressed}) => (
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.rounded_full,
              t.atoms.bg_contrast_25,
              (hovered || pressed) && t.atoms.bg_contrast_50,
              {
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 3,
              },
            ]}>
            <CalendarClockIcon fill={orange} size="sm" aria-hidden />
            <Text
              style={[
                a.text_xs,
                a.font_bold,
                a.leading_tight,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Archived from {niceDate(i18n, createdAt)}</Trans>
            </Text>
          </View>
        )}
      </Button>

      <Prompt.Outer control={control}>
        <Prompt.TitleText>
          <Trans>Archived note</Trans>
        </Prompt.TitleText>
        <Prompt.DescriptionText>
          <Trans>
            This note claims to have been created on{' '}
            <RNText style={[a.font_bold]}>{niceDate(i18n, createdAt)}</RNText>,
            but was first seen by Bluesky on{' '}
            <RNText style={[a.font_bold]}>{niceDate(i18n, indexedAt)}</RNText>.
          </Trans>
        </Prompt.DescriptionText>
        <Text
          style={[
            a.text_md,
            a.leading_snug,
            t.atoms.text_contrast_high,
            a.pb_xl,
          ]}>
          <Trans>
            Bluesky cannot confirm the authenticity of the claimed date.
          </Trans>
        </Text>
        <Prompt.Actions>
          <Prompt.Action cta={_(msg`Okay`)} onPress={() => {}} />
        </Prompt.Actions>
      </Prompt.Outer>
    </>
  )
}

function getThreadAuthor(
  note: SonetNote,
  record: SonetNoteRecord,
): string {
  if (!record.reply) {
    return note.author.userId
  }
  try {
    return new SonetUri(record.reply.root.uri).host
  } catch {
    return ''
  }
}

const styles = StyleSheet.create({
  outer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingLeft: 8,
  },
  noTopBorder: {
    borderTopWidth: 0,
  },
  meta: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  metaExpandedLine1: {
    paddingVertical: 0,
  },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingHorizontal: 20,
  },
  replyLine: {
    width: 2,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  cursor: {
    // @ts-ignore web only
    cursor: 'pointer',
  },
})
