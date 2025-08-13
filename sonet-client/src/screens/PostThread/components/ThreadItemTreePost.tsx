import {memo, useCallback, useMemo, useState} from 'react'
import {View} from 'react-native'
import { type SonetNote, type SonetProfile, type SonetFeedGenerator, type SonetNoteRecord, type SonetFeedViewNote, type SonetInteraction, type SonetSavedFeed } from '#/types/sonet'
import {Trans} from '@lingui/macro'

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
import {
  OUTER_SPACE,
  REPLY_LINE_WIDTH,
  TREE_AVI_WIDTH,
  TREE_INDENT,
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

/**
 * Mimic the space in NoteMeta
 */
const TREE_AVI_PLUS_SPACE = TREE_AVI_WIDTH + a.gap_xs.gap

export function ThreadItemTreeNote({
  item,
  overrides,
  onNoteSuccess,
  threadgateRecord,
}: {
  item: Extract<ThreadItem, {type: 'threadNote'}>
  overrides?: {
    moderation?: boolean
    topBorder?: boolean
  }
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  threadgateRecord?: SonetFeedThreadgate.Record
}) {
  const noteShadow = useNoteShadow(item.value.note)

  if (noteShadow === POST_TOMBSTONE) {
    return <ThreadItemTreeNoteDeleted item={item} />
  }

  return (
    <ThreadItemTreeNoteInner
      // Safeguard from clobbering per-note state below:
      key={noteShadow.uri}
      item={item}
      noteShadow={noteShadow}
      threadgateRecord={threadgateRecord}
      overrides={overrides}
      onNoteSuccess={onNoteSuccess}
    />
  )
}

function ThreadItemTreeNoteDeleted({
  item,
}: {
  item: Extract<ThreadItem, {type: 'threadNote'}>
}) {
  const t = useTheme()
  return (
    <ThreadItemTreeNoteOuterWrapper item={item}>
      <ThreadItemTreeNoteInnerWrapper item={item}>
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.rounded_sm,
            t.atoms.bg_contrast_25,
            {
              gap: 6,
              paddingHorizontal: OUTER_SPACE / 2,
              height: TREE_AVI_WIDTH,
            },
          ]}>
          <TrashIcon style={[t.atoms.text]} width={14} />
          <Text style={[t.atoms.text_contrast_medium, a.mt_2xs]}>
            <Trans>Note has been deleted</Trans>
          </Text>
        </View>
        {item.ui.isLastChild && !item.ui.precedesChildReadMore && (
          <View style={{height: OUTER_SPACE / 2}} />
        )}
      </ThreadItemTreeNoteInnerWrapper>
    </ThreadItemTreeNoteOuterWrapper>
  )
}

const ThreadItemTreeNoteOuterWrapper = memo(
  function ThreadItemTreeNoteOuterWrapper({
    item,
    children,
  }: {
    item: Extract<ThreadItem, {type: 'threadNote'}>
    children: React.ReactNode
  }) {
    const t = useTheme()
    const indents = Math.max(0, item.ui.indent - 1)

    return (
      <View
        style={[
          a.flex_row,
          item.ui.indent === 1 &&
            !item.ui.showParentReplyLine && [
              a.border_t,
              t.atoms.border_contrast_low,
            ],
        ]}>
        {Array.from(Array(indents)).map((_, n: number) => {
          const isSkipped = item.ui.skippedIndentIndices.has(n)
          return (
            <View
              key={`${item.value.note.uri}-padding-${n}`}
              style={[
                t.atoms.border_contrast_low,
                {
                  borderRightWidth: isSkipped ? 0 : REPLY_LINE_WIDTH,
                  width: TREE_INDENT + TREE_AVI_WIDTH / 2,
                  left: 1,
                },
              ]}
            />
          )
        })}
        {children}
      </View>
    )
  },
)

const ThreadItemTreeNoteInnerWrapper = memo(
  function ThreadItemTreeNoteInnerWrapper({
    item,
    children,
  }: {
    item: Extract<ThreadItem, {type: 'threadNote'}>
    children: React.ReactNode
  }) {
    const t = useTheme()
    return (
      <View
        style={[
          a.flex_1, // TODO check on ios
          {
            paddingHorizontal: OUTER_SPACE,
            paddingTop: OUTER_SPACE / 2,
          },
          item.ui.indent === 1 && [
            !item.ui.showParentReplyLine && a.pt_lg,
            !item.ui.showChildReplyLine && a.pb_sm,
          ],
          item.ui.isLastChild &&
            !item.ui.precedesChildReadMore && [
              {
                paddingBottom: OUTER_SPACE / 2,
              },
            ],
        ]}>
        {item.ui.indent > 1 && (
          <View
            style={[
              a.absolute,
              t.atoms.border_contrast_low,
              {
                left: -1,
                top: 0,
                height:
                  TREE_AVI_WIDTH / 2 + REPLY_LINE_WIDTH / 2 + OUTER_SPACE / 2,
                width: OUTER_SPACE,
                borderLeftWidth: REPLY_LINE_WIDTH,
                borderBottomWidth: REPLY_LINE_WIDTH,
                borderBottomLeftRadius: a.rounded_sm.borderRadius,
              },
            ]}
          />
        )}
        {children}
      </View>
    )
  },
)

const ThreadItemTreeReplyChildReplyLine = memo(
  function ThreadItemTreeReplyChildReplyLine({
    item,
  }: {
    item: Extract<ThreadItem, {type: 'threadNote'}>
  }) {
    const t = useTheme()
    return (
      <View style={[a.relative, a.pt_2xs, {width: TREE_AVI_PLUS_SPACE}]}>
        {item.ui.showChildReplyLine && (
          <View
            style={[
              a.flex_1,
              t.atoms.border_contrast_low,
              {borderRightWidth: 2, width: '50%', left: -1},
            ]}
          />
        )}
      </View>
    )
  },
)

const ThreadItemTreeNoteInner = memo(function ThreadItemTreeNoteInner({
  item,
  noteShadow,
  overrides,
  onNoteSuccess,
  threadgateRecord,
}: {
  item: Extract<ThreadItem, {type: 'threadNote'}>
  noteShadow: Shadow<SonetNote>
  overrides?: {
    moderation?: boolean
    topBorder?: boolean
  }
  onNoteSuccess?: (data: OnNoteSuccessData) => void
  threadgateRecord?: SonetFeedThreadgate.Record
}): React.ReactNode {
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

  return (
    <ThreadItemTreeNoteOuterWrapper item={item}>
      <SubtleHover>
        <NoteHider
          testID={`noteThreadItem-by-${note.author.username}`}
          href={noteHref}
          disabled={overrides?.moderation === true}
          modui={moderation.ui('contentList')}
          iconSize={42}
          iconStyles={{marginLeft: 2, marginRight: 2}}
          profile={note.author}
          interpretFilterAsBlur>
          <ThreadItemTreeNoteInnerWrapper item={item}>
            <View style={[a.flex_1]}>
              <NoteMeta
                author={note.author}
                moderation={moderation}
                timestamp={note.indexedAt}
                noteHref={noteHref}
                avatarSize={TREE_AVI_WIDTH}
                style={[a.pb_0]}
                showAvatar
              />
              <View style={[a.flex_row]}>
                <ThreadItemTreeReplyChildReplyLine item={item} />
                <View style={[a.flex_1, a.pl_2xs]}>
                  <LabelsOnMyNote note={note} style={[a.pb_2xs]} />
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
                  ) : null}
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
            </View>
          </ThreadItemTreeNoteInnerWrapper>
        </NoteHider>
      </SubtleHover>
    </ThreadItemTreeNoteOuterWrapper>
  )
})

function SubtleHover({children}: {children: React.ReactNode}) {
  const {
    state: hover,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()
  return (
    <View
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      style={[a.flex_1, a.pointer]}>
      <SubtleWebHover hover={hover} />
      {children}
    </View>
  )
}

export function ThreadItemTreeNoteSkeleton({index}: {index: number}) {
  const t = useTheme()
  const even = index % 2 === 0
  return (
    <View
      style={[
        {paddingHorizontal: OUTER_SPACE, paddingVertical: OUTER_SPACE / 1.5},
        a.gap_md,
        a.border_t,
        t.atoms.border_contrast_low,
      ]}>
      <Skele.Row style={[a.align_start, a.gap_md]}>
        <Skele.Circle size={TREE_AVI_WIDTH} />

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
