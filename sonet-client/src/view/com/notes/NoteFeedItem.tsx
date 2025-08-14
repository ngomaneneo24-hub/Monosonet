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
import {MAX_NOTE_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {countLines} from '#/lib/strings/helpers'
import {s} from '#/lib/styles'
import {
  NOTE_TOMBSTONE,
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
import {atoms as a, useTheme} from '#/alf'
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
import {NoteMenuButton} from '#/components/NoteControls/NoteMenu'
import {niceDate} from '#/lib/strings/time'
// Enhanced Action Button Icons
import {Heart2_Stroke2_Corner0_Rounded, Heart2_Filled_Stroke2_Corner0_Rounded} from '#/components/icons/Heart2'
import {Bubble_Stroke2_Corner2_Rounded} from '#/components/icons/Bubble'
import {Renote_Stroke2_Corner0_Rounded, Renote_Stroke2_Corner2_Rounded} from '#/components/icons/Renote'
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
  if (noteShadowed === NOTE_TOMBSTONE) {
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
  const t = useTheme()

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
          {/* Enhanced Header Row */}
          <View style={styles.enhancedHeader}>
            <View style={styles.headerLeft}>
              <PreviewableUserAvatar
                size={40}
                profile={note.author}
                moderation={moderation.ui('avatar')}
                type={note.author.associated?.labeler ? 'labeler' : 'user'}
                onBeforePress={onOpenAuthor}
                live={live}
              />
              <View style={styles.userInfo}>
                <Text
                  emoji
                  style={[a.text_md, a.font_bold, t.atoms.text, a.leading_tight]}
                  numberOfLines={1}>
                  {sanitizeDisplayName(
                    note.author.displayName || note.author.username,
                    moderation.ui('displayName'),
                  )}
                </Text>
                <Text
                  style={[a.text_sm, t.atoms.text_contrast_medium, a.leading_tight]}>
                  {niceDate(_, note.indexedAt)}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <NoteMenuButton
                testID="noteDropdownBtn"
                note={note}
                noteFeedContext={feedContext}
                noteReqId={reqId}
                big={false}
                record={record}
                richText={richText}
                timestamp={note.indexedAt}
                threadgateRecord={threadgateRecord}
                onShowLess={onShowLess}
              />
            </View>
          </View>

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
          
          {/* Enhanced Engagement Row */}
          <View style={styles.engagementRow}>
            <View style={styles.engagementLeft}>
              <AvatarStack note={note} />
                          <View style={styles.engagementStats}>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium, styles.engagementStatsText]}>
                {note.likeCount || 0} likes • {note.replyCount || 0} replies • {note.viewCount || 0} views
              </Text>
            </View>
            </View>
            <View style={styles.engagementRight}>
              <EnhancedActionButtons
                note={note}
                record={record}
                richText={richText}
                onPressReply={onPressReply}
                feedContext={feedContext}
                reqId={reqId}
                threadgateRecord={threadgateRecord}
                onShowLess={onShowLess}
                viaRenote={viaRenote}
              />
            </View>
          </View>
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
    () => countLines(richText.text) >= MAX_NOTE_LINES,
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
            numberOfLines={limitLines ? MAX_NOTE_LINES : undefined}
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

// Avatar Stack Component for Engagement Display
function AvatarStack({note}: {note: SonetFeedDefs.NoteView}) {
  const t = useTheme()
  
  // Get the first 3 users who liked the post
  // In a real implementation, this would come from the note.likes array
  // For now, we'll simulate with the author and some mock data
  const avatarSize = 32
  const overlap = 8
  
  // Mock data - in real implementation, this would be note.likes.slice(0, 3)
  const likeAvatars = [
    note.author, // First liker (usually the author or first person to like)
    { ...note.author, username: 'user2', displayName: 'User Two' }, // Second liker
    { ...note.author, username: 'user3', displayName: 'User Three' }, // Third liker
  ].slice(0, 3)
  
  // Only show avatar stack if there are likes
  if (!note.likeCount || note.likeCount === 0) {
    return null
  }
  
  return (
    <View style={styles.avatarStack}>
      {/* Show first 3 likers with perfect triangular overlap */}
      {likeAvatars.map((profile, index) => (
        <View
          key={profile.username || index}
          style={[
            styles.avatarStackItem,
            {
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: 3 - index,
            },
          ]}>
          <PreviewableUserAvatar
            size={avatarSize}
            profile={profile}
            moderation={undefined}
            type="user"
          />
        </View>
      ))}
    </View>
  )
}

// Enhanced Action Buttons Component
function EnhancedActionButtons({
  note,
  record,
  richText,
  onPressReply,
  feedContext,
  reqId,
  threadgateRecord,
  onShowLess,
  viaRenote,
}: {
  note: SonetFeedDefs.NoteView
  record: SonetFeedNote.Record
  richText: RichTextAPI
  onPressReply: () => void
  feedContext?: string | undefined
  reqId?: string | undefined
  threadgateRecord?: SonetFeedThreadgate.Record
  onShowLess?: (interaction: SonetFeedDefs.Interaction) => void
  viaRenote?: {uri: string; cid: string}
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {sendInteraction} = useFeedFeedbackContext()
  const {openComposer} = useOpenComposer()
  const {currentAccount} = useSession()
  const [isLiked, setIsLiked] = useState(Boolean(note.viewer?.like))
  const [isRenoted, setIsRenoted] = useState(Boolean(note.viewer?.renote))
  
  const onPressLike = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#interactionLike',
      feedContext,
      reqId,
    })
    setIsLiked(!isLiked)
    // Handle like logic here - would integrate with existing like system
  }

  const onPressRepost = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#interactionRenote',
      feedContext,
      reqId,
    })
    setIsRenoted(!isRenoted)
    // Handle repost logic here - would integrate with existing repost system
  }

  return (
    <View style={styles.actionButtonsContainer}>
      {/* Like Button */}
      <View 
        style={[
          styles.actionButton,
          isLiked && styles.actionButtonActive
        ]}
        onTouchEnd={onPressLike}
        onTouchStart={() => {
          // Add press animation
          const element = event?.target as HTMLElement
          if (element) {
            element.style.transform = 'scale(0.95)'
          }
        }}
        onTouchEnd={() => {
          // Reset press animation
          const element = event?.target as HTMLElement
          if (element) {
            element.style.transform = 'scale(1)'
          }
        }}>
        {isLiked ? (
          <Heart2_Filled_Stroke2_Corner0_Rounded 
            width={20} 
            height={20} 
            style={[styles.actionButtonIcon, t.atoms.text_primary]}
          />
        ) : (
          <Heart2_Stroke2_Corner0_Rounded 
            width={20} 
            height={20} 
            style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
          />
        )}
      </View>
      
      {/* Reply Button */}
      <View 
        style={styles.actionButton}
        onTouchEnd={onPressReply}
        onTouchStart={() => {
          // Add press animation
          const element = event?.target as HTMLElement
          if (element) {
            element.style.transform = 'scale(0.95)'
          }
        }}
        onTouchEnd={() => {
          // Reset press animation
          const element = event?.target as HTMLElement
          if (element) {
            element.style.transform = 'scale(1)'
          }
        }}>
        <Bubble_Stroke2_Corner2_Rounded 
          width={20} 
          height={20} 
          style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
        />
      </View>
      
      {/* Repost Button */}
      <View 
        style={[
          styles.actionButton,
          isRenoted && styles.actionButtonActive
        ]}
        onTouchEnd={onPressRepost}
        onTouchStart={() => {
          // Add press animation
          const element = event?.target as HTMLElement
          if (element) {
            element.style.transform = 'scale(0.95)'
          }
        }}
        onTouchEnd={() => {
          // Reset press animation
          const element = event?.target as HTMLElement
          if (element) {
            element.style.transform = 'scale(1)'
          }
        }}>
        {isRenoted ? (
          <Renote_Stroke2_Corner2_Rounded 
            width={20} 
            height={20} 
            style={[styles.actionButtonIcon, t.atoms.text_primary]}
          />
        ) : (
          <Renote_Stroke2_Corner0_Rounded 
            width={20} 
            height={20} 
            style={[styles.actionButtonIcon, t.atoms.text_contrast_medium]}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingLeft: 10,
    paddingRight: 15,
    // @ts-ignore web only -prf
    cursor: 'pointer',
    // Enhanced post card styling
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
    // Subtle hover effect for web
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
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
    // Enhanced content spacing
    paddingRight: 8,
  },
  alert: {
    marginTop: 6,
    marginBottom: 6,
  },
  contentHiderChild: {
    marginTop: 8,
    marginBottom: 4,
  },
  embed: {
    marginBottom: 6,
  },
  translateLink: {
    marginBottom: 6,
  },
  // Enhanced Header Styles
  enhancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    justifyContent: 'flex-end',
  },
  userInfo: {
    flexDirection: 'column',
    gap: 2,
  },
  // Engagement Row Styles
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    marginTop: 8,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  engagementRight: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  engagementStats: {
    justifyContent: 'center',
    minWidth: 0,
    flex: 1,
  },
  engagementStatsText: {
    // Enhanced text styling
    lineHeight: 1.4,
    letterSpacing: 0.2,
  },
  // Avatar Stack Styles
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    // Perfect triangular stack positioning
    position: 'relative',
  },
  avatarStackItem: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    // Enhanced shadow for depth
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
    // Smooth transitions for interactions
    transition: 'all 0.2s ease',
  },
  // Action Buttons Styles
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
    // Enhanced touch feedback
    overflow: 'hidden',
    // Web hover effects
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    // Enhanced touch states
    position: 'relative',
  },
  actionButtonActive: {
    // Active state styling
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    transform: [{scale: 1.05}],
  },
  actionButtonIcon: {
    // Icon styling
    transition: 'all 0.2s ease',
    // Smooth icon transitions
    transform: [{scale: 1}],
  },
})
