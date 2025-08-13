import {useCallback, useMemo, useState} from 'react'
import {type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native'
import { type SonetNote, type SonetProfile, type SonetFeedGenerator, type SonetNoteRecord, type SonetFeedViewNote, type SonetInteraction, type SonetSavedFeed } from '#/types/sonet'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {Trans} from '@lingui/macro'
import {useQueryClient} from '@tanstack/react-query'

import {MAX_NOTE_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {countLines} from '#/lib/strings/helpers'
import {colors, s} from '#/lib/styles'
import {
  NOTE_TOMBSTONE,
  type Shadow,
  useNoteShadow,
} from '#/state/cache/note-shadow'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {precacheProfile} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {Link} from '#/view/com/util/Link'
import {NoteMeta} from '#/view/com/util/NoteMeta'
import {Text} from '#/view/com/util/text/Text'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {UserInfoText} from '#/view/com/util/UserInfoText'
import {atoms as a} from '#/alf'
import {ContentHider} from '#/components/moderation/ContentHider'
import {LabelsOnMyNote} from '#/components/moderation/LabelsOnMe'
import {NoteAlerts} from '#/components/moderation/NoteAlerts'
import {Embed, NoteEmbedViewContext} from '#/components/Note/Embed'
import {ShowMoreTextButton} from '#/components/Note/ShowMoreTextButton'
import {NoteControls} from '#/components/NoteControls'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {string} from '#/components/string'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import * as bsky from '#/types/bsky'

export function Note({
  note,
  showReplyLine,
  hideTopBorder,
  style,
}: {
  note: SonetNote
  showReplyLine?: boolean
  hideTopBorder?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const moderationOpts = useModerationOpts()
  const record = useMemo<SonetNoteRecord | undefined>(
    () =>
      bsky.validate(note.record, SonetNote.validateRecord)
        ? note.record
        : undefined,
    [note],
  )
  const noteShadowed = useNoteShadow(note)
  const richText = useMemo(
    () =>
      record
        ? new RichTextAPI({
            text: record.text,
            facets: record.facets,
          })
        : undefined,
    [record],
  )
  const moderation = useMemo(
    () => (moderationOpts ? moderateNote(note, moderationOpts) : undefined),
    [moderationOpts, note],
  )
  if (noteShadowed === NOTE_TOMBSTONE) {
    return null
  }
  if (record && richText && moderation) {
    return (
      <NoteInner
        note={noteShadowed}
        record={record}
        richText={richText}
        moderation={moderation}
        showReplyLine={showReplyLine}
        hideTopBorder={hideTopBorder}
        style={style}
      />
    )
  }
  return null
}

function NoteInner({
  note,
  record,
  richText,
  moderation,
  showReplyLine,
  hideTopBorder,
  style,
}: {
  note: Shadow<SonetNote>
  record: SonetNoteRecord
  richText: RichTextAPI
  moderation: SonetModerationDecision
  showReplyLine?: boolean
  hideTopBorder?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const queryClient = useQueryClient()
  const pal = usePalette('default')
  const {openComposer} = useOpenComposer()
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText?.text) >= MAX_NOTE_LINES,
  )
  const itemUrip = new SonetUri(note.uri)
  const itemHref = makeProfileLink(note.author, 'note', itemUrip.rkey)
  let replyAuthorDid = ''
  if (record.reply) {
    const urip = new SonetUri(record.reply.parent?.uri || record.reply.root.uri)
    replyAuthorDid = urip.hostname
  }

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
    })
  }, [openComposer, note, record, moderation])

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  const onBeforePress = useCallback(() => {
    precacheProfile(queryClient, note.author)
  }, [queryClient, note.author])

  const {currentAccount} = useSession()
  const isMe = replyAuthorDid === currentAccount?.userId

  const [hover, setHover] = useState(false)
  return (
    <Link
      href={itemHref}
      style={[
        styles.outer,
        pal.border,
        !hideTopBorder && {borderTopWidth: StyleSheet.hairlineWidth},
        style,
      ]}
      onBeforePress={onBeforePress}
      onPointerEnter={() => {
        setHover(true)
      }}
      onPointerLeave={() => {
        setHover(false)
      }}>
      <SubtleWebHover hover={hover} />
      {showReplyLine && <View style={styles.replyLine} />}
      <View style={styles.layout}>
        <View style={styles.layoutAvi}>
          <PreviewableUserAvatar
            size={42}
            profile={note.author}
            moderation={moderation.ui('avatar')}
            type={note.author.associated?.labeler ? 'labeler' : 'user'}
          />
        </View>
        <View style={styles.layoutContent}>
          <NoteMeta
            author={note.author}
            moderation={moderation}
            timestamp={note.indexedAt}
            noteHref={itemHref}
          />
          {replyAuthorDid !== '' && (
            <View style={[s.flexRow, s.mb2, s.alignCenter]}>
              <FontAwesomeIcon
                icon="reply"
                size={9}
                style={[pal.textLight, s.mr5]}
              />
              <Text
                type="sm"
                style={[pal.textLight, s.mr2]}
                lineHeight={1.2}
                numberOfLines={1}>
                {isMe ? (
                  <Trans context="description">Reply to you</Trans>
                ) : (
                  <Trans context="description">
                    Reply to{' '}
                    <ProfileHoverCard userId={replyAuthorDid}>
                      <UserInfoText
                        type="sm"
                        userId={replyAuthorDid}
                        attr="displayName"
                        style={[pal.textLight]}
                      />
                    </ProfileHoverCard>
                  </Trans>
                )}
              </Text>
            </View>
          )}
          <LabelsOnMyNote note={note} />
          <ContentHider
            modui={moderation.ui('contentView')}
            style={styles.contentHider}
            childContainerStyle={styles.contentHiderChild}>
            <NoteAlerts
              modui={moderation.ui('contentView')}
              style={[a.py_xs]}
            />
            {richText.text ? (
              <View>
                <string
                  enableTags
                  testID="noteText"
                  value={richText}
                  numberOfLines={limitLines ? MAX_NOTE_LINES : undefined}
                  style={[a.flex_1, a.text_md]}
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
            {note.embed ? (
              <Embed
                embed={note.embed}
                moderation={moderation}
                viewContext={NoteEmbedViewContext.Feed}
              />
            ) : null}
          </ContentHider>
          <NoteControls
            note={note}
            record={record}
            richText={richText}
            onPressReply={onPressReply}
            logContext="Note"
          />
        </View>
      </View>
    </Link>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingTop: 10,
    paddingRight: 15,
    paddingBottom: 5,
    paddingLeft: 10,
    // @ts-ignore web only -prf
    cursor: 'pointer',
  },
  layout: {
    flexDirection: 'row',
    gap: 10,
  },
  layoutAvi: {
    paddingLeft: 8,
  },
  layoutContent: {
    flex: 1,
  },
  alert: {
    marginBottom: 6,
  },
  replyLine: {
    position: 'absolute',
    left: 36,
    top: 70,
    bottom: 0,
    borderLeftWidth: 2,
    borderLeftColor: colors.gray2,
  },
  contentHider: {
    marginBottom: 2,
  },
  contentHiderChild: {
    marginTop: 6,
  },
})
