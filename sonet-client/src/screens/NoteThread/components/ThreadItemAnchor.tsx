import {memo, useCallback, useMemo} from 'react'
import {type GestureResponderEvent, Text as RNText, View} from 'react-native'
import { type SonetNote, type SonetProfile, type SonetFeedGenerator, type SonetNoteRecord, type SonetFeedViewNote, type SonetInteraction, type SonetSavedFeed } from '#/types/sonet'
import {msg, Plural, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useActorStatus} from '#/lib/actor-status'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {makeProfileLink} from '#/lib/routes/links'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {niceDate} from '#/lib/strings/time'
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
import {type ThreadItem} from '#/state/queries/useNoteThread/types'
import {useSession} from '#/state/session'
import {type OnNoteSuccessData} from '#/state/shell/composer'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {type NoteSource} from '#/state/unstable-note-source'
import {NoteThreadFollowBtn} from '#/view/com/note-thread/NoteThreadFollowBtn'
import {formatCount} from '#/view/com/util/numeric/format'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {
  LINEAR_AVI_WIDTH,
  OUTER_SPACE,
  REPLY_LINE_WIDTH,
} from '#/screens/NoteThread/const'
import {atoms as a, useTheme} from '#/alf'
import {colors} from '#/components/Admonition'
import {Button} from '#/components/Button'
import {CalendarClock_Stroke2_Corner0_Rounded as CalendarClockIcon} from '#/components/icons/CalendarClock'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {InlineLinkText, Link} from '#/components/Link'
import {ContentHider} from '#/components/moderation/ContentHider'
import {LabelsOnMyNote} from '#/components/moderation/LabelsOnMe'
import {NoteAlerts} from '#/components/moderation/NoteAlerts'
import {type AppModerationCause} from '#/components/Pills'
import {Embed, NoteEmbedViewContext} from '#/components/Note/Embed'
import {NoteControls} from '#/components/NoteControls'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import * as Prompt from '#/components/Prompt'
import {string} from '#/components/string'
import * as Skele from '#/components/Skeleton'
import {Text} from '#/components/Typography'
import {VerificationCheckButton} from '#/components/verification/VerificationCheckButton'
import {WhoCanReply} from '#/components/WhoCanReply'
import * as bsky from '#/types/bsky'

export function ThreadItemAnchor({
  item,
  onNoteSuccess,
  threadgateRecord,
  noteSource,
}: {
  item: Extract<ThreadItem, {type: 'threadNote'}>
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  threadgateRecord?: SonetFeedThreadgate.Record
  noteSource?: NoteSource
}) {
  const noteShadow = useNoteShadow(item.value.note)
  const threadRootUri = item.value.note.record.reply?.root?.uri || item.uri
  const isRoot = threadRootUri === item.uri

  if (noteShadow === NOTE_TOMBSTONE) {
    return <ThreadItemAnchorDeleted isRoot={isRoot} />
  }

  return (
    <ThreadItemAnchorInner
      // Safeguard from clobbering per-note state below:
      key={noteShadow.uri}
      item={item}
      isRoot={isRoot}
      noteShadow={noteShadow}
      onNoteSuccess={onNoteSuccess}
      threadgateRecord={threadgateRecord}
      noteSource={noteSource}
    />
  )
}

function ThreadItemAnchorDeleted({isRoot}: {isRoot: boolean}) {
  const t = useTheme()

  return (
    <>
      <ThreadItemAnchorParentReplyLine isRoot={isRoot} />

      <View
        style={[
          {
            paddingHorizontal: OUTER_SPACE,
            paddingBottom: OUTER_SPACE,
          },
          isRoot && [a.pt_lg],
        ]}>
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.py_md,
            a.rounded_sm,
            t.atoms.bg_contrast_25,
          ]}>
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.justify_center,
              {
                width: LINEAR_AVI_WIDTH,
              },
            ]}>
            <TrashIcon style={[t.atoms.text_contrast_medium]} />
          </View>
          <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
            <Trans>Note has been deleted</Trans>
          </Text>
        </View>
      </View>
    </>
  )
}

function ThreadItemAnchorParentReplyLine({isRoot}: {isRoot: boolean}) {
  const t = useTheme()

  return !isRoot ? (
    <View style={[a.pl_lg, a.flex_row, a.pb_xs, {height: a.pt_lg.paddingTop}]}>
      <View style={{width: 42}}>
        <View
          style={[
            {
              width: REPLY_LINE_WIDTH,
              marginLeft: 'auto',
              marginRight: 'auto',
              flexGrow: 1,
              backgroundColor: t.atoms.border_contrast_low.borderColor,
            },
          ]}
        />
      </View>
    </View>
  ) : null
}

const ThreadItemAnchorInner = memo(function ThreadItemAnchorInner({
  item,
  isRoot,
  noteShadow,
  onNoteSuccess,
  threadgateRecord,
  noteSource,
}: {
  item: Extract<ThreadItem, {type: 'threadNote'}>
  isRoot: boolean
  noteShadow: Shadow<SonetNote>
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  threadgateRecord?: SonetFeedThreadgate.Record
  noteSource?: NoteSource
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {openComposer} = useOpenComposer()
  const {currentAccount, hasSession} = useSession()
  const feedFeedback = useFeedFeedback(noteSource?.feed, hasSession)

  const note = noteShadow
  const record = item.value.note.record
  const moderation = item.moderation
  const authorShadow = useProfileShadow(note.author)
  const {isActive: live} = useActorStatus(note.author)
  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: record.text,
        facets: record.facets,
      }),
    [record],
  )

  const threadRootUri = record.reply?.root?.uri || note.uri
  const authorHref = makeProfileLink(note.author)
  const isThreadAuthor = getThreadAuthor(note, record) === currentAccount?.userId

  const likesHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey, 'liked-by')
  }, [note.uri, note.author])
  const renotesHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey, 'renoteed-by')
  }, [note.uri, note.author])
  const quotesHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey, 'quotes')
  }, [note.uri, note.author])

  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
  })
  const additionalNoteAlerts: AppModerationCause[] = useMemo(() => {
    const isNoteHiddenByThreadgate = threadgateHiddenReplies.has(note.uri)
    const isControlledByViewer =
      new SonetUri(threadRootUri).host === currentAccount?.userId
    return isControlledByViewer && isNoteHiddenByThreadgate
      ? [
          {
            type: 'reply-hidden',
            source: {type: 'user', userId: currentAccount?.userId},
            priority: 6,
          },
        ]
      : []
  }, [note, currentAccount?.userId, threadgateHiddenReplies, threadRootUri])
  const onlyFollowersCanReply = !!threadgateRecord?.allow?.find(
    rule => rule.$type === 'app.sonet.feed.threadgate#followerRule',
  )
  const showFollowButton =
    currentAccount?.userId !== note.author.userId && !onlyFollowersCanReply

  const viaRenote = useMemo(() => {
    const reason = noteSource?.note.reason

    if (SonetUtils.isReasonRenote(reason) && reason.uri && reason.cid) {
      return {
        uri: reason.uri,
        cid: reason.cid,
      }
    }
  }, [noteSource])

  const onPressReply = useCallback(() => {
    openComposer({
      replyTo: {
        uri: note.uri,
        cid: note.cid,
        text: record.text,
        author: note.author,
        embed: note.embed,
        moderation,
      },
      onNoteSuccess: onNoteSuccess,
    })

    if (noteSource) {
      feedFeedback.sendInteraction({
        item: note.uri,
        event: 'app.sonet.feed.defs#interactionReply',
        feedContext: noteSource.note.feedContext,
        reqId: noteSource.note.reqId,
      })
    }
  }, [
    openComposer,
    note,
    record,
    onNoteSuccess,
    moderation,
    noteSource,
    feedFeedback,
  ])

  const onOpenAuthor = () => {
    if (noteSource) {
      feedFeedback.sendInteraction({
        item: note.uri,
        event: 'app.sonet.feed.defs#clickthroughAuthor',
        feedContext: noteSource.note.feedContext,
        reqId: noteSource.note.reqId,
      })
    }
  }

  const onOpenEmbed = () => {
    if (noteSource) {
      feedFeedback.sendInteraction({
        item: note.uri,
        event: 'app.sonet.feed.defs#clickthroughEmbed',
        feedContext: noteSource.note.feedContext,
        reqId: noteSource.note.reqId,
      })
    }
  }

  return (
    <>
      <ThreadItemAnchorParentReplyLine isRoot={isRoot} />

      <View
        testID={`noteThreadItem-by-${note.author.username}`}
        style={[
          {
            paddingHorizontal: OUTER_SPACE,
          },
          isRoot && [a.pt_lg],
        ]}>
        <View style={[a.flex_row, a.gap_md, a.pb_md]}>
          <View collapsable={false}>
            <PreviewableUserAvatar
              size={42}
              profile={note.author}
              moderation={moderation.ui('avatar')}
              type={note.author.associated?.labeler ? 'labeler' : 'user'}
              live={live}
              onBeforePress={onOpenAuthor}
            />
          </View>
          <Link
            to={authorHref}
            style={[a.flex_1]}
            label={sanitizeDisplayName(
              note.author.displayName || sanitizeUsername(note.author.username),
              moderation.ui('displayName'),
            )}
            onPress={onOpenAuthor}>
            <View style={[a.flex_1, a.align_start]}>
              <ProfileHoverCard userId={note.author.userId} style={[a.w_full]}>
                <View style={[a.flex_row, a.align_center]}>
                  <Text
                    emoji
                    style={[
                      a.flex_shrink,
                      a.text_lg,
                      a.font_bold,
                      a.leading_snug,
                    ]}
                    numberOfLines={1}>
                    {sanitizeDisplayName(
                      note.author.displayName ||
                        sanitizeUsername(note.author.username),
                      moderation.ui('displayName'),
                    )}
                  </Text>

                  <View style={[{paddingLeft: 3, top: -1}]}>
                    <VerificationCheckButton profile={authorShadow} size="md" />
                  </View>
                </View>
                <Text
                  style={[
                    a.text_md,
                    a.leading_snug,
                    t.atoms.text_contrast_medium,
                  ]}
                  numberOfLines={1}>
                  {sanitizeUsername(note.author.username, '@')}
                </Text>
              </ProfileHoverCard>
            </View>
          </Link>
          {showFollowButton && (
            <View collapsable={false}>
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
            note={item.value.note}
            isThreadAuthor={isThreadAuthor}
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
                <Link to={renotesHref} label={_(msg`Renotes of this note`)}>
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
                <Link to={quotesHref} label={_(msg`Quotes of this note`)}>
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
                <Link to={likesHref} label={_(msg`Likes on this note`)}>
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
                note={noteShadow}
                record={record}
                richText={richText}
                onPressReply={onPressReply}
                logContext="NoteThreadItem"
                threadgateRecord={threadgateRecord}
                feedContext={noteSource?.note?.feedContext}
                reqId={noteSource?.note?.reqId}
                viaRenote={viaRenote}
              />
            </FeedFeedbackProvider>
          </View>
        </View>
      </View>
    </>
  )
})

function ExpandedNoteDetails({
  note,
  isThreadAuthor,
}: {
  note: Extract<ThreadItem, {type: 'threadNote'}>['value']['note']
  isThreadAuthor: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const openLink = useOpenLink()
  const isRootNote = !('reply' in note.record)
  const langPrefs = useLanguagePrefs()

  const translatorUrl = getTranslatorLink(
    note.record?.text || '',
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
        logger.metric('translate', {
          sourceLanguages: note.record.langs ?? [],
          targetLanguage: langPrefs.primaryLanguage,
          textLength: note.record.text.length,
        })
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
              style={[a.text_sm]}
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
            but was first seen by Sonet on{' '}
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

export function ThreadItemAnchorSkeleton() {
  return (
    <View style={[a.p_lg, a.gap_md]}>
      <Skele.Row style={[a.align_center, a.gap_md]}>
        <Skele.Circle size={42} />

        <Skele.Col>
          <Skele.Text style={[a.text_lg, {width: '20%'}]} />
          <Skele.Text blend style={[a.text_md, {width: '40%'}]} />
        </Skele.Col>
      </Skele.Row>

      <View>
        <Skele.Text style={[a.text_xl, {width: '100%'}]} />
        <Skele.Text style={[a.text_xl, {width: '60%'}]} />
      </View>

      <Skele.Text style={[a.text_sm, {width: '50%'}]} />

      <Skele.Row style={[a.justify_between]}>
        <Skele.Pill blend size={24} />
        <Skele.Pill blend size={24} />
        <Skele.Pill blend size={24} />
        <Skele.Circle blend size={24} />
        <Skele.Circle blend size={24} />
      </Skele.Row>
    </View>
  )
}
