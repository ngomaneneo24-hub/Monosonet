import React, {
  useCallback,
  useEffect,
  useImperativeUsername,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
// @ts-expect-error no type definition
import ProgressCircle from 'react-native-progress/Circle'
import Animated, {
  type AnimatedRef,
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  LayoutAnimationConfig,
  LinearTransition,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {type ImagePickerAsset} from 'expo-image-picker'
import {
  SonetFeedDefs,
  type SonetFeedGetNoteThread,
  SonetUnspeccedDefs,
  type SonetAppAgent,
  type RichText,
} from '@sonet/api'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {msg, plural, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import * as apilib from '#/lib/api/index'
import {EmbeddingDisabledError} from '#/lib/api/resolve'
import {retry} from '#/lib/async/retry'
import {until} from '#/lib/async/until'
import {
  MAX_GRAPHEME_LENGTH,
  SUPPORTED_MIME_TYPES,
  type SupportedMimeTypes,
} from '#/lib/constants'
import {useAnimatedScrollHandler} from '#/lib/hooks/useAnimatedScrollHandler_FIXED'
import {useAppState} from '#/lib/hooks/useAppState'
import {useIsKeyboardVisible} from '#/lib/hooks/useIsKeyboardVisible'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {usePalette} from '#/lib/hooks/usePalette'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {mimeToExt} from '#/lib/media/video/util'
import {logEvent} from '#/lib/statsig/statsig'
import {cleanError} from '#/lib/strings/errors'
import {colors} from '#/lib/styles'
import {logger} from '#/logger'
import {isAndroid, isIOS, isNative, isWeb} from '#/platform/detection'
import {useDialogStateControlContext} from '#/state/dialogs'
import {emitNoteCreated} from '#/state/events'
import {type ComposerImage, pasteImage} from '#/state/gallery'
import {useModalControls} from '#/state/modals'
import {useRequireAltTextEnabled} from '#/state/preferences'
import {
  toNoteLanguages,
  useLanguagePrefs,
  useLanguagePrefsApi,
} from '#/state/preferences/languages'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useProfileQuery} from '#/state/queries/profile'
import {type Gif} from '#/state/queries/tenor'
import {useAgent, useSession} from '#/state/session'
import {useComposerControls} from '#/state/shell/composer'
import {type ComposerOpts, type OnNoteSuccessData} from '#/state/shell/composer'
import {CharProgress} from '#/view/com/composer/char-progress/CharProgress'
import {ComposerReplyTo} from '#/view/com/composer/ComposerReplyTo'
import {
  ExternalEmbedGif,
  ExternalEmbedLink,
} from '#/view/com/composer/ExternalEmbed'
import {ExternalEmbedRemoveBtn} from '#/view/com/composer/ExternalEmbedRemoveBtn'
import {GifAltTextDialog} from '#/view/com/composer/GifAltText'
import {LabelsBtn} from '#/view/com/composer/labels/LabelsBtn'
import {Gallery} from '#/view/com/composer/photos/Gallery'
import {OpenCameraBtn} from '#/view/com/composer/photos/OpenCameraBtn'
import {SelectGifBtn} from '#/view/com/composer/photos/SelectGifBtn'
import {EnhancedSelectPhotoBtn} from '#/view/com/composer/photos/EnhancedSelectPhotoBtn'
import {SelectLangBtn} from '#/view/com/composer/select-language/SelectLangBtn'
import {SuggestedLanguage} from '#/view/com/composer/select-language/SuggestedLanguage'
// TODO: Prevent naming components that coincide with RN primitives
// due to linting false positives
import {
  TextInput,
  type TextInputRef,
} from '#/view/com/composer/text-input/TextInput'
import {ThreadgateBtn} from '#/view/com/composer/threadgate/ThreadgateBtn'
import {Ghost_Stroke2_Corner0_Rounded as Ghost} from '#/components/icons/Ghost'
import {MediaManagerDialog} from '#/view/com/composer/photos/MediaManagerDialog'
import {SubtitleDialogBtn} from '#/view/com/composer/videos/SubtitleDialog'
import {VideoPreview} from '#/view/com/composer/videos/VideoPreview'
import {VideoTranscodeProgress} from '#/view/com/composer/videos/VideoTranscodeProgress'
import {Text} from '#/view/com/util/text/Text'
import * as Toast from '#/view/com/util/Toast'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, native, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import {EmojiArc_Stroke2_Corner0_Rounded as EmojiSmile} from '#/components/icons/Emoji'
import {TimesLarge_Stroke2_Corner0_Rounded as X} from '#/components/icons/Times'
import {LazyQuoteEmbed} from '#/components/Note/Embed/LazyQuoteEmbed'
import * as Prompt from '#/components/Prompt'
import {Text as NewText} from '#/components/Typography'
import {DraftsButton} from '#/components/DraftsButton'
import {DraftsDialog} from '#/components/DraftsDialog'
import {useCreateDraftMutation, useUserDraftsQuery, useAutoSaveDraftMutation} from '#/state/queries/drafts'
import {useCreateGhostReply} from '#/state/queries/ghost-replies'
import {SaveDraftDialog} from '#/components/SaveDraftDialog'
import {BottomSheetPortalProvider} from '../../../../modules/bottom-sheet'
import {
  type ComposerAction,
  composerReducer,
  createComposerState,
  type EmbedDraft,
  MAX_IMAGES,
  type NoteAction,
  type NoteDraft,
  type ThreadDraft,
} from './state/composer'
import {
  NO_VIDEO,
  type NoVideoState,
  processVideo,
  type VideoState,
} from './state/video'
import {getVideoMetadata} from './videos/pickVideo'
import {clearThumbnailCache} from './videos/VideoTranscodeBackdrop'

type CancelRef = {
  onPressCancel: () => void
}

type Props = ComposerOpts
export const ComposeNote = ({
  replyTo,
  onNote,
  onNoteSuccess,
  quote: initQuote,
  mention: initMention,
  openEmojiPicker,
  text: initText,
  imageUris: initImageUris,
  videoUri: initVideoUri,
  cancelRef,
}: Props & {
  cancelRef?: React.RefObject<CancelRef>
}) => {
  const {currentAccount} = useSession()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const currentDid = currentAccount!.userId
  const {closeComposer} = useComposerControls()
  const {_} = useLingui()
  const requireAltTextEnabled = useRequireAltTextEnabled()
  const langPrefs = useLanguagePrefs()
  const setLangPrefs = useLanguagePrefsApi()
  const textInput = useRef<TextInputRef>(null)
  const discardPromptControl = Prompt.usePromptControl()
  const {closeAllDialogs} = useDialogStateControlContext()
  const {closeAllModals} = useModalControls()
  const {data: preferences} = usePreferencesQuery()

  const [isKeyboardVisible] = useIsKeyboardVisible({iosUseWillEvents: true})
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishingStage, setPublishingStage] = useState('')
  const [error, setError] = useState('')
  const [showDraftsDialog, setShowDraftsDialog] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const saveDraftControl = Prompt.usePromptControl()
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [ghostAvatar, setGhostAvatar] = useState<string>('')
  const [ghostId, setGhostId] = useState<string>('')
  
  // Ghost mode management
  const GHOST_AVATARS = [
    '/assets/ghosts/ghost-1.jpg',
    '/assets/ghosts/ghost-2.jpg',
    '/assets/ghosts/ghost-3.jpg',
    '/assets/ghosts/ghost-4.jpg',
    '/assets/ghosts/ghost-5.jpg',
    '/assets/ghosts/ghost-6.jpg',
    '/assets/ghosts/ghost-7.jpg',
    '/assets/ghosts/ghost-8.jpg',
    '/assets/ghosts/ghost-9.jpg',
    '/assets/ghosts/ghost-10.jpg',
    '/assets/ghosts/ghost-11.jpg',
    '/assets/ghosts/ghost-12.jpg',
  ]

  const generateGhostId = useCallback(() => {
    const chars = '0123456789ABCDEF'
    return 'Ghost #' + Array.from({length: 4}, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  }, [])

  const initializeGhostMode = useCallback(() => {
    if (!isGhostMode) {
      // Select random ghost avatar
      const randomIndex = Math.floor(Math.random() * GHOST_AVATARS.length)
      const selectedAvatar = GHOST_AVATARS[randomIndex]
      setGhostAvatar(selectedAvatar)
      setGhostId(generateGhostId())
      setIsGhostMode(true)
    } else {
      // Deactivate ghost mode
      setIsGhostMode(false)
      setGhostAvatar('')
      setGhostId('')
    }
  }, [isGhostMode, generateGhostId])

  // Initialize ghost mode for new threads
  useEffect(() => {
    if (replyTo?.uri && !ghostAvatar) {
      // New thread, initialize ghost mode if it was active before
      // This ensures same ghost avatar within a thread
      const randomIndex = Math.floor(Math.random() * GHOST_AVATARS.length)
      setGhostAvatar(GHOST_AVATARS[randomIndex])
      setGhostId(generateGhostId())
    }
  }, [replyTo?.uri, ghostAvatar, generateGhostId])
  
  // Draft hooks
  const createDraft = useCreateDraftMutation()
  const autoSaveDraft = useAutoSaveDraftMutation()
  const {data: userDrafts} = useUserDraftsQuery(20, undefined, false)
  
  // Ghost reply hooks
  const createGhostReply = useCreateGhostReply()
  
  // Auto-save draft when content changes
  useEffect(() => {
    const content = getComposerContent()
    if (!content || !content.content.trim()) return
    
    const timeoutId = setTimeout(async () => {
      try {
        await autoSaveDraft.mutateAsync(content)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 2000) // Auto-save after 2 seconds of inactivity
    
    return () => clearTimeout(timeoutId)
  }, [thread.notes, replyTo, initMention, autoSaveDraft, getComposerContent])

  const [composerState, composerDispatch] = useReducer(
    composerReducer,
    {
      initImageUris,
      initQuoteUri: initQuote?.uri,
      initText,
      initMention,
      initInteractionSettings: preferences?.noteInteractionSettings,
    },
    createComposerState,
  )

  const thread = composerState.thread
  const activeNote = thread.notes[composerState.activeNoteIndex]
  const nextNote: NoteDraft | undefined =
    thread.notes[composerState.activeNoteIndex + 1]
  const dispatch = useCallback(
    (noteAction: NoteAction) => {
      composerDispatch({
        type: 'update_note',
        noteId: activeNote.id,
        noteAction,
      })
    },
    [activeNote.id],
  )

  const selectVideo = React.useCallback(
    (noteId: string, asset: ImagePickerAsset) => {
      const abortController = new AbortController()
      composerDispatch({
        type: 'update_note',
        noteId: noteId,
        noteAction: {
          type: 'embed_add_video',
          asset,
          abortController,
        },
      })
      processVideo(
        asset,
        videoAction => {
          composerDispatch({
            type: 'update_note',
            noteId: noteId,
            noteAction: {
              type: 'embed_update_video',
              videoAction,
            },
          })
        },
        agent,
        currentDid,
        abortController.signal,
        _,
      )
    },
    [_, agent, currentDid, composerDispatch],
  )

  const onInitVideo = useNonReactiveCallback(() => {
    if (initVideoUri) {
      selectVideo(activeNote.id, initVideoUri)
    }
  })

  useEffect(() => {
    onInitVideo()
  }, [onInitVideo])

  const clearVideo = React.useCallback(
    (noteId: string) => {
      composerDispatch({
        type: 'update_note',
        noteId: noteId,
        noteAction: {
          type: 'embed_remove_video',
        },
      })
    },
    [composerDispatch],
  )

  const [publishOnUpload, setPublishOnUpload] = useState(false)

  const onClose = useCallback(() => {
    closeComposer()
    clearThumbnailCache(queryClient)
  }, [closeComposer, queryClient])

  const usernameDraftsPress = useCallback(() => {
    setShowDraftsDialog(true)
  }, [])

  // Helper function to convert composer state to draft format
  const getComposerContent = useCallback(() => {
    const firstNote = thread.notes[0]
    if (!firstNote) return null
    
    const images = firstNote.embed.media?.type === 'images' 
      ? firstNote.embed.media.images.map(img => ({
          uri: img.uri,
          width: img.width,
          height: img.height,
          alt_text: img.alt || ''
        }))
      : []
    
    const video = firstNote.embed.media?.type === 'gif' 
      ? {
          uri: firstNote.embed.media.uri,
          width: firstNote.embed.media.width,
          height: firstNote.embed.media.height
        }
      : undefined
    
    return {
      content: firstNote.richtext.text,
      reply_to_uri: replyTo?.uri,
      quote_uri: firstNote.embed.quote?.uri,
      mention_username: initMention,
      images,
      video,
      labels: [],
      threadgate: firstNote.interactionSettings,
      interaction_settings: firstNote.interactionSettings
    }
  }, [thread, replyTo, initMention])

  const usernameDraftSelect = useCallback((draft: any) => {
    // Load draft content into composer
    if (!draft) return
    
    // Clear current composer state
    composerDispatch({
      type: 'reset_thread',
      thread: {
        notes: [{
          id: 'temp',
          richtext: {text: draft.content || '', facets: []},
          embed: {
            media: draft.images?.length > 0 ? {
              type: 'images',
              images: draft.images.map((img: any) => ({
                uri: img.uri,
                width: img.width,
                height: img.height,
                alt: img.alt_text || ''
              }))
            } : draft.video ? {
              type: 'gif',
              uri: draft.video.uri,
              width: draft.video.width,
              height: draft.video.height,
              alt: ''
            } : undefined,
            quote: draft.quote_uri ? {uri: draft.quote_uri} : undefined,
            link: undefined
          },
          interactionSettings: draft.interaction_settings || draft.threadgate
        }]
      }
    })
    
    setShowDraftsDialog(false)
  }, [composerDispatch])

  const usernameSaveDraft = useCallback(() => {
    closeComposer()
  }, [closeComposer])

  const usernameDiscardDraft = useCallback(() => {
    // Discard without saving
    closeComposer()
  }, [closeComposer])

  const usernameCancelSave = useCallback(() => {
    saveDraftControl.close()
  }, [saveDraftControl])

  const insets = useSafeAreaInsets()
  const viewStyles = useMemo(
    () => ({
      paddingTop: isAndroid ? insets.top : 0,
      paddingBottom:
        // iOS - when keyboard is closed, keep the bottom bar in the safe area
        (isIOS && !isKeyboardVisible) ||
        // Android - Android >=35 KeyboardAvoidingView adds double padding when
        // keyboard is closed, so we subtract that in the offset and add it back
        // here when the keyboard is open
        (isAndroid && isKeyboardVisible)
          ? insets.bottom
          : 0,
    }),
    [insets, isKeyboardVisible],
  )

  const onPressCancel = useCallback(() => {
    if (
      thread.notes.some(
        note =>
          note.shortenedGraphemeLength > 0 ||
          note.embed.media ||
          note.embed.link,
      )
    ) {
      closeAllDialogs()
      Keyboard.dismiss()
      saveDraftControl.open()
    } else {
      onClose()
    }
  }, [thread, closeAllDialogs, saveDraftControl, onClose])

  useImperativeUsername(cancelRef, () => ({onPressCancel}))

  // On Android, pressing Back should ask confirmation.
  useEffect(() => {
    if (!isAndroid) {
      return
    }
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (closeAllDialogs() || closeAllModals()) {
          return true
        }
        onPressCancel()
        return true
      },
    )
    return () => {
      backHandler.remove()
    }
  }, [onPressCancel, closeAllDialogs, closeAllModals])

  const missingAltError = useMemo(() => {
    if (!requireAltTextEnabled) {
      return
    }
    for (let i = 0; i < thread.notes.length; i++) {
      const media = thread.notes[i].embed.media
      if (media) {
        if (media.type === 'images' && media.images.some(img => !img.alt)) {
          return _(msg`One or more images is missing alt text.`)
        }
        if (media.type === 'gif' && !media.alt) {
          return _(msg`One or more GIFs is missing alt text.`)
        }
        if (
          media.type === 'video' &&
          media.video.status !== 'error' &&
          !media.video.altText
        ) {
          return _(msg`One or more videos is missing alt text.`)
        }
      }
    }
  }, [thread, requireAltTextEnabled, _])

  const canNote =
    !missingAltError &&
    thread.notes.every(
      note =>
        note.shortenedGraphemeLength <= MAX_GRAPHEME_LENGTH &&
        !isEmptyNote(note) &&
        !(
          note.embed.media?.type === 'video' &&
          note.embed.media.video.status === 'error'
        ),
    )

  const onPressPublish = React.useCallback(async () => {
    if (isPublishing) {
      return
    }

    if (!canNote) {
      return
    }

    if (
      thread.notes.some(
        note =>
          note.embed.media?.type === 'video' &&
          note.embed.media.video.asset &&
          note.embed.media.video.status !== 'done',
      )
    ) {
      setPublishOnUpload(true)
      return
    }

    setError('')
    setIsPublishing(true)

    let noteUri: string | undefined
    let noteSuccessData: OnNoteSuccessData
    try {
      logger.info(`composer: noteing...`)
      
      // Handle ghost mode publishing
      if (isGhostMode) {
        logger.info(`composer: publishing in ghost mode as ${ghostId}`)
        
        try {
          // Create ghost reply instead of regular note
          const ghostReplyData = {
            content: activeNote.richtext.text,
            ghostAvatar,
            ghostId,
            threadId: replyTo?.uri || 'main',
          }
          
          const ghostReplyResult = await createGhostReply.mutateAsync(ghostReplyData)
          
          if (ghostReplyResult.success) {
            logger.info(`composer: ghost reply created successfully`)
            
            // For ghost replies, we don't need to wait for app view
            // since they're handled separately
            noteUri = `ghost-${ghostReplyResult.ghostReply.id}`
            noteSuccessData = {
              replyToUri: replyTo?.uri,
              notes: [], // Ghost replies don't have regular note structure
            }
            
            // Exit ghost mode after successful publish
            setIsGhostMode(false)
            setGhostAvatar('')
            setGhostId('')
            
            // Close composer and show success
            closeComposer()
            return
          }
        } catch (ghostError) {
          logger.error('Failed to create ghost reply:', ghostError)
          setError(_(msg`Failed to create ghost reply. Please try again.`))
          setIsPublishing(false)
          return
        }
      }
      
      // Regular note publishing
      noteUri = (
        await apilib.note(agent, queryClient, {
          thread,
          replyTo: replyTo?.uri,
          onStateChange: setPublishingStage,
          langs: toNoteLanguages(langPrefs.noteLanguage),
        })
      ).uris[0]

      /*
       * Wait for app view to have received the note(s). If this fails, it's
       * ok, because the note _was_ actually published above.
       */
      try {
        if (noteUri) {
          logger.info(`composer: waiting for app view`)

          const notes = await retry(
            5,
            _e => true,
            async () => {
              const res = await agent.app.sonet.unspecced.getNoteThreadV2({
                anchor: noteUri!,
                above: false,
                below: thread.notes.length - 1,
                branchingFactor: 1,
              })
              if (res.data.thread.length !== thread.notes.length) {
                throw new Error(`composer: app view is not ready`)
              }
              if (
                !res.data.thread.every(p =>
                  SonetUnspeccedDefs.isThreadItemNote(p.value),
                )
              ) {
                throw new Error(`composer: app view returned non-note items`)
              }
              return res.data.thread
            },
            1e3,
          )
          noteSuccessData = {
            replyToUri: replyTo?.uri,
            notes,
          }
        }
      } catch (waitErr: any) {
        logger.info(`composer: waiting for app view failed`, {
          safeMessage: waitErr,
        })
      }
    } catch (e: any) {
      logger.error(e, {
        message: `Composer: create note failed`,
        hasImages: thread.notes.some(p => p.embed.media?.type === 'images'),
      })

      let err = cleanError(e.message)
      if (err.includes('not locate record')) {
        err = _(
          msg`We're sorry! The note you are replying to has been deleted.`,
        )
      } else if (e instanceof EmbeddingDisabledError) {
        err = _(msg`This note's author has disabled quote notes.`)
      }
      setError(err)
      setIsPublishing(false)
      return
    } finally {
      if (noteUri) {
        let index = 0
        for (let note of thread.notes) {
          logEvent('note:create', {
            imageCount:
              note.embed.media?.type === 'images'
                ? note.embed.media.images.length
                : 0,
            isReply: index > 0 || !!replyTo,
            isPartOfThread: thread.notes.length > 1,
            hasLink: !!note.embed.link,
            hasQuote: !!note.embed.quote,
            langs: langPrefs.noteLanguage,
            logContext: 'Composer',
          })
          index++
        }
      }
      if (thread.notes.length > 1) {
        logEvent('thread:create', {
          noteCount: thread.notes.length,
          isReply: !!replyTo,
        })
      }
    }
    if (noteUri && !replyTo) {
      emitNoteCreated()
    }
    setLangPrefs.saveNoteLanguageToHistory()
    if (initQuote) {
      // We want to wait for the quote count to update before we call `onNote`, which will refetch data
      whenAppViewReady(agent, initQuote.uri, res => {
        const quotedThread = res.data.thread
        if (
          SonetFeedDefs.isThreadViewNote(quotedThread) &&
          quotedThread.note.quoteCount !== initQuote.quoteCount
        ) {
          onNote?.(noteUri)
          onNoteSuccess?.(noteSuccessData)
          return true
        }
        return false
      })
    } else {
      onNote?.(noteUri)
      onNoteSuccess?.(noteSuccessData)
    }
    onClose()
    Toast.show(
      thread.notes.length > 1
        ? _(msg`Your notes have been published`)
        : replyTo
          ? _(msg`Your reply has been published`)
          : _(msg`Your note has been published`),
    )
  }, [
    _,
    agent,
    thread,
    canNote,
    isPublishing,
    langPrefs.noteLanguage,
    onClose,
    onNote,
    onNoteSuccess,
    initQuote,
    replyTo,
    setLangPrefs,
    queryClient,
  ])

  // Preserves the referential identity passed to each note item.
  // Avoids re-rendering all notes on each keystroke.
  const onComposerNotePublish = useNonReactiveCallback(() => {
    onPressPublish()
  })

  React.useEffect(() => {
    if (publishOnUpload) {
      let erroredVideos = 0
      let uploadingVideos = 0
      for (let note of thread.notes) {
        if (note.embed.media?.type === 'video') {
          const video = note.embed.media.video
          if (video.status === 'error') {
            erroredVideos++
          } else if (video.status !== 'done') {
            uploadingVideos++
          }
        }
      }
      if (erroredVideos > 0) {
        setPublishOnUpload(false)
      } else if (uploadingVideos === 0) {
        setPublishOnUpload(false)
        onPressPublish()
      }
    }
  }, [thread.notes, onPressPublish, publishOnUpload])

  // TODO: It might make more sense to display this error per-note.
  // Right now we're just displaying the first one.
  let erroredVideoNoteId: string | undefined
  let erroredVideo: VideoState | NoVideoState = NO_VIDEO
  for (let i = 0; i < thread.notes.length; i++) {
    const note = thread.notes[i]
    if (
      note.embed.media?.type === 'video' &&
      note.embed.media.video.status === 'error'
    ) {
      erroredVideoNoteId = note.id
      erroredVideo = note.embed.media.video
      break
    }
  }

  const onEmojiButtonPress = useCallback(() => {
    const rect = textInput.current?.getCursorPosition()
    if (rect) {
      openEmojiPicker?.({
        ...rect,
        nextFocusRef:
          textInput as unknown as React.MutableRefObject<HTMLElement>,
      })
    }
  }, [openEmojiPicker])

  const scrollViewRef = useAnimatedRef<Animated.ScrollView>()
  useEffect(() => {
    if (composerState.mutableNeedsFocusActive) {
      composerState.mutableNeedsFocusActive = false
      // On Android, this risks getting the cursor stuck behind the keyboard.
      // Not worth it.
      if (!isAndroid) {
        textInput.current?.focus()
      }
    }
  }, [composerState])

  const isLastThreadedNote = thread.notes.length > 1 && nextNote === undefined
  const {
    scrollHandler,
    onScrollViewContentSizeChange,
    onScrollViewLayout,
    topBarAnimatedStyle,
    bottomBarAnimatedStyle,
  } = useScrollTracker({
    scrollViewRef,
    stickyBottom: isLastThreadedNote,
  })

  const keyboardVerticalOffset = useKeyboardVerticalOffset()

  const footer = (
    <>
      <SuggestedLanguage text={activeNote.richtext.text} />
      <ComposerPills
        isReply={!!replyTo}
        note={activeNote}
        thread={composerState.thread}
        dispatch={composerDispatch}
        bottomBarAnimatedStyle={bottomBarAnimatedStyle}
      />
      <ComposerFooter
        note={activeNote}
        dispatch={dispatch}
        showAddButton={
          !isEmptyNote(activeNote) && (!nextNote || !isEmptyNote(nextNote))
        }
        onError={setError}
        onEmojiButtonPress={onEmojiButtonPress}
        onSelectVideo={selectVideo}
        onAddNote={() => {
          composerDispatch({
            type: 'add_note',
          })
        }}
        isGhostMode={isGhostMode}
        onToggleGhostMode={initializeGhostMode}
      />
    </>
  )

  const isWebFooterSticky = !isNative && thread.notes.length > 1
  return (
    <BottomSheetPortalProvider>
      <KeyboardAvoidingView
        testID="composeNoteView"
        behavior={isIOS ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={a.flex_1}>
        <View
          style={[a.flex_1, viewStyles]}
          aria-modal
          accessibilityViewIsModal>
          <ComposerTopBar
            canNote={canNote}
            isReply={!!replyTo}
            isPublishQueued={publishOnUpload}
            isPublishing={isPublishing}
            isThread={thread.notes.length > 1}
            publishingStage={publishingStage}
            topBarAnimatedStyle={topBarAnimatedStyle}
            onCancel={onPressCancel}
            onPublish={onPressPublish}
            onDraftsPress={usernameDraftsPress}
            hasContent={thread.notes.some(note => 
              note.shortenedGraphemeLength > 0 || 
              note.embed.media || 
              note.embed.link
            )}>
            {missingAltError && <AltTextReminder error={missingAltError} />}
            <ErrorBanner
              error={error}
              videoState={erroredVideo}
              clearError={() => setError('')}
              clearVideo={
                erroredVideoNoteId
                  ? () => clearVideo(erroredVideoNoteId)
                  : () => {}
              }
            />
          </ComposerTopBar>

          <Animated.ScrollView
            ref={scrollViewRef}
            layout={native(LinearTransition)}
            onScroll={scrollHandler}
            contentContainerStyle={a.flex_grow}
            style={a.flex_1}
            keyboardShouldPersistTaps="always"
            onContentSizeChange={onScrollViewContentSizeChange}
            onLayout={onScrollViewLayout}>
            {replyTo ? <ComposerReplyTo replyTo={replyTo} /> : undefined}
            {thread.notes.map((note, index) => (
              <React.Fragment key={note.id}>
                <ComposerNote
                  note={note}
                  dispatch={composerDispatch}
                  textInput={note.id === activeNote.id ? textInput : null}
                  isFirstNote={index === 0}
                  isLastNote={index === thread.notes.length - 1}
                  isPartOfThread={thread.notes.length > 1}
                  isReply={index > 0 || !!replyTo}
                  isActive={note.id === activeNote.id}
                  canRemoveNote={thread.notes.length > 1}
                  canRemoveQuote={index > 0 || !initQuote}
                  onSelectVideo={selectVideo}
                  onClearVideo={clearVideo}
                  onPublish={onComposerNotePublish}
                  onError={setError}
                />
                {isWebFooterSticky && note.id === activeNote.id && (
                  <View style={styles.stickyFooterWeb}>{footer}</View>
                )}
              </React.Fragment>
            ))}
          </Animated.ScrollView>
          {!isWebFooterSticky && footer}
        </View>

        <SaveDraftDialog
          control={saveDraftControl}
          onSave={usernameSaveDraft}
          onDiscard={usernameDiscardDraft}
          onCancel={usernameCancelSave}
          content={getComposerContent()}
        />
        
        {showDraftsDialog && (
          <DraftsDialog
            onSelectDraft={usernameDraftSelect}
            onClose={() => setShowDraftsDialog(false)}
          />
        )}
        
        {/* Media Manager Dialog */}
        <MediaManagerDialog
          media={images}
          onMediaChange={onImageAdd}
          onClose={() => setShowMediaManager(false)}
          visible={showMediaManager}
        />
      </KeyboardAvoidingView>
    </BottomSheetPortalProvider>
  )
}

let ComposerNote = React.memo(function ComposerNote({
  note,
  dispatch,
  textInput,
  isActive,
  isReply,
  isFirstNote,
  isLastNote,
  isPartOfThread,
  canRemoveNote,
  canRemoveQuote,
  onClearVideo,
  onSelectVideo,
  onError,
  onPublish,
}: {
  note: NoteDraft
  dispatch: (action: ComposerAction) => void
  textInput: React.Ref<TextInputRef>
  isActive: boolean
  isReply: boolean
  isFirstNote: boolean
  isLastNote: boolean
  isPartOfThread: boolean
  canRemoveNote: boolean
  canRemoveQuote: boolean
  onClearVideo: (noteId: string) => void
  onSelectVideo: (noteId: string, asset: ImagePickerAsset) => void
  onError: (error: string) => void
  onPublish: (richtext: RichText) => void
}) {
  const {currentAccount} = useSession()
  const currentDid = currentAccount!.userId
  const {_} = useLingui()
  const {data: currentProfile} = useProfileQuery({userId: currentDid})
  const richtext = note.richtext
  const isTextOnly = !note.embed.link && !note.embed.quote && !note.embed.media
  const forceMinHeight = isWeb && isTextOnly && isActive
  const selectTextInputPlaceholder = isReply
    ? isFirstNote
      ? _(msg`Write your reply`)
      : _(msg`Add another note`)
    : _(msg`What's up?`)
  const discardPromptControl = Prompt.usePromptControl()

  const dispatchNote = useCallback(
    (action: NoteAction) => {
      dispatch({
        type: 'update_note',
        noteId: note.id,
        noteAction: action,
      })
    },
    [dispatch, note.id],
  )

  const onImageAdd = useCallback(
    (next: ComposerImage[]) => {
      dispatchNote({
        type: 'embed_add_images',
        images: next,
      })
    },
    [dispatchNote],
  )

  const onNewLink = useCallback(
    (uri: string) => {
      dispatchNote({type: 'embed_add_uri', uri})
    },
    [dispatchNote],
  )

  const onPhotoPasted = useCallback(
    async (uri: string) => {
      if (uri.startsWith('data:video/') || uri.startsWith('data:image/gif')) {
        if (isNative) return // web only
        const [mimeType] = uri.slice('data:'.length).split(';')
        if (!SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeTypes)) {
          Toast.show(_(msg`Unsupported video type`), 'xmark')
          return
        }
        const name = `pasted.${mimeToExt(mimeType)}`
        const file = await fetch(uri)
          .then(res => res.blob())
          .then(blob => new File([blob], name, {type: mimeType}))
        onSelectVideo(note.id, await getVideoMetadata(file))
      } else {
        const res = await pasteImage(uri)
        onImageAdd([res])
      }
    },
    [note.id, onSelectVideo, onImageAdd, _],
  )

  useHideKeyboardOnBackground()

  return (
    <View
      style={[
        a.mx_lg,
        a.mb_sm,
        !isActive && isLastNote && a.mb_lg,
        !isActive && styles.inactiveNote,
        isTextOnly && isNative && a.flex_grow,
      ]}>
      <View style={[a.flex_row, isNative && a.flex_1]}>
        <UserAvatar
          avatar={currentProfile?.avatar}
          size={42}
          type={currentProfile?.associated?.labeler ? 'labeler' : 'user'}
          style={[a.mt_xs]}
        />
        {/* Ghost Mode Indicator */}
        {isGhostMode && (
          <View style={[a.flex_row, a.align_center, a.gap_sm, a.p_sm, a.mb_xs, {backgroundColor: t.palette.primary_50, borderRadius: 8}]}>
            <Ghost size="sm" style={{color: t.palette.primary_500}} />
            <Text style={[a.text_sm, a.font_medium, {color: t.palette.primary_700}]}>
              <Trans>👻 Ghost Mode Active - You'll reply as {ghostId}</Trans>
            </Text>
            <Button
              onPress={() => setIsGhostMode(false)}
              style={[a.p_xs]}
              label={_(msg`Exit Ghost Mode`)}
              variant="ghost"
              shape="round"
              color="primary"
              size="small">
              <Trans>Exit</Trans>
            </Button>
          </View>
        )}
        
        <TextInput
          ref={textInput}
          style={[a.pt_xs]}
          richtext={richtext}
          placeholder={selectTextInputPlaceholder}
          autoFocus
          webForceMinHeight={forceMinHeight}
          // To avoid overlap with the close button:
          hasRightPadding={isPartOfThread}
          isActive={isActive}
          setRichText={rt => {
            dispatchNote({type: 'update_richtext', richtext: rt})
          }}
          onFocus={() => {
            dispatch({
              type: 'focus_note',
              noteId: note.id,
            })
          }}
          onPhotoPasted={onPhotoPasted}
          onNewLink={onNewLink}
          onError={onError}
          onPressPublish={onPublish}
          accessible={true}
          accessibilityLabel={_(msg`Write note`)}
          accessibilityHint={_(
            msg`Compose notes up to ${plural(MAX_GRAPHEME_LENGTH || 0, {
              other: '# characters',
            })} in length`,
          )}
        />
      </View>

      {canRemoveNote && isActive && (
        <>
          <Button
            label={_(msg`Delete note`)}
            size="small"
            color="secondary"
            variant="ghost"
            shape="round"
            style={[a.absolute, {top: 0, right: 0}]}
            onPress={() => {
              if (
                note.shortenedGraphemeLength > 0 ||
                note.embed.media ||
                note.embed.link ||
                note.embed.quote
              ) {
                discardPromptControl.open()
              } else {
                dispatch({
                  type: 'remove_note',
                  noteId: note.id,
                })
              }
            }}>
            <ButtonIcon icon={X} />
          </Button>
          <Prompt.Basic
            control={discardPromptControl}
            title={_(msg`Discard note?`)}
            description={_(msg`Are you sure you'd like to discard this note?`)}
            onConfirm={() => {
              dispatch({
                type: 'remove_note',
                noteId: note.id,
              })
            }}
            confirmButtonCta={_(msg`Discard`)}
            confirmButtonColor="negative"
          />
        </>
      )}

      <ComposerEmbeds
        canRemoveQuote={canRemoveQuote}
        embed={note.embed}
        dispatch={dispatchNote}
        clearVideo={() => onClearVideo(note.id)}
        isActiveNote={isActive}
      />
    </View>
  )
})

function ComposerTopBar({
  canNote,
  isReply,
  isPublishQueued,
  isPublishing,
  isThread,
  publishingStage,
  onCancel,
  onPublish,
  onDraftsPress,
  hasContent,
  topBarAnimatedStyle,
  children,
}: {
  isPublishing: boolean
  publishingStage: string
  canNote: boolean
  isReply: boolean
  isPublishQueued: boolean
  isThread: boolean
  onCancel: () => void
  onPublish: () => void
  onDraftsPress: () => void
  hasContent: boolean
  topBarAnimatedStyle: StyleProp<ViewStyle>
  children?: React.ReactNode
}) {
  const pal = usePalette('default')
  const {_} = useLingui()
  return (
    <Animated.View
      style={topBarAnimatedStyle}
      layout={native(LinearTransition)}>
      <View style={styles.topbarInner}>
        <Button
          label={_(msg`Cancel`)}
          variant="ghost"
          color="primary"
          shape="default"
          size="small"
          style={[a.rounded_full, a.py_sm, {paddingLeft: 7, paddingRight: 7}]}
          onPress={onCancel}
          accessibilityHint={_(
            msg`Closes note composer and discards note draft`,
          )}>
          <ButtonText style={[a.text_md]}>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
        <View style={a.flex_1} />
        <DraftsButton onPress={onDraftsPress} hasContent={hasContent} />
        <View style={a.flex_1} />
        {isPublishing ? (
          <>
            <Text style={pal.textLight}>{publishingStage}</Text>
            <View style={styles.noteBtn}>
              <ActivityIndicator />
            </View>
          </>
        ) : (
          <Button
            testID="composerPublishBtn"
            label={
              isReply
                ? isThread
                  ? _(
                      msg({
                        message: 'Publish replies',
                        comment:
                          'Accessibility label for button to publish multiple replies in a thread',
                      }),
                    )
                  : _(
                      msg({
                        message: 'Publish reply',
                        comment:
                          'Accessibility label for button to publish a single reply',
                      }),
                    )
                : isThread
                  ? _(
                      msg({
                        message: 'Publish notes',
                        comment:
                          'Accessibility label for button to publish multiple notes in a thread',
                      }),
                    )
                  : _(
                      msg({
                        message: 'Publish note',
                        comment:
                          'Accessibility label for button to publish a single note',
                      }),
                    )
            }
            variant="solid"
            color="primary"
            shape="default"
            size="small"
            style={[a.rounded_full, a.py_sm]}
            onPress={onPublish}
            disabled={!canNote || isPublishQueued}>
            <ButtonText style={[a.text_md]}>
              {isReply ? (
                <Trans context="action">Reply</Trans>
              ) : isThread ? (
                <Trans context="action">Note All</Trans>
              ) : (
                <Trans context="action">Note</Trans>
              )}
            </ButtonText>
          </Button>
        )}
      </View>
      {children}
    </Animated.View>
  )
}

function AltTextReminder({error}: {error: string}) {
  const pal = usePalette('default')
  return (
    <View style={[styles.reminderLine, pal.viewLight]}>
      <View style={styles.errorIcon}>
        <FontAwesomeIcon
          icon="exclamation"
          style={{color: colors.red4}}
          size={10}
        />
      </View>
      <Text style={[pal.text, a.flex_1]}>{error}</Text>
    </View>
  )
}

function ComposerEmbeds({
  embed,
  dispatch,
  clearVideo,
  canRemoveQuote,
  isActiveNote,
}: {
  embed: EmbedDraft
  dispatch: (action: NoteAction) => void
  clearVideo: () => void
  canRemoveQuote: boolean
  isActiveNote: boolean
}) {
  const video = embed.media?.type === 'video' ? embed.media.video : null
  return (
    <>
      {embed.media?.type === 'images' && (
        <Gallery images={embed.media.images} dispatch={dispatch} />
      )}

      {embed.media?.type === 'gif' && (
        <View style={[a.relative, a.mt_lg]} key={embed.media.gif.url}>
          <ExternalEmbedGif
            gif={embed.media.gif}
            onRemove={() => dispatch({type: 'embed_remove_gif'})}
          />
          <GifAltTextDialog
            gif={embed.media.gif}
            altText={embed.media.alt ?? ''}
            onSubmit={(altText: string) => {
              dispatch({type: 'embed_update_gif', alt: altText})
            }}
          />
        </View>
      )}

      {!embed.media && embed.link && (
        <View style={[a.relative, a.mt_lg]} key={embed.link.uri}>
          <ExternalEmbedLink
            uri={embed.link.uri}
            hasQuote={!!embed.quote}
            onRemove={() => dispatch({type: 'embed_remove_link'})}
          />
        </View>
      )}

      <LayoutAnimationConfig skipExiting>
        {video && (
          <Animated.View
            style={[a.w_full, a.mt_lg]}
            entering={native(ZoomIn)}
            exiting={native(ZoomOut)}>
            {video.asset &&
              (video.status === 'compressing' ? (
                <VideoTranscodeProgress
                  asset={video.asset}
                  progress={video.progress}
                  clear={clearVideo}
                />
              ) : video.video ? (
                <VideoPreview
                  asset={video.asset}
                  video={video.video}
                  isActiveNote={isActiveNote}
                  clear={clearVideo}
                />
              ) : null)}
            <SubtitleDialogBtn
              defaultAltText={video.altText}
              saveAltText={altText =>
                dispatch({
                  type: 'embed_update_video',
                  videoAction: {
                    type: 'update_alt_text',
                    altText,
                    signal: video.abortController.signal,
                  },
                })
              }
              captions={video.captions}
              setCaptions={updater => {
                dispatch({
                  type: 'embed_update_video',
                  videoAction: {
                    type: 'update_captions',
                    updater,
                    signal: video.abortController.signal,
                  },
                })
              }}
            />
          </Animated.View>
        )}
      </LayoutAnimationConfig>
      {embed.quote?.uri ? (
        <View
          style={[a.pb_sm, video ? [a.pt_md] : [a.pt_xl], isWeb && [a.pb_md]]}>
          <View style={[a.relative]}>
            <View style={{pointerEvents: 'none'}}>
              <LazyQuoteEmbed uri={embed.quote.uri} />
            </View>
            {canRemoveQuote && (
              <ExternalEmbedRemoveBtn
                onRemove={() => dispatch({type: 'embed_remove_quote'})}
                style={{top: 16}}
              />
            )}
          </View>
        </View>
      ) : null}
    </>
  )
}

function ComposerPills({
  isReply,
  thread,
  note,
  dispatch,
  bottomBarAnimatedStyle,
}: {
  isReply: boolean
  thread: ThreadDraft
  note: NoteDraft
  dispatch: (action: ComposerAction) => void
  bottomBarAnimatedStyle: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const media = note.embed.media
  const hasMedia = media?.type === 'images' || media?.type === 'video'
  const hasLink = !!note.embed.link

  // Don't render anything if no pills are going to be displayed
  if (isReply && !hasMedia && !hasLink) {
    return null
  }

  return (
    <Animated.View
      style={[a.flex_row, a.p_sm, t.atoms.bg, bottomBarAnimatedStyle]}>
      <ScrollView
        contentContainerStyle={[a.gap_sm]}
        horizontal={true}
        bounces={false}
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}>
        {isReply ? null : (
          <ThreadgateBtn
            notegate={thread.notegate}
            onChangeNotegate={nextNotegate => {
              dispatch({type: 'update_notegate', notegate: nextNotegate})
            }}
            threadgateAllowUISettings={thread.threadgate}
            onChangeThreadgateAllowUISettings={nextThreadgate => {
              dispatch({
                type: 'update_threadgate',
                threadgate: nextThreadgate,
              })
            }}
            style={bottomBarAnimatedStyle}
          />
        )}
        {hasMedia || hasLink ? (
          <LabelsBtn
            labels={note.labels}
            onChange={nextLabels => {
              dispatch({
                type: 'update_note',
                noteId: note.id,
                noteAction: {
                  type: 'update_labels',
                  labels: nextLabels,
                },
              })
            }}
          />
        ) : null}
      </ScrollView>
    </Animated.View>
  )
}

function ComposerFooter({
  note,
  dispatch,
  showAddButton,
  onEmojiButtonPress,
  onError,
  onSelectVideo,
  onAddNote,
  isGhostMode,
  onToggleGhostMode,
}: {
  note: NoteDraft
  dispatch: (action: NoteAction) => void
  showAddButton: boolean
  onEmojiButtonPress: () => void
  onError: (error: string) => void
  onSelectVideo: (noteId: string, asset: ImagePickerAsset) => void
  onAddNote: () => void
  isGhostMode: boolean
  onToggleGhostMode: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {isMobile} = useWebMediaQueries()

  const media = note.embed.media
  const images = media?.type === 'images' ? media.images : []
  const video = media?.type === 'video' ? media.video : null
  const isMaxImages = images.length >= MAX_IMAGES

  const onImageAdd = useCallback(
    (next: ComposerImage[]) => {
      dispatch({
        type: 'embed_add_images',
        images: next,
      })
    },
    [dispatch],
  )

  const onSelectGif = useCallback(
    (gif: Gif) => {
      dispatch({type: 'embed_add_gif', gif})
    },
    [dispatch],
  )

  return (
    <View
      style={[
        a.flex_row,
        a.py_xs,
        {paddingLeft: 7, paddingRight: 16},
        a.align_center,
        a.border_t,
        t.atoms.bg,
        t.atoms.border_contrast_medium,
        a.justify_between,
      ]}>
      <View style={[a.flex_row, a.align_center]}>
        <LayoutAnimationConfig skipEntering skipExiting>
          {video && video.status !== 'done' ? (
            <VideoUploadToolbar state={video} />
          ) : (
            <ToolbarWrapper style={[a.flex_row, a.align_center, a.gap_xs]}>
              <EnhancedSelectPhotoBtn
                size={images.length}
                disabled={media?.type === 'images' ? isMaxImages : !!media}
                onAddImages={onImageAdd}
                onAddVideo={asset => onSelectVideo(note.id, asset)}
                onShowMediaManager={() => setShowMediaManager(true)}
              />
              <Button
                onPress={onToggleGhostMode}
                style={a.p_sm}
                label={isGhostMode ? _(msg`Deactivate Ghost Mode`) : _(msg`Activate Ghost Mode`)}
                accessibilityHint={isGhostMode ? _(msg`Deactivates ghost mode`) : _(msg`Activates ghost mode for anonymous replies`)}
                variant="ghost"
                shape="round"
                color={isGhostMode ? "primary" : "secondary"}>
                <Ghost 
                  size="lg" 
                  style={isGhostMode ? {color: t.palette.primary_500} : {color: t.palette.text_contrast_low}}
                />
              </Button>
              <OpenCameraBtn
                disabled={media?.type === 'images' ? isMaxImages : !!media}
                onAdd={onImageAdd}
              />
              <SelectGifBtn onSelectGif={onSelectGif} disabled={!!media} />
              {!isMobile ? (
                <Button
                  onPress={onEmojiButtonPress}
                  style={a.p_sm}
                  label={_(msg`Open emoji picker`)}
                  accessibilityHint={_(msg`Opens emoji picker`)}
                  variant="ghost"
                  shape="round"
                  color="secondary">
                  <EmojiSmile size="lg" style={{color: t.palette.text_contrast_low}} />
                </Button>
              ) : null}
            </ToolbarWrapper>
          )}
        </LayoutAnimationConfig>
      </View>
      <View style={[a.flex_row, a.align_center, a.justify_between]}>
        {showAddButton && (
          <Button
            label={_(msg`Add new note`)}
            onPress={onAddNote}
            style={[a.p_sm, a.m_2xs]}
            variant="ghost"
            shape="round"
            color="primary">
            <FontAwesomeIcon
              icon="add"
              size={20}
              color={t.palette.primary_500}
            />
          </Button>
        )}
        <SelectLangBtn />
        <CharProgress
          count={note.shortenedGraphemeLength}
          style={{width: 65}}
        />
      </View>
    </View>
  )
}

export function useComposerCancelRef() {
  return useRef<CancelRef>(null)
}

function useScrollTracker({
  scrollViewRef,
  stickyBottom,
}: {
  scrollViewRef: AnimatedRef<Animated.ScrollView>
  stickyBottom: boolean
}) {
  const t = useTheme()
  const contentOffset = useSharedValue(0)
  const scrollViewHeight = useSharedValue(Infinity)
  const contentHeight = useSharedValue(0)

  const hasScrolledToTop = useDerivedValue(() =>
    withTiming(contentOffset.get() === 0 ? 1 : 0),
  )

  const hasScrolledToBottom = useDerivedValue(() =>
    withTiming(
      contentHeight.get() - contentOffset.get() - 5 <= scrollViewHeight.get()
        ? 1
        : 0,
    ),
  )

  const showHideBottomBorder = useCallback(
    ({
      newContentHeight,
      newContentOffset,
      newScrollViewHeight,
    }: {
      newContentHeight?: number
      newContentOffset?: number
      newScrollViewHeight?: number
    }) => {
      'worklet'
      if (typeof newContentHeight === 'number')
        contentHeight.set(Math.floor(newContentHeight))
      if (typeof newContentOffset === 'number')
        contentOffset.set(Math.floor(newContentOffset))
      if (typeof newScrollViewHeight === 'number')
        scrollViewHeight.set(Math.floor(newScrollViewHeight))
    },
    [contentHeight, contentOffset, scrollViewHeight],
  )

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      'worklet'
      showHideBottomBorder({
        newContentOffset: event.contentOffset.y,
        newContentHeight: event.contentSize.height,
        newScrollViewHeight: event.layoutMeasurement.height,
      })
    },
  })

  const onScrollViewContentSizeChangeUIThread = useCallback(
    (newContentHeight: number) => {
      'worklet'
      const oldContentHeight = contentHeight.get()
      let shouldScrollToBottom = false
      if (stickyBottom && newContentHeight > oldContentHeight) {
        const isFairlyCloseToBottom =
          oldContentHeight - contentOffset.get() - 100 <= scrollViewHeight.get()
        if (isFairlyCloseToBottom) {
          shouldScrollToBottom = true
        }
      }
      showHideBottomBorder({newContentHeight})
      if (shouldScrollToBottom) {
        scrollTo(scrollViewRef, 0, newContentHeight, true)
      }
    },
    [
      showHideBottomBorder,
      scrollViewRef,
      contentHeight,
      stickyBottom,
      contentOffset,
      scrollViewHeight,
    ],
  )

  const onScrollViewContentSizeChange = useCallback(
    (_width: number, height: number) => {
      runOnUI(onScrollViewContentSizeChangeUIThread)(height)
    },
    [onScrollViewContentSizeChangeUIThread],
  )

  const onScrollViewLayout = useCallback(
    (evt: LayoutChangeEvent) => {
      showHideBottomBorder({
        newScrollViewHeight: evt.nativeEvent.layout.height,
      })
    },
    [showHideBottomBorder],
  )

  const topBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: interpolateColor(
        hasScrolledToTop.get(),
        [0, 1],
        [t.atoms.border_contrast_medium.borderColor, 'transparent'],
      ),
    }
  })
  const bottomBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: interpolateColor(
        hasScrolledToBottom.get(),
        [0, 1],
        [t.atoms.border_contrast_medium.borderColor, 'transparent'],
      ),
    }
  })

  return {
    scrollHandler,
    onScrollViewContentSizeChange,
    onScrollViewLayout,
    topBarAnimatedStyle,
    bottomBarAnimatedStyle,
  }
}

function useKeyboardVerticalOffset() {
  const {top, bottom} = useSafeAreaInsets()

  // Android etc
  if (!isIOS) {
    // need to account for the edge-to-edge nav bar
    return bottom * -1
  }

  // iPhone SE
  if (top === 20) return 40

  // all other iPhones
  return top + 10
}

async function whenAppViewReady(
  agent: SonetAppAgent,
  uri: string,
  fn: (res: SonetFeedGetNoteThread.Response) => boolean,
) {
  await until(
    5, // 5 tries
    1e3, // 1s delay between tries
    fn,
    () =>
      agent.app.sonet.feed.getNoteThread({
        uri,
        depth: 0,
      }),
  )
}

function isEmptyNote(note: NoteDraft) {
  return (
    note.richtext.text.trim().length === 0 &&
    !note.embed.media &&
    !note.embed.link &&
    !note.embed.quote
  )
}

function useHideKeyboardOnBackground() {
  const appState = useAppState()

  useEffect(() => {
    if (isIOS) {
      if (appState === 'inactive') {
        Keyboard.dismiss()
      }
    }
  }, [appState])
}

const styles = StyleSheet.create({
  topbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 54,
    gap: 4,
  },
  noteBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginLeft: 12,
  },
  stickyFooterWeb: web({
    position: 'sticky',
    bottom: 0,
  }),
  errorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red1,
    borderRadius: 6,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  reminderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  errorIcon: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.red4,
    color: colors.red4,
    borderRadius: 30,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  inactiveNote: {
    opacity: 0.5,
  },
  addExtLinkBtn: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginBottom: 4,
  },
})

function ErrorBanner({
  error: standardError,
  videoState,
  clearError,
  clearVideo,
}: {
  error: string
  videoState: VideoState | NoVideoState
  clearError: () => void
  clearVideo: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  const videoError =
    videoState.status === 'error' ? videoState.error : undefined
  const error = standardError || videoError

  const onClearError = () => {
    if (standardError) {
      clearError()
    } else {
      clearVideo()
    }
  }

  if (!error) return null

  return (
    <Animated.View
      style={[a.px_lg, a.pb_sm]}
      entering={FadeIn}
      exiting={FadeOut}>
      <View
        style={[
          a.px_md,
          a.py_sm,
          a.gap_xs,
          a.rounded_sm,
          t.atoms.bg_contrast_25,
        ]}>
        <View style={[a.relative, a.flex_row, a.gap_sm, {paddingRight: 48}]}>
          <CircleInfo fill={t.palette.negative_400} />
          <NewText style={[a.flex_1, a.leading_snug, {paddingTop: 1}]}>
            {error}
          </NewText>
          <Button
            label={_(msg`Dismiss error`)}
            size="tiny"
            color="secondary"
            variant="ghost"
            shape="round"
            style={[a.absolute, {top: 0, right: 0}]}
            onPress={onClearError}>
            <ButtonIcon icon={X} />
          </Button>
        </View>
        {videoError && videoState.jobId && (
          <NewText
            style={[
              {paddingLeft: 28},
              a.text_xs,
              a.font_bold,
              a.leading_snug,
              t.atoms.text_contrast_low,
            ]}>
            <Trans>Job ID: {videoState.jobId}</Trans>
          </NewText>
        )}
      </View>
    </Animated.View>
  )
}

function ToolbarWrapper({
  style,
  children,
}: {
  style: StyleProp<ViewStyle>
  children: React.ReactNode
}) {
  if (isWeb) return children
  return (
    <Animated.View
      style={style}
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(400)}>
      {children}
    </Animated.View>
  )
}

function VideoUploadToolbar({state}: {state: VideoState}) {
  const t = useTheme()
  const {_} = useLingui()
  const progress = state.progress
  const shouldRotate =
    state.status === 'processing' && (progress === 0 || progress === 1)
  let wheelProgress = shouldRotate ? 0.33 : progress

  const rotate = useDerivedValue(() => {
    if (shouldRotate) {
      return withRepeat(
        withTiming(360, {
          duration: 2500,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
      )
    }
    return 0
  })

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{rotateZ: `${rotate.get()}deg`}],
    }
  })

  let text = ''

  switch (state.status) {
    case 'compressing':
      text = _(msg`Compressing video...`)
      break
    case 'uploading':
      text = _(msg`Uploading video...`)
      break
    case 'processing':
      text = _(msg`Processing video...`)
      break
    case 'error':
      text = _(msg`Error`)
      wheelProgress = 100
      break
    case 'done':
      text = _(msg`Video uploaded`)
      break
  }

  return (
    <ToolbarWrapper style={[a.flex_row, a.align_center, {paddingVertical: 5}]}>
      <Animated.View style={[animatedStyle]}>
        <ProgressCircle
          size={30}
          borderWidth={1}
          borderColor={t.atoms.border_contrast_low.borderColor}
          color={
            state.status === 'error'
              ? t.palette.negative_500
              : t.palette.primary_500
          }
          progress={wheelProgress}
        />
      </Animated.View>
      <NewText style={[a.font_bold, a.ml_sm]}>{text}</NewText>
    </ToolbarWrapper>
  )
}
