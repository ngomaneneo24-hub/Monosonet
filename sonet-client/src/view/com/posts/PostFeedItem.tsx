import {memo, useCallback, useMemo, useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {
  type SonetActorDefs,
  SonetFeedDefs,
  SonetFeedNote,
  SonetFeedThreadgate,
  AtUri,
  type ModerationDecision,
  RichText as RichTextAPI,
} from '@sonet/api'
import {
  FontAwesomeIcon,
  type FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {useActorStatus} from '#/lib/actor-status'
import {isReasonFeedSource, type ReasonFeedSource} from '#/lib/api/feed/types'
import {MAX_POST_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {countLines} from '#/lib/strings/helpers'
import {s} from '#/lib/styles'
import {
  POST_TOMBSTONE,
  type Shadow,
  useNoteShadow,
} from '#/state/cache/note-shadow'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {unstableCacheProfileView} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {
  buildNoteSourceKey,
  setUnstableNoteSource,
} from '#/state/unstable-note-source'
import {FeedNameText} from '#/view/com/util/FeedInfoText'
import {Link, TextLinkOnWebOnly} from '#/view/com/util/Link'
import {NoteMeta} from '#/view/com/util/NoteMeta'
import {Text} from '#/view/com/util/text/Text'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a} from '#/alf'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import {Renote_Stroke2_Corner2_Rounded as RenoteIcon} from '#/components/icons/Renote'
import {ContentHider} from '#/components/moderation/ContentHider'
import {LabelsOnMyNote} from '#/components/moderation/LabelsOnMe'
import {NoteAlerts} from '#/components/moderation/NoteAlerts'
import {type AppModerationCause} from '#/components/Pills'
import {Embed} from '#/components/Note/Embed'
import {NoteEmbedViewContext} from '#/components/Note/Embed/types'
import {ShowMoreTextButton} from '#/components/Note/ShowMoreTextButton'
import {NoteControls} from '#/components/NoteControls'
import {DiscoverDebug} from '#/components/NoteControls/DiscoverDebug'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {RichText} from '#/components/RichText'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import * as bsky from '#/types/bsky'

interface FeedItemProps {
  record: SonetFeedNote.Record
  reason:
    | SonetFeedDefs.ReasonRenote
    | SonetFeedDefs.ReasonPin
    | ReasonFeedSource
    | {[k: string]: unknown; $type: string}
    | undefined
  moderation: ModerationDecision
  parentAuthor: SonetActorDefs.ProfileViewBasic | undefined
  showReplyTo: boolean
  isThreadChild?: boolean
  isThreadLastChild?: boolean
  isThreadParent?: boolean
  feedContext: string | undefined
  reqId: string | undefined
  hideTopBorder?: boolean
  isParentBlocked?: boolean
  isParentNotFound?: boolean
}

export function NoteFeedItem({
  note,
  record,
  reason,
  feedContext,
  reqId,
  moderation,
  parentAuthor,
  showReplyTo,
  isThreadChild,
  isThreadLastChild,
  isThreadParent,
  hideTopBorder,
  isParentBlocked,
  isParentNotFound,
  rootNote,
  onShowLess,
}: FeedItemProps & {
  note: SonetFeedDefs.NoteView
  rootNote: SonetFeedDefs.NoteView
  onShowLess?: (interaction: SonetFeedDefs.Interaction) => void
}): React.ReactNode {
  const noteShadowed = useNoteShadow(note)
  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: record.text,
        facets: record.facets,
      }),
    [record],
  )
  if (noteShadowed === POST_TOMBSTONE) {
    return null
  }
  if (richText && moderation) {
    return (
      <FeedItemInner
        // Safeguard from clobbering per-note state below:
        key={noteShadowed.uri}
        note={noteShadowed}
        record={record}
        reason={reason}
        feedContext={feedContext}
        reqId={reqId}
        richText={richText}
        parentAuthor={parentAuthor}
        showReplyTo={showReplyTo}
        moderation={moderation}
        isThreadChild={isThreadChild}
        isThreadLastChild={isThreadLastChild}
        isThreadParent={isThreadParent}
        hideTopBorder={hideTopBorder}
        isParentBlocked={isParentBlocked}
        isParentNotFound={isParentNotFound}
        rootNote={rootNote}
        onShowLess={onShowLess}
      />
    )
  }
  return null
}

let FeedItemInner = ({
  note,
  record,
  reason,
  feedContext,
  reqId,
  richText,
  moderation,
  parentAuthor,
  showReplyTo,
  isThreadChild,
  isThreadLastChild,
  isThreadParent,
  hideTopBorder,
  isParentBlocked,
  isParentNotFound,
  rootNote,
  onShowLess,
}: FeedItemProps & {
  richText: RichTextAPI
  note: Shadow<SonetFeedDefs.NoteView>
  rootNote: SonetFeedDefs.NoteView
  onShowLess?: (interaction: SonetFeedDefs.Interaction) => void
}): React.ReactNode => {
  const queryClient = useQueryClient()
  const {openComposer} = useOpenComposer()
  const pal = usePalette('default')
  const {_} = useLingui()

  const [hover, setHover] = useState(false)

  const href = useMemo(() => {
    const urip = new AtUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey)
  }, [note.uri, note.author])
  const {sendInteraction, feedDescriptor} = useFeedFeedbackContext()

  const onPressReply = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#interactionReply',
      feedContext,
      reqId,
    })
    openComposer({
      replyTo: {
        uri: note.uri,
        cid: note.cid,
        text: record.text || '',
        author: note.author,
        embed: note.embed,
        moderation,
      },
    })
  }

  const onOpenAuthor = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#clickthroughAuthor',
      feedContext,
      reqId,
    })
  }

  const onOpenRenoteer = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#clickthroughRenoteer',
      feedContext,
      reqId,
    })
  }

  const onOpenEmbed = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#clickthroughEmbed',
      feedContext,
      reqId,
    })
  }

  const onBeforePress = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#clickthroughItem',
      feedContext,
      reqId,
    })
    unstableCacheProfileView(queryClient, note.author)
    setUnstableNoteSource(buildNoteSourceKey(note.uri, note.author.username), {
      feed: feedDescriptor,
      note: {
        note,
        reason: SonetFeedDefs.isReasonRenote(reason) ? reason : undefined,
        feedContext,
        reqId,
      },
    })
  }

  const outerStyles = [
    styles.outer,
    {
      borderColor: pal.colors.border,
      paddingBottom:
        isThreadLastChild || (!isThreadChild && !isThreadParent)
          ? 8
          : undefined,
      borderTopWidth:
        hideTopBorder || isThreadChild ? 0 : StyleSheet.hairlineWidth,
    },
  ]

  const {currentAccount} = useSession()
  const isOwner =
    SonetFeedDefs.isReasonRenote(reason) &&
    reason.by.userId === currentAccount?.userId

  /**
   * If `note[0]` in this slice is the actual root note (not an orphan thread),
   * then we may have a threadgate record to reference
   */
  const threadgateRecord = bsky.dangerousIsType<SonetFeedThreadgate.Record>(
    rootNote.threadgate?.record,
    SonetFeedThreadgate.isRecord,
  )
    ? rootNote.threadgate.record
    : undefined

  const {isActive: live} = useActorStatus(note.author)

  const viaRenote = useMemo(() => {
    if (SonetFeedDefs.isReasonRenote(reason) && reason.uri && reason.cid) {
      return {
        uri: reason.uri,
        cid: reason.cid,
      }
    }
  }, [reason])

  return (
    <Link
      testID={`feedItem-by-${note.author.username}`}
      style={outerStyles}
      href={href}
      noFeedback
      accessible={false}
      onBeforePress={onBeforePress}
      dataSet={{feedContext}}
      onPointerEnter={() => {
        setHover(true)
      }}
      onPointerLeave={() => {
        setHover(false)
      }}>
      <SubtleWebHover hover={hover} />
      <View style={{flexDirection: 'row', gap: 10, paddingLeft: 8}}>
        <View style={{width: 42}}>
          {isThreadChild && (
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

        <View style={{paddingTop: 10, flexShrink: 1}}>
          {isReasonFeedSource(reason) ? (
            <Link href={reason.href}>
              <Text
                type="sm-bold"
                style={pal.textLight}
                lineHeight={1.2}
                numberOfLines={1}>
                <Trans context="from-feed">
                  From{' '}
                  <FeedNameText
                    type="sm-bold"
                    uri={reason.uri}
                    href={reason.href}
                    lineHeight={1.2}
                    numberOfLines={1}
                    style={pal.textLight}
                  />
                </Trans>
              </Text>
            </Link>
          ) : SonetFeedDefs.isReasonRenote(reason) ? (
            <Link
              style={styles.includeReason}
              href={makeProfileLink(reason.by)}
              title={
                isOwner
                  ? _(msg`Renoteed by you`)
                  : _(
                      msg`Renoteed by ${sanitizeDisplayName(
                        reason.by.displayName || reason.by.username,
                      )}`,
                    )
              }
              onBeforePress={onOpenRenoteer}>
              <RenoteIcon
                style={{color: pal.colors.textLight, marginRight: 3}}
                width={13}
                height={13}
              />
              <Text
                type="sm-bold"
                style={pal.textLight}
                lineHeight={1.2}
                numberOfLines={1}>
                {isOwner ? (
                  <Trans>Renoteed by you</Trans>
                ) : (
                  <Trans>
                    Renoteed by{' '}
                    <ProfileHoverCard userId={reason.by.userId}>
                      <TextLinkOnWebOnly
                        type="sm-bold"
                        style={pal.textLight}
                        lineHeight={1.2}
                        numberOfLines={1}
                        text={
                          <Text
                            emoji
                            type="sm-bold"
                            style={pal.textLight}
                            lineHeight={1.2}>
                            {sanitizeDisplayName(
                              reason.by.displayName ||
                                sanitizeUsername(reason.by.username),
                              moderation.ui('displayName'),
                            )}
                          </Text>
                        }
                        href={makeProfileLink(reason.by)}
                        onBeforePress={onOpenRenoteer}
                      />
                    </ProfileHoverCard>
                  </Trans>
                )}
              </Text>
            </Link>
          ) : SonetFeedDefs.isReasonPin(reason) ? (
            <View style={styles.includeReason}>
              <PinIcon
                style={{color: pal.colors.textLight, marginRight: 3}}
                width={13}
                height={13}
              />
              <Text
                type="sm-bold"
                style={pal.textLight}
                lineHeight={1.2}
                numberOfLines={1}>
                <Trans>Pinned</Trans>
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.layout}>
        <View style={styles.layoutAvi}>
          <PreviewableUserAvatar
            size={42}
            profile={note.author}
            moderation={moderation.ui('avatar')}
            type={note.author.associated?.labeler ? 'labeler' : 'user'}
            onBeforePress={onOpenAuthor}
            live={live}
          />
          {isThreadParent && (
            <View
              style={[
                styles.replyLine,
                {
                  flexGrow: 1,
                  backgroundColor: pal.colors.replyLine,
                  marginTop: live ? 8 : 4,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.layoutContent}>
          <NoteMeta
            author={note.author}
            moderation={moderation}
            timestamp={note.indexedAt}
            noteHref={href}
            onOpenAuthor={onOpenAuthor}
          />
          {showReplyTo &&
            (parentAuthor || isParentBlocked || isParentNotFound) && (
              <ReplyToLabel
                blocked={isParentBlocked}
                notFound={isParentNotFound}
                profile={parentAuthor}
              />
            )}
          <LabelsOnMyNote note={note} />
          <NoteContent
            moderation={moderation}
            richText={richText}
            noteEmbed={note.embed}
            noteAuthor={note.author}
            onOpenEmbed={onOpenEmbed}
            note={note}
            threadgateRecord={threadgateRecord}
          />
          <NoteControls
            note={note}
            record={record}
            richText={richText}
            onPressReply={onPressReply}
            logContext="FeedItem"
            feedContext={feedContext}
            reqId={reqId}
            threadgateRecord={threadgateRecord}
            onShowLess={onShowLess}
            viaRenote={viaRenote}
          />
        </View>

        <DiscoverDebug feedContext={feedContext} />
      </View>
    </Link>
  )
}
FeedItemInner = memo(FeedItemInner)

let NoteContent = ({
  note,
  moderation,
  richText,
  noteEmbed,
  noteAuthor,
  onOpenEmbed,
  threadgateRecord,
}: {
  moderation: ModerationDecision
  richText: RichTextAPI
  noteEmbed: SonetFeedDefs.NoteView['embed']
  noteAuthor: SonetFeedDefs.NoteView['author']
  onOpenEmbed: () => void
  note: SonetFeedDefs.NoteView
  threadgateRecord?: SonetFeedThreadgate.Record
}): React.ReactNode => {
  const {currentAccount} = useSession()
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText.text) >= MAX_POST_LINES,
  )
  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
  })
  const additionalNoteAlerts: AppModerationCause[] = useMemo(() => {
    const isNoteHiddenByThreadgate = threadgateHiddenReplies.has(note.uri)
    const rootNoteUri = bsky.dangerousIsType<SonetFeedNote.Record>(
      note.record,
      SonetFeedNote.isRecord,
    )
      ? note.record?.reply?.root?.uri || note.uri
      : undefined
    const isControlledByViewer =
      rootNoteUri && new AtUri(rootNoteUri).host === currentAccount?.userId
    return isControlledByViewer && isNoteHiddenByThreadgate
      ? [
          {
            type: 'reply-hidden',
            source: {type: 'user', userId: currentAccount?.userId},
            priority: 6,
          },
        ]
      : []
  }, [note, currentAccount?.userId, threadgateHiddenReplies])

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  return (
    <ContentHider
      testID="contentHider-note"
      modui={moderation.ui('contentList')}
      ignoreMute
      childContainerStyle={styles.contentHiderChild}>
      <NoteAlerts
        modui={moderation.ui('contentList')}
        style={[a.py_2xs]}
        additionalCauses={additionalNoteAlerts}
      />
      {richText.text ? (
        <>
          <RichText
            enableTags
            testID="noteText"
            value={richText}
            numberOfLines={limitLines ? MAX_POST_LINES : undefined}
            style={[a.flex_1, a.text_md]}
            authorUsername={noteAuthor.username}
            shouldProxyLinks={true}
          />
          {limitLines && (
            <ShowMoreTextButton style={[a.text_md]} onPress={onPressShowMore} />
          )}
        </>
      ) : undefined}
      {noteEmbed ? (
        <View style={[a.pb_xs]}>
          <Embed
            embed={noteEmbed}
            moderation={moderation}
            onOpen={onOpenEmbed}
            viewContext={NoteEmbedViewContext.Feed}
          />
        </View>
      ) : null}
    </ContentHider>
  )
}
NoteContent = memo(NoteContent)

function ReplyToLabel({
  profile,
  blocked,
  notFound,
}: {
  profile: SonetActorDefs.ProfileViewBasic | undefined
  blocked?: boolean
  notFound?: boolean
}) {
  const pal = usePalette('default')
  const {currentAccount} = useSession()

  let label
  if (blocked) {
    label = <Trans context="description">Reply to a blocked note</Trans>
  } else if (notFound) {
    label = <Trans context="description">Reply to a note</Trans>
  } else if (profile != null) {
    const isMe = profile.userId === currentAccount?.userId
    if (isMe) {
      label = <Trans context="description">Reply to you</Trans>
    } else {
      label = (
        <Trans context="description">
          Reply to{' '}
          <ProfileHoverCard userId={profile.userId}>
            <TextLinkOnWebOnly
              type="md"
              style={pal.textLight}
              lineHeight={1.2}
              numberOfLines={1}
              href={makeProfileLink(profile)}
              text={
                <Text emoji type="md" style={pal.textLight} lineHeight={1.2}>
                  {profile.displayName
                    ? sanitizeDisplayName(profile.displayName)
                    : sanitizeUsername(profile.username)}
                </Text>
              }
            />
          </ProfileHoverCard>
        </Trans>
      )
    }
  }

  if (!label) {
    // Should not happen.
    return null
  }

  return (
    <View style={[s.flexRow, s.mb2, s.alignCenter]}>
      <FontAwesomeIcon
        icon="reply"
        size={9}
        style={[{color: pal.colors.textLight} as FontAwesomeIconStyle, s.mr5]}
      />
      <Text
        type="md"
        style={[pal.textLight, s.mr2]}
        lineHeight={1.2}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingLeft: 10,
    paddingRight: 15,
    // @ts-ignore web only -prf
    cursor: 'pointer',
  },
  replyLine: {
    width: 2,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  includeReason: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginLeft: -16,
  },
  layout: {
    flexDirection: 'row',
    marginTop: 1,
  },
  layoutAvi: {
    paddingLeft: 8,
    paddingRight: 10,
    position: 'relative',
    zIndex: 999,
  },
  layoutContent: {
    position: 'relative',
    flex: 1,
    zIndex: 0,
  },
  alert: {
    marginTop: 6,
    marginBottom: 6,
  },
  contentHiderChild: {
    marginTop: 6,
  },
  embed: {
    marginBottom: 6,
  },
  translateLink: {
    marginBottom: 6,
  },
})
