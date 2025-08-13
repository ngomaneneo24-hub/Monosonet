import {memo, type ReactNode, useCallback, useMemo, useState} from 'react'
import {View} from 'react-native'
import { type SonetNote, type SonetProfile, type SonetFeedGenerator, type SonetNoteRecord, type SonetFeedViewNote, type SonetInteraction, type SonetSavedFeed } from '#/types/sonet'
import {Trans} from '@lingui/macro'

import {useActorStatus} from '#/lib/actor-status'
import {MAX_POST_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {makeProfileLink} from '#/lib/routes/links'
import {countLines} from '#/lib/strings/helpers'
import {
  POST_TOMBSTONE,
  type Shadow,
  useNoteShadow,
} from '#/state/cache/note-shadow'
import {type ThreadItem} from '#/state/queries/useNoteThread/types'
import {useSession} from '#/state/session'
import {type OnNoteSuccessData} from '#/state/shell/composer'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import {NoteMeta} from '#/view/com/util/NoteMeta'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {
  LINEAR_AVI_WIDTH,
  OUTER_SPACE,
  REPLY_LINE_WIDTH,
} from '#/screens/NoteThread/const'
import {atoms as a, useTheme} from '#/alf'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {LabelsOnMyNote} from '#/components/moderation/LabelsOnMe'
import {NoteAlerts} from '#/components/moderation/NoteAlerts'
import {NoteHider} from '#/components/moderation/NoteHider'
import {type AppModerationCause} from '#/components/Pills'
import {Embed, NoteEmbedViewContext} from '#/components/Note/Embed'
import {ShowMoreTextButton} from '#/components/Note/ShowMoreTextButton'
import {NoteControls} from '#/components/NoteControls'
import {string} from '#/components/string'
import * as Skele from '#/components/Skeleton'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import {Text} from '#/components/Typography'

export type ThreadItemNoteProps = {
  item: Extract<ThreadItem, {type: 'threadNote'}>
  overrides?: {
    moderation?: boolean
    topBorder?: boolean
  }
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  threadgateRecord?: SonetFeedThreadgate.Record
}

export function ThreadItemNote({
  item,
  overrides,
  onNoteSuccess,
  threadgateRecord,
}: ThreadItemNoteProps) {
  const noteShadow = useNoteShadow(item.value.note)

  if (noteShadow === POST_TOMBSTONE) {
    return <ThreadItemNoteDeleted item={item} overrides={overrides} />
  }

  return (
    <ThreadItemNoteInner
      item={item}
      noteShadow={noteShadow}
      threadgateRecord={threadgateRecord}
      overrides={overrides}
      onNoteSuccess={onNoteSuccess}
    />
  )
}

function ThreadItemNoteDeleted({
  item,
  overrides,
}: Pick<ThreadItemNoteProps, 'item' | 'overrides'>) {
  const t = useTheme()

  return (
    <ThreadItemNoteOuterWrapper item={item} overrides={overrides}>
      <ThreadItemNoteParentReplyLine item={item} />

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

      <View style={[{height: 4}]} />
    </ThreadItemNoteOuterWrapper>
  )
}

const ThreadItemNoteOuterWrapper = memo(function ThreadItemNoteOuterWrapper({
  item,
  overrides,
  children,
}: Pick<ThreadItemNoteProps, 'item' | 'overrides'> & {
  children: ReactNode
}) {
  const t = useTheme()
  const showTopBorder =
    !item.ui.showParentReplyLine && overrides?.topBorder !== true

  return (
    <View
      style={[
        showTopBorder && [a.border_t, t.atoms.border_contrast_low],
        {
          paddingHorizontal: OUTER_SPACE,
        },
        // If there's no next child, add a little padding to bottom
        !item.ui.showChildReplyLine &&
          !item.ui.precedesChildReadMore && {
            paddingBottom: OUTER_SPACE / 2,
          },
      ]}>
      {children}
    </View>
  )
})

/**
 * Provides some space between notes as well as contains the reply line
 */
const ThreadItemNoteParentReplyLine = memo(
  function ThreadItemNoteParentReplyLine({
    item,
  }: Pick<ThreadItemNoteProps, 'item'>) {
    const t = useTheme()
    return (
      <View style={[a.flex_row, {height: 12}]}>
        <View style={{width: LINEAR_AVI_WIDTH}}>
          {item.ui.showParentReplyLine && (
            <View
              style={[
                a.mx_auto,
                a.flex_1,
                a.mb_xs,
                {
                  width: REPLY_LINE_WIDTH,
                  backgroundColor: t.atoms.border_contrast_low.borderColor,
                },
              ]}
            />
          )}
        </View>
      </View>
    )
  },
)

const ThreadItemNoteInner = memo(function ThreadItemNoteInner({
  item,
  noteShadow,
  overrides,
  onNoteSuccess,
  threadgateRecord,
}: ThreadItemNoteProps & {
  noteShadow: Shadow<SonetNote>
}) {
  const t = useTheme()
  const {openComposer} = useOpenComposer()
  const {currentAccount} = useSession()

  const note = item.value.note
  const record = item.value.note.record
  const moderation = item.moderation
  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: record.text,
        facets: record.facets,
      }),
    [record],
  )
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText?.text) >= MAX_POST_LINES,
  )
  const threadRootUri = record.reply?.root?.uri || note.uri
  const noteHref = useMemo(() => {
    const urip = new SonetUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey)
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
  }, [openComposer, note, record, onNoteSuccess, moderation])

  const onPressShowMore = useCallback(() => {
    setLimitLines(false)
  }, [setLimitLines])

  const {isActive: live} = useActorStatus(note.author)

  return (
    <SubtleHover>
      <ThreadItemNoteOuterWrapper item={item} overrides={overrides}>
        <NoteHider
          testID={`noteThreadItem-by-${note.author.username}`}
          href={noteHref}
          disabled={overrides?.moderation === true}
          modui={moderation.ui('contentList')}
          iconSize={LINEAR_AVI_WIDTH}
          iconStyles={{marginLeft: 2, marginRight: 2}}
          profile={note.author}
          interpretFilterAsBlur>
          <ThreadItemNoteParentReplyLine item={item} />

          <View style={[a.flex_row, a.gap_md]}>
            <View>
              <PreviewableUserAvatar
                size={LINEAR_AVI_WIDTH}
                profile={note.author}
                moderation={moderation.ui('avatar')}
                type={note.author.associated?.labeler ? 'labeler' : 'user'}
                live={live}
              />

              {(item.ui.showChildReplyLine ||
                item.ui.precedesChildReadMore) && (
                <View
                  style={[
                    a.mx_auto,
                    a.mt_xs,
                    a.flex_1,
                    {
                      width: REPLY_LINE_WIDTH,
                      backgroundColor: t.atoms.border_contrast_low.borderColor,
                    },
                  ]}
                />
              )}
            </View>

            <View style={[a.flex_1]}>
              <NoteMeta
                author={note.author}
                moderation={moderation}
                timestamp={note.indexedAt}
                noteHref={noteHref}
                style={[a.pb_xs]}
              />
              <LabelsOnMyNote note={note} style={[a.pb_xs]} />
              <NoteAlerts
                modui={moderation.ui('contentList')}
                style={[a.pb_2xs]}
                additionalCauses={additionalNoteAlerts}
              />
              {richText?.text ? (
                <>
                  <string
                    enableTags
                    value={richText}
                    style={[a.flex_1, a.text_md]}
                    numberOfLines={limitLines ? MAX_POST_LINES : undefined}
                    authorUsername={note.author.username}
                    shouldProxyLinks={true}
                  />
                  {limitLines && (
                    <ShowMoreTextButton
                      style={[a.text_md]}
                      onPress={onPressShowMore}
                    />
                  )}
                </>
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
                note={noteShadow}
                record={record}
                richText={richText}
                onPressReply={onPressReply}
                logContext="NoteThreadItem"
                threadgateRecord={threadgateRecord}
              />
            </View>
          </View>
        </NoteHider>
      </ThreadItemNoteOuterWrapper>
    </SubtleHover>
  )
})

function SubtleHover({children}: {children: ReactNode}) {
  const {
    state: hover,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()
  return (
    <View
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      style={a.pointer}>
      <SubtleWebHover hover={hover} />
      {children}
    </View>
  )
}

export function ThreadItemNoteSkeleton({index}: {index: number}) {
  const even = index % 2 === 0
  return (
    <View
      style={[
        {paddingHorizontal: OUTER_SPACE, paddingVertical: OUTER_SPACE / 1.5},
        a.gap_md,
      ]}>
      <Skele.Row style={[a.align_start, a.gap_md]}>
        <Skele.Circle size={LINEAR_AVI_WIDTH} />

        <Skele.Col style={[a.gap_xs]}>
          <Skele.Row style={[a.gap_sm]}>
            <Skele.Text style={[a.text_md, {width: '20%'}]} />
            <Skele.Text blend style={[a.text_md, {width: '30%'}]} />
          </Skele.Row>

          <Skele.Col>
            {even ? (
              <>
                <Skele.Text blend style={[a.text_md, {width: '100%'}]} />
                <Skele.Text blend style={[a.text_md, {width: '60%'}]} />
              </>
            ) : (
              <Skele.Text blend style={[a.text_md, {width: '60%'}]} />
            )}
          </Skele.Col>

          <Skele.Row style={[a.justify_between, a.pt_xs]}>
            <Skele.Pill blend size={16} />
            <Skele.Pill blend size={16} />
            <Skele.Pill blend size={16} />
            <Skele.Circle blend size={16} />
            <View />
          </Skele.Row>
        </Skele.Col>
      </Skele.Row>
    </View>
  )
}
