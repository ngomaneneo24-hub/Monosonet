import {memo, useState} from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {
  type SonetFeedDefs,
  type SonetFeedNote,
  type SonetFeedThreadgate,
  type RichText as RichTextAPI,
} from '@sonet/api'
import {msg, plural} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {CountWheel} from '#/lib/custom-animations/CountWheel'
import {AnimatedLikeIcon} from '#/lib/custom-animations/LikeIcon'
import {useHaptics} from '#/lib/haptics'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type Shadow} from '#/state/cache/types'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {
  useNoteLikeMutationQueue,
  useNoteRenoteMutationQueue,
} from '#/state/queries/note'
import {useRequireAuth} from '#/state/session'
import {
  ProgressGuideAction,
  useProgressGuideControls,
} from '#/state/shell/progress-guide'
import {formatCount} from '#/view/com/util/numeric/format'
import * as Toast from '#/view/com/util/Toast'
import {atoms as a, useBreakpoints} from '#/alf'
import {Bubble_Stroke2_Corner2_Rounded as Bubble} from '#/components/icons/Bubble'
import {
  NoteControlButton,
  NoteControlButtonIcon,
  NoteControlButtonText,
} from './NoteControlButton'
import {NoteMenuButton} from './NoteMenu'
import {RenoteButton} from './RenoteButton'
import {ShareMenuButton} from './ShareMenu'

let NoteControls = ({
  big,
  note,
  record,
  richText,
  feedContext,
  reqId,
  style,
  onPressReply,
  onNoteReply,
  logContext,
  threadgateRecord,
  onShowLess,
  viaRenote,
}: {
  big?: boolean
  note: Shadow<SonetFeedDefs.NoteView>
  record: SonetFeedNote.Record
  richText: RichTextAPI
  feedContext?: string | undefined
  reqId?: string | undefined
  style?: StyleProp<ViewStyle>
  onPressReply: () => void
  onNoteReply?: (noteUri: string | undefined) => void
  logContext: 'FeedItem' | 'NoteThreadItem' | 'Note' | 'ImmersiveVideo'
  threadgateRecord?: SonetFeedThreadgate.Record
  onShowLess?: (interaction: SonetFeedDefs.Interaction) => void
  viaRenote?: {uri: string; cid: string}
}): React.ReactNode => {
  const {_, i18n} = useLingui()
  const {gtMobile} = useBreakpoints()
  const {openComposer} = useOpenComposer()
  const {feedDescriptor} = useFeedFeedbackContext()
  const [queueLike, queueUnlike] = useNoteLikeMutationQueue(
    note,
    viaRenote,
    feedDescriptor,
    logContext,
  )
  const [queueRenote, queueUnrenote] = useNoteRenoteMutationQueue(
    note,
    viaRenote,
    feedDescriptor,
    logContext,
  )
  const requireAuth = useRequireAuth()
  const {sendInteraction} = useFeedFeedbackContext()
  const {captureAction} = useProgressGuideControls()
  const playHaptic = useHaptics()
  const isBlocked = Boolean(
    note.author.viewer?.blocking ||
      note.author.viewer?.blockedBy ||
      note.author.viewer?.blockingByList,
  )
  const replyDisabled = note.viewer?.replyDisabled

  const [hasLikeIconBeenToggled, setHasLikeIconBeenToggled] = useState(false)

  const onPressToggleLike = async () => {
    if (isBlocked) {
      Toast.show(
        _(msg`Cannot interact with a blocked user`),
        'exclamation-circle',
      )
      return
    }

    try {
      setHasLikeIconBeenToggled(true)
      if (!note.viewer?.like) {
        playHaptic('Light')
        sendInteraction({
          item: note.uri,
          event: 'app.sonet.feed.defs#interactionLike',
          feedContext,
          reqId,
        })
        captureAction(ProgressGuideAction.Like)
        await queueLike()
      } else {
        await queueUnlike()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        throw e
      }
    }
  }

  const onRenote = async () => {
    if (isBlocked) {
      Toast.show(
        _(msg`Cannot interact with a blocked user`),
        'exclamation-circle',
      )
      return
    }

    try {
      if (!note.viewer?.renote) {
        sendInteraction({
          item: note.uri,
          event: 'app.sonet.feed.defs#interactionRenote',
          feedContext,
          reqId,
        })
        await queueRenote()
      } else {
        await queueUnrenote()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        throw e
      }
    }
  }

  const onQuote = () => {
    if (isBlocked) {
      Toast.show(
        _(msg`Cannot interact with a blocked user`),
        'exclamation-circle',
      )
      return
    }

    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#interactionQuote',
      feedContext,
      reqId,
    })
    openComposer({
      quote: note,
      onNote: onNoteReply,
    })
  }

  const onShare = () => {
    sendInteraction({
      item: note.uri,
      event: 'app.sonet.feed.defs#interactionShare',
      feedContext,
      reqId,
    })
  }

  return (
    <View
      style={[
        a.flex_row,
        a.justify_between,
        a.align_center,
        !big && a.pt_2xs,
        style,
      ]}>
      <View
        style={[
          big ? a.align_center : [a.flex_1, a.align_start, {marginLeft: -6}],
          replyDisabled ? {opacity: 0.5} : undefined,
        ]}>
        <NoteControlButton
          testID="replyBtn"
          onPress={
            !replyDisabled ? () => requireAuth(() => onPressReply()) : undefined
          }
          label={_(
            msg({
              message: `Reply (${plural(note.replyCount || 0, {
                one: '# reply',
                other: '# replies',
              })})`,
              comment:
                'Accessibility label for the reply button, verb form followed by number of replies and noun form',
            }),
          )}
          big={big}>
          <NoteControlButtonIcon icon={Bubble} />
          {typeof note.replyCount !== 'undefined' && note.replyCount > 0 && (
            <NoteControlButtonText>
              {formatCount(i18n, note.replyCount)}
            </NoteControlButtonText>
          )}
        </NoteControlButton>
      </View>
      <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
        <RenoteButton
          isRenoteed={!!note.viewer?.renote}
          renoteCount={(note.renoteCount ?? 0) + (note.quoteCount ?? 0)}
          onRenote={onRenote}
          onQuote={onQuote}
          big={big}
          embeddingDisabled={Boolean(note.viewer?.embeddingDisabled)}
        />
      </View>
      <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
        <NoteControlButton
          testID="likeBtn"
          big={big}
          onPress={() => requireAuth(() => onPressToggleLike())}
          label={
            note.viewer?.like
              ? _(
                  msg({
                    message: `Unlike (${plural(note.likeCount || 0, {
                      one: '# like',
                      other: '# likes',
                    })})`,
                    comment:
                      'Accessibility label for the like button when the note has been liked, verb followed by number of likes and noun',
                  }),
                )
              : _(
                  msg({
                    message: `Like (${plural(note.likeCount || 0, {
                      one: '# like',
                      other: '# likes',
                    })})`,
                    comment:
                      'Accessibility label for the like button when the note has not been liked, verb form followed by number of likes and noun form',
                  }),
                )
          }>
          <AnimatedLikeIcon
            isLiked={Boolean(note.viewer?.like)}
            big={big}
            hasBeenToggled={hasLikeIconBeenToggled}
          />
          <CountWheel
            likeCount={note.likeCount ?? 0}
            big={big}
            isLiked={Boolean(note.viewer?.like)}
            hasBeenToggled={hasLikeIconBeenToggled}
          />
        </NoteControlButton>
      </View>
      <View style={big ? a.align_center : [a.flex_1, a.align_start]}>
        <View style={[!big && a.ml_sm]}>
          <ShareMenuButton
            testID="noteShareBtn"
            note={note}
            big={big}
            record={record}
            richText={richText}
            timestamp={note.indexedAt}
            threadgateRecord={threadgateRecord}
            onShare={onShare}
          />
        </View>
      </View>
      <View
        style={big ? a.align_center : [gtMobile && a.flex_1, a.align_start]}>
        <NoteMenuButton
          testID="noteDropdownBtn"
          note={note}
          noteFeedContext={feedContext}
          noteReqId={reqId}
          big={big}
          record={record}
          richText={richText}
          timestamp={note.indexedAt}
          threadgateRecord={threadgateRecord}
          onShowLess={onShowLess}
        />
      </View>
    </View>
  )
}
NoteControls = memo(NoteControls)
export {NoteControls}
