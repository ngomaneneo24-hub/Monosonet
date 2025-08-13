import {memo, useMemo} from 'react'
import {
  Platform,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {
  type SonetFeedDefs,
  SonetFeedNote,
  type SonetFeedThreadgate,
  AtUri,
  type RichText as RichTextAPI,
} from '@sonet/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {DISCOVER_DEBUG_UserIDS} from '#/lib/constants'
import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {getCurrentRoute} from '#/lib/routes/helpers'
import {makeProfileLink} from '#/lib/routes/links'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {logEvent, useGate} from '#/lib/statsig/statsig'
import {richTextToString} from '#/lib/strings/rich-text-helpers'
import {toShareUrl} from '#/lib/strings/url-helpers'
import {getTranslatorLink} from '#/locale/helpers'
import {logger} from '#/logger'
import {type Shadow} from '#/state/cache/note-shadow'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {useLanguagePrefs} from '#/state/preferences'
import {useHiddenNotes, useHiddenNotesApi} from '#/state/preferences'
import {usePinnedNoteMutation} from '#/state/queries/pinned-note'
import {
  useNoteDeleteMutation,
  useThreadMuteMutationQueue,
} from '#/state/queries/note'
import {useToggleQuoteDetachmentMutation} from '#/state/queries/notegate'
import {getMaybeDetachedQuoteEmbed} from '#/state/queries/notegate/util'
import {
  useProfileBlockMutationQueue,
  useProfileMuteMutationQueue,
} from '#/state/queries/profile'
import {useToggleReplyVisibilityMutation} from '#/state/queries/threadgate'
import {useRequireAuth, useSession} from '#/state/session'
import {useMergedThreadgateHiddenReplies} from '#/state/threadgate-hidden-replies'
import * as Toast from '#/view/com/util/Toast'
import {useDialogControl} from '#/components/Dialog'
import {useGlobalDialogsControlContext} from '#/components/dialogs/Context'
import {
  NoteInteractionSettingsDialog,
  usePrefetchNoteInteractionSettings,
} from '#/components/dialogs/NoteInteractionSettingsDialog'
import {Atom_Stroke2_Corner0_Rounded as AtomIcon} from '#/components/icons/Atom'
import {BubbleQuestion_Stroke2_Corner0_Rounded as Translate} from '#/components/icons/Bubble'
import {Clipboard_Stroke2_Corner2_Rounded as ClipboardIcon} from '#/components/icons/Clipboard'
import {
  EmojiSad_Stroke2_Corner0_Rounded as EmojiSad,
  EmojiSmile_Stroke2_Corner0_Rounded as EmojiSmile,
} from '#/components/icons/Emoji'
import {Eye_Stroke2_Corner0_Rounded as Eye} from '#/components/icons/Eye'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlash} from '#/components/icons/EyeSlash'
import {Filter_Stroke2_Corner0_Rounded as Filter} from '#/components/icons/Filter'
import {Mute_Stroke2_Corner0_Rounded as MuteIcon} from '#/components/icons/Mute'
import {Mute_Stroke2_Corner0_Rounded as Mute} from '#/components/icons/Mute'
import {PersonX_Stroke2_Corner0_Rounded as PersonX} from '#/components/icons/Person'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import {SettingsGear2_Stroke2_Corner0_Rounded as Gear} from '#/components/icons/SettingsGear2'
import {SpeakerVolumeFull_Stroke2_Corner0_Rounded as UnmuteIcon} from '#/components/icons/Speaker'
import {SpeakerVolumeFull_Stroke2_Corner0_Rounded as Unmute} from '#/components/icons/Speaker'
import {Trash_Stroke2_Corner0_Rounded as Trash} from '#/components/icons/Trash'
import {Warning_Stroke2_Corner0_Rounded as Warning} from '#/components/icons/Warning'
import {Loader} from '#/components/Loader'
import * as Menu from '#/components/Menu'
import {
  ReportDialog,
  useReportDialogControl,
} from '#/components/moderation/ReportDialog'
import * as Prompt from '#/components/Prompt'
import {IS_INTERNAL} from '#/env'
import * as bsky from '#/types/bsky'

let NoteMenuItems = ({
  note,
  noteFeedContext,
  noteReqId,
  record,
  richText,
  threadgateRecord,
  onShowLess,
}: {
  testID: string
  note: Shadow<SonetFeedDefs.NoteView>
  noteFeedContext: string | undefined
  noteReqId: string | undefined
  record: SonetFeedNote.Record
  richText: RichTextAPI
  style?: StyleProp<ViewStyle>
  hitSlop?: PressableProps['hitSlop']
  size?: 'lg' | 'md' | 'sm'
  timestamp: string
  threadgateRecord?: SonetFeedThreadgate.Record
  onShowLess?: (interaction: SonetFeedDefs.Interaction) => void
}): React.ReactNode => {
  const {hasSession, currentAccount} = useSession()
  const {_} = useLingui()
  const langPrefs = useLanguagePrefs()
  const {mutateAsync: deleteNoteMutate} = useNoteDeleteMutation()
  const {mutateAsync: pinNoteMutate, isPending: isPinPending} =
    usePinnedNoteMutation()
  const requireSignIn = useRequireAuth()
  const hiddenNotes = useHiddenNotes()
  const {hideNote} = useHiddenNotesApi()
  const feedFeedback = useFeedFeedbackContext()
  const openLink = useOpenLink()
  const navigation = useNavigation<NavigationProp>()
  const {mutedWordsDialogControl} = useGlobalDialogsControlContext()
  const blockPromptControl = useDialogControl()
  const reportDialogControl = useReportDialogControl()
  const deletePromptControl = useDialogControl()
  const hidePromptControl = useDialogControl()
  const noteInteractionSettingsDialogControl = useDialogControl()
  const quoteNoteDetachConfirmControl = useDialogControl()
  const hideReplyConfirmControl = useDialogControl()
  const {mutateAsync: toggleReplyVisibility} =
    useToggleReplyVisibilityMutation()

  const noteUri = note.uri
  const noteCid = note.cid
  const noteAuthor = useProfileShadow(note.author)
  const quoteEmbed = useMemo(() => {
    if (!currentAccount || !note.embed) return
    return getMaybeDetachedQuoteEmbed({
      viewerDid: currentAccount.userId,
      note,
    })
  }, [note, currentAccount])

  const rootUri = record.reply?.root?.uri || noteUri
  const isReply = Boolean(record.reply)
  const [isThreadMuted, muteThread, unmuteThread] = useThreadMuteMutationQueue(
    note,
    rootUri,
  )
  const isNoteHidden = hiddenNotes && hiddenNotes.includes(noteUri)
  const isAuthor = noteAuthor.userId === currentAccount?.userId
  const isRootNoteAuthor = new AtUri(rootUri).host === currentAccount?.userId
  const threadgateHiddenReplies = useMergedThreadgateHiddenReplies({
    threadgateRecord,
  })
  const isReplyHiddenByThreadgate = threadgateHiddenReplies.has(noteUri)
  const isPinned = note.viewer?.pinned

  const {mutateAsync: toggleQuoteDetachment, isPending: isDetachPending} =
    useToggleQuoteDetachmentMutation()

  const [queueBlock] = useProfileBlockMutationQueue(noteAuthor)
  const [queueMute, queueUnmute] = useProfileMuteMutationQueue(noteAuthor)

  const prefetchNoteInteractionSettings = usePrefetchNoteInteractionSettings({
    noteUri: note.uri,
    rootNoteUri: rootUri,
  })

  const href = useMemo(() => {
    const urip = new AtUri(noteUri)
    return makeProfileLink(noteAuthor, 'note', urip.rkey)
  }, [noteUri, noteAuthor])

  const translatorUrl = getTranslatorLink(
    record.text,
    langPrefs.primaryLanguage,
  )

  const onDeleteNote = () => {
    deleteNoteMutate({uri: noteUri}).then(
      () => {
        Toast.show(_(msg({message: 'Note deleted', context: 'toast'})))

        const route = getCurrentRoute(navigation.getState())
        if (route.name === 'NoteThread') {
          const params = route.params as CommonNavigatorParams['NoteThread']
          if (
            currentAccount &&
            isAuthor &&
            (params.name === currentAccount.username ||
              params.name === currentAccount.userId)
          ) {
            const currentHref = makeProfileLink(noteAuthor, 'note', params.rkey)
            if (currentHref === href && navigation.canGoBack()) {
              navigation.goBack()
            }
          }
        }
      },
      e => {
        logger.error('Failed to delete note', {message: e})
        Toast.show(_(msg`Failed to delete note, please try again`), 'xmark')
      },
    )
  }

  const onToggleThreadMute = () => {
    try {
      if (isThreadMuted) {
        unmuteThread()
        Toast.show(_(msg`You will now receive notifications for this thread`))
      } else {
        muteThread()
        Toast.show(
          _(msg`You will no longer receive notifications for this thread`),
        )
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        logger.error('Failed to toggle thread mute', {message: e})
        Toast.show(
          _(msg`Failed to toggle thread mute, please try again`),
          'xmark',
        )
      }
    }
  }

  const onCopyNoteText = () => {
    const str = richTextToString(richText, true)

    Clipboard.setStringAsync(str)
    Toast.show(_(msg`Copied to clipboard`), 'clipboard-check')
  }

  const onPressTranslate = async () => {
    await openLink(translatorUrl, true)

    if (
      bsky.dangerousIsType<SonetFeedNote.Record>(
        note.record,
        SonetFeedNote.isRecord,
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
  }

  const onHideNote = () => {
    hideNote({uri: noteUri})
  }

  const hideInPWI = !!noteAuthor.labels?.find(
    label => label.val === '!no-unauthenticated',
  )

  const onPressShowMore = () => {
    feedFeedback.sendInteraction({
      event: 'app.sonet.feed.defs#requestMore',
      item: noteUri,
      feedContext: noteFeedContext,
      reqId: noteReqId,
    })
    Toast.show(_(msg({message: 'Feedback sent!', context: 'toast'})))
  }

  const onPressShowLess = () => {
    feedFeedback.sendInteraction({
      event: 'app.sonet.feed.defs#requestLess',
      item: noteUri,
      feedContext: noteFeedContext,
      reqId: noteReqId,
    })
    if (onShowLess) {
      onShowLess({
        item: noteUri,
        feedContext: noteFeedContext,
      })
    } else {
      Toast.show(_(msg({message: 'Feedback sent!', context: 'toast'})))
    }
  }

  const onToggleQuoteNoteAttachment = async () => {
    if (!quoteEmbed) return

    const action = quoteEmbed.isDetached ? 'reattach' : 'detach'
    const isDetach = action === 'detach'

    try {
      await toggleQuoteDetachment({
        note,
        quoteUri: quoteEmbed.uri,
        action: quoteEmbed.isDetached ? 'reattach' : 'detach',
      })
      Toast.show(
        isDetach
          ? _(msg`Quote note was successfully detached`)
          : _(msg`Quote note was re-attached`),
      )
    } catch (e: any) {
      Toast.show(
        _(msg({message: 'Updating quote attachment failed', context: 'toast'})),
      )
      logger.error(`Failed to ${action} quote`, {safeMessage: e.message})
    }
  }

  const canHideNoteForMe = !isAuthor && !isNoteHidden
  const canHideReplyForEveryone =
    !isAuthor && isRootNoteAuthor && !isNoteHidden && isReply
  const canDetachQuote = quoteEmbed && quoteEmbed.isOwnedByViewer

  const onToggleReplyVisibility = async () => {
    // TODO no threadgate?
    if (!canHideReplyForEveryone) return

    const action = isReplyHiddenByThreadgate ? 'show' : 'hide'
    const isHide = action === 'hide'

    try {
      await toggleReplyVisibility({
        noteUri: rootUri,
        replyUri: noteUri,
        action,
      })
      Toast.show(
        isHide
          ? _(msg`Reply was successfully hidden`)
          : _(msg({message: 'Reply visibility updated', context: 'toast'})),
      )
    } catch (e: any) {
      Toast.show(
        _(msg({message: 'Updating reply visibility failed', context: 'toast'})),
      )
      logger.error(`Failed to ${action} reply`, {safeMessage: e.message})
    }
  }

  const onPressPin = () => {
    logEvent(isPinned ? 'note:unpin' : 'note:pin', {})
    pinNoteMutate({
      noteUri,
      noteCid,
      action: isPinned ? 'unpin' : 'pin',
    })
  }

  const onBlockAuthor = async () => {
    try {
      await queueBlock()
      Toast.show(_(msg({message: 'Account blocked', context: 'toast'})))
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        logger.error('Failed to block account', {message: e})
        Toast.show(_(msg`There was an issue! ${e.toString()}`), 'xmark')
      }
    }
  }

  const onMuteAuthor = async () => {
    if (noteAuthor.viewer?.muted) {
      try {
        await queueUnmute()
        Toast.show(_(msg({message: 'Account unmuted', context: 'toast'})))
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          logger.error('Failed to unmute account', {message: e})
          Toast.show(_(msg`There was an issue! ${e.toString()}`), 'xmark')
        }
      }
    } else {
      try {
        await queueMute()
        Toast.show(_(msg({message: 'Account muted', context: 'toast'})))
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          logger.error('Failed to mute account', {message: e})
          Toast.show(_(msg`There was an issue! ${e.toString()}`), 'xmark')
        }
      }
    }
  }

  const onReportMisclassification = () => {
    const url = `https://docs.google.com/forms/d/e/1FAIpQLSd0QPqhNFksDQf1YyOos7r1ofCLvmrKAH1lU042TaS3GAZaWQ/viewform?entry.1756031717=${toShareUrl(
      href,
    )}`
    openLink(url)
  }

  const onSignIn = () => requireSignIn(() => {})

  const gate = useGate()
  const isDiscoverDebugUser =
    IS_INTERNAL ||
    DISCOVER_DEBUG_UserIDS[currentAccount?.userId || ''] ||
    gate('debug_show_feedcontext')

  return (
    <>
      <Menu.Outer>
        {isAuthor && (
          <>
            <Menu.Group>
              <Menu.Item
                testID="pinNoteBtn"
                label={
                  isPinned
                    ? _(msg`Unpin from profile`)
                    : _(msg`Pin to your profile`)
                }
                disabled={isPinPending}
                onPress={onPressPin}>
                <Menu.ItemText>
                  {isPinned
                    ? _(msg`Unpin from profile`)
                    : _(msg`Pin to your profile`)}
                </Menu.ItemText>
                <Menu.ItemIcon
                  icon={isPinPending ? Loader : PinIcon}
                  position="right"
                />
              </Menu.Item>
            </Menu.Group>
            <Menu.Divider />
          </>
        )}

        <Menu.Group>
          {!hideInPWI || hasSession ? (
            <>
              <Menu.Item
                testID="noteDropdownTranslateBtn"
                label={_(msg`Translate`)}
                onPress={onPressTranslate}>
                <Menu.ItemText>{_(msg`Translate`)}</Menu.ItemText>
                <Menu.ItemIcon icon={Translate} position="right" />
              </Menu.Item>

              <Menu.Item
                testID="noteDropdownCopyTextBtn"
                label={_(msg`Copy note text`)}
                onPress={onCopyNoteText}>
                <Menu.ItemText>{_(msg`Copy note text`)}</Menu.ItemText>
                <Menu.ItemIcon icon={ClipboardIcon} position="right" />
              </Menu.Item>
            </>
          ) : (
            <Menu.Item
              testID="noteDropdownSignInBtn"
              label={_(msg`Sign in to view note`)}
              onPress={onSignIn}>
              <Menu.ItemText>{_(msg`Sign in to view note`)}</Menu.ItemText>
              <Menu.ItemIcon icon={Eye} position="right" />
            </Menu.Item>
          )}
        </Menu.Group>

        {hasSession && feedFeedback.enabled && (
          <>
            <Menu.Divider />
            <Menu.Group>
              <Menu.Item
                testID="noteDropdownShowMoreBtn"
                label={_(msg`Show more like this`)}
                onPress={onPressShowMore}>
                <Menu.ItemText>{_(msg`Show more like this`)}</Menu.ItemText>
                <Menu.ItemIcon icon={EmojiSmile} position="right" />
              </Menu.Item>

              <Menu.Item
                testID="noteDropdownShowLessBtn"
                label={_(msg`Show less like this`)}
                onPress={onPressShowLess}>
                <Menu.ItemText>{_(msg`Show less like this`)}</Menu.ItemText>
                <Menu.ItemIcon icon={EmojiSad} position="right" />
              </Menu.Item>
            </Menu.Group>
          </>
        )}

        {isDiscoverDebugUser && (
          <Menu.Item
            testID="noteDropdownReportMisclassificationBtn"
            label={_(msg`Assign topic for algo`)}
            onPress={onReportMisclassification}>
            <Menu.ItemText>{_(msg`Assign topic for algo`)}</Menu.ItemText>
            <Menu.ItemIcon icon={AtomIcon} position="right" />
          </Menu.Item>
        )}

        {hasSession && (
          <>
            <Menu.Divider />
            <Menu.Group>
              <Menu.Item
                testID="noteDropdownMuteThreadBtn"
                label={
                  isThreadMuted ? _(msg`Unmute thread`) : _(msg`Mute thread`)
                }
                onPress={onToggleThreadMute}>
                <Menu.ItemText>
                  {isThreadMuted ? _(msg`Unmute thread`) : _(msg`Mute thread`)}
                </Menu.ItemText>
                <Menu.ItemIcon
                  icon={isThreadMuted ? Unmute : Mute}
                  position="right"
                />
              </Menu.Item>

              <Menu.Item
                testID="noteDropdownMuteWordsBtn"
                label={_(msg`Mute words & tags`)}
                onPress={() => mutedWordsDialogControl.open()}>
                <Menu.ItemText>{_(msg`Mute words & tags`)}</Menu.ItemText>
                <Menu.ItemIcon icon={Filter} position="right" />
              </Menu.Item>
            </Menu.Group>
          </>
        )}

        {hasSession &&
          (canHideReplyForEveryone || canDetachQuote || canHideNoteForMe) && (
            <>
              <Menu.Divider />
              <Menu.Group>
                {canHideNoteForMe && (
                  <Menu.Item
                    testID="noteDropdownHideBtn"
                    label={
                      isReply
                        ? _(msg`Hide reply for me`)
                        : _(msg`Hide note for me`)
                    }
                    onPress={() => hidePromptControl.open()}>
                    <Menu.ItemText>
                      {isReply
                        ? _(msg`Hide reply for me`)
                        : _(msg`Hide note for me`)}
                    </Menu.ItemText>
                    <Menu.ItemIcon icon={EyeSlash} position="right" />
                  </Menu.Item>
                )}
                {canHideReplyForEveryone && (
                  <Menu.Item
                    testID="noteDropdownHideBtn"
                    label={
                      isReplyHiddenByThreadgate
                        ? _(msg`Show reply for everyone`)
                        : _(msg`Hide reply for everyone`)
                    }
                    onPress={
                      isReplyHiddenByThreadgate
                        ? onToggleReplyVisibility
                        : () => hideReplyConfirmControl.open()
                    }>
                    <Menu.ItemText>
                      {isReplyHiddenByThreadgate
                        ? _(msg`Show reply for everyone`)
                        : _(msg`Hide reply for everyone`)}
                    </Menu.ItemText>
                    <Menu.ItemIcon
                      icon={isReplyHiddenByThreadgate ? Eye : EyeSlash}
                      position="right"
                    />
                  </Menu.Item>
                )}

                {canDetachQuote && (
                  <Menu.Item
                    disabled={isDetachPending}
                    testID="noteDropdownHideBtn"
                    label={
                      quoteEmbed.isDetached
                        ? _(msg`Re-attach quote`)
                        : _(msg`Detach quote`)
                    }
                    onPress={
                      quoteEmbed.isDetached
                        ? onToggleQuoteNoteAttachment
                        : () => quoteNoteDetachConfirmControl.open()
                    }>
                    <Menu.ItemText>
                      {quoteEmbed.isDetached
                        ? _(msg`Re-attach quote`)
                        : _(msg`Detach quote`)}
                    </Menu.ItemText>
                    <Menu.ItemIcon
                      icon={
                        isDetachPending
                          ? Loader
                          : quoteEmbed.isDetached
                            ? Eye
                            : EyeSlash
                      }
                      position="right"
                    />
                  </Menu.Item>
                )}
              </Menu.Group>
            </>
          )}

        {hasSession && (
          <>
            <Menu.Divider />
            <Menu.Group>
              {!isAuthor && (
                <>
                  <Menu.Item
                    testID="noteDropdownMuteBtn"
                    label={
                      noteAuthor.viewer?.muted
                        ? _(msg`Unmute account`)
                        : _(msg`Mute account`)
                    }
                    onPress={onMuteAuthor}>
                    <Menu.ItemText>
                      {noteAuthor.viewer?.muted
                        ? _(msg`Unmute account`)
                        : _(msg`Mute account`)}
                    </Menu.ItemText>
                    <Menu.ItemIcon
                      icon={noteAuthor.viewer?.muted ? UnmuteIcon : MuteIcon}
                      position="right"
                    />
                  </Menu.Item>

                  {!noteAuthor.viewer?.blocking && (
                    <Menu.Item
                      testID="noteDropdownBlockBtn"
                      label={_(msg`Block account`)}
                      onPress={() => blockPromptControl.open()}>
                      <Menu.ItemText>{_(msg`Block account`)}</Menu.ItemText>
                      <Menu.ItemIcon icon={PersonX} position="right" />
                    </Menu.Item>
                  )}

                  <Menu.Item
                    testID="noteDropdownReportBtn"
                    label={_(msg`Report note`)}
                    onPress={() => reportDialogControl.open()}>
                    <Menu.ItemText>{_(msg`Report note`)}</Menu.ItemText>
                    <Menu.ItemIcon icon={Warning} position="right" />
                  </Menu.Item>
                </>
              )}

              {isAuthor && (
                <>
                  <Menu.Item
                    testID="noteDropdownEditNoteInteractions"
                    label={_(msg`Edit interaction settings`)}
                    onPress={() => noteInteractionSettingsDialogControl.open()}
                    {...(isAuthor
                      ? Platform.select({
                          web: {
                            onHoverIn: prefetchNoteInteractionSettings,
                          },
                          native: {
                            onPressIn: prefetchNoteInteractionSettings,
                          },
                        })
                      : {})}>
                    <Menu.ItemText>
                      {_(msg`Edit interaction settings`)}
                    </Menu.ItemText>
                    <Menu.ItemIcon icon={Gear} position="right" />
                  </Menu.Item>
                  <Menu.Item
                    testID="noteDropdownDeleteBtn"
                    label={_(msg`Delete note`)}
                    onPress={() => deletePromptControl.open()}>
                    <Menu.ItemText>{_(msg`Delete note`)}</Menu.ItemText>
                    <Menu.ItemIcon icon={Trash} position="right" />
                  </Menu.Item>
                </>
              )}
            </Menu.Group>
          </>
        )}
      </Menu.Outer>

      <Prompt.Basic
        control={deletePromptControl}
        title={_(msg`Delete this note?`)}
        description={_(
          msg`If you remove this note, you won't be able to recover it.`,
        )}
        onConfirm={onDeleteNote}
        confirmButtonCta={_(msg`Delete`)}
        confirmButtonColor="negative"
      />

      <Prompt.Basic
        control={hidePromptControl}
        title={isReply ? _(msg`Hide this reply?`) : _(msg`Hide this note?`)}
        description={_(
          msg`This note will be hidden from feeds and threads. This cannot be undone.`,
        )}
        onConfirm={onHideNote}
        confirmButtonCta={_(msg`Hide`)}
      />

      <ReportDialog
        control={reportDialogControl}
        subject={{
          ...note,
          type: "sonet",
        }}
      />

      <NoteInteractionSettingsDialog
        control={noteInteractionSettingsDialogControl}
        noteUri={note.uri}
        rootNoteUri={rootUri}
        initialThreadgateView={note.threadgate}
      />

      <Prompt.Basic
        control={quoteNoteDetachConfirmControl}
        title={_(msg`Detach quote note?`)}
        description={_(
          msg`This will remove your note from this quote note for all users, and replace it with a placeholder.`,
        )}
        onConfirm={onToggleQuoteNoteAttachment}
        confirmButtonCta={_(msg`Yes, detach`)}
      />

      <Prompt.Basic
        control={hideReplyConfirmControl}
        title={_(msg`Hide this reply?`)}
        description={_(
          msg`This reply will be sorted into a hidden section at the bottom of your thread and will mute notifications for subsequent replies - both for yourself and others.`,
        )}
        onConfirm={onToggleReplyVisibility}
        confirmButtonCta={_(msg`Yes, hide`)}
      />

      <Prompt.Basic
        control={blockPromptControl}
        title={_(msg`Block Account?`)}
        description={_(
          msg`Blocked accounts cannot reply in your threads, mention you, or otherwise interact with you.`,
        )}
        onConfirm={onBlockAuthor}
        confirmButtonCta={_(msg`Block`)}
        confirmButtonColor="negative"
      />
    </>
  )
}
NoteMenuItems = memo(NoteMenuItems)
export {NoteMenuItems}
