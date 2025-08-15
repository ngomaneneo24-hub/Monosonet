import {type ImagePickerAsset} from 'expo-image-picker'
import {RichText, SonetNotegate, SonetThreadgateRule} from '@sonet/types'
import {nanoid} from 'nanoid/non-secure'

import {type SelfLabel} from '#/lib/moderation'
import {insertMentionAt} from '#/lib/strings/mention-manip'
import {shortenLinks} from '#/lib/strings/rich-text-manip'
import {
  isBskyNoteUrl,
  noteUriToRelativePath,
  toSonetAppUrl,
} from '#/lib/strings/url-helpers'
import {type ComposerImage, createInitialImages} from '#/state/gallery'
import {createNotegateRecord} from '#/state/queries/notegate/util'
import {type Gif} from '#/state/queries/tenor'
import {threadgateRecordToAllowUISetting} from '#/state/queries/threadgate'
import {type ThreadgateAllowUISetting} from '#/state/queries/threadgate'
import {type ComposerOpts} from '#/state/shell/composer'
import {
  type LinkFacetMatch,
  suggestLinkCardUri,
} from '#/view/com/composer/text-input/text-input-util'
import {
  createVideoState,
  type VideoAction,
  videoReducer,
  type VideoState,
} from './video'

type ImagesMedia = {
  type: 'images'
  images: ComposerImage[]
}

type VideoMedia = {
  type: 'video'
  video: VideoState
}

type GifMedia = {
  type: 'gif'
  gif: Gif
  alt: string
}

type Link = {
  type: 'link'
  uri: string
}

// This structure doesn't exactly correspond to the data model.
// Instead, it maps to how the UI is organized, and how we present a note.
export type EmbedDraft = {
  // We'll always submit quote and actual media (images, video, gifs) chosen by the user.
  quote: Link | undefined
  media: ImagesMedia | VideoMedia | GifMedia | undefined
  // This field may end up ignored if we have more important things to display than a link card:
  link: Link | undefined
}

export type NoteDraft = {
  id: string
  richtext: RichText
  labels: SelfLabel[]
  embed: EmbedDraft
  shortenedGraphemeLength: number
}

export type NoteAction =
  | {type: 'update_richtext'; richtext: RichText}
  | {type: 'update_labels'; labels: SelfLabel[]}
  | {type: 'embed_add_images'; images: ComposerImage[]}
  | {type: 'embed_update_image'; image: ComposerImage}
  | {type: 'embed_remove_image'; image: ComposerImage}
  | {
      type: 'embed_add_video'
      asset: ImagePickerAsset
      abortController: AbortController
    }
  | {type: 'embed_remove_video'}
  | {type: 'embed_update_video'; videoAction: VideoAction}
  | {type: 'embed_add_uri'; uri: string}
  | {type: 'embed_remove_quote'}
  | {type: 'embed_remove_link'}
  | {type: 'embed_add_gif'; gif: Gif}
  | {type: 'embed_update_gif'; alt: string}
  | {type: 'embed_remove_gif'}

export type ThreadDraft = {
  notes: NoteDraft[]
  notegate: SonetNotegate
  threadgate: SonetThreadgateRule[]
}

export type ComposerState = {
  thread: ThreadDraft
  activeNoteIndex: number
  mutableNeedsFocusActive: boolean
}

export type ComposerAction =
  | {type: 'update_notegate'; notegate: SonetFeedNotegate.Record}
  | {type: 'update_threadgate'; threadgate: ThreadgateAllowUISetting[]}
  | {
      type: 'update_note'
      noteId: string
      noteAction: NoteAction
    }
  | {
      type: 'add_note'
    }
  | {
      type: 'remove_note'
      noteId: string
    }
  | {
      type: 'focus_note'
      noteId: string
    }

export const MAX_IMAGES = 10

export function composerReducer(
  state: ComposerState,
  action: ComposerAction,
): ComposerState {
  switch (action.type) {
    case 'update_notegate': {
      return {
        ...state,
        thread: {
          ...state.thread,
          notegate: action.notegate,
        },
      }
    }
    case 'update_threadgate': {
      return {
        ...state,
        thread: {
          ...state.thread,
          threadgate: action.threadgate,
        },
      }
    }
    case 'update_note': {
      let nextNotes = state.thread.notes
      const noteIndex = state.thread.notes.findIndex(
        p => p.id === action.noteId,
      )
      if (noteIndex !== -1) {
        nextNotes = state.thread.notes.slice()
        nextNotes[noteIndex] = noteReducer(
          state.thread.notes[noteIndex],
          action.noteAction,
        )
      }
      return {
        ...state,
        thread: {
          ...state.thread,
          notes: nextNotes,
        },
      }
    }
    case 'add_note': {
      const activeNoteIndex = state.activeNoteIndex
      const nextNotes = [...state.thread.notes]
      nextNotes.splice(activeNoteIndex + 1, 0, {
        id: nanoid(),
        richtext: new RichText({text: ''}),
        shortenedGraphemeLength: 0,
        labels: [],
        embed: {
          quote: undefined,
          media: undefined,
          link: undefined,
        },
      })
      return {
        ...state,
        thread: {
          ...state.thread,
          notes: nextNotes,
        },
      }
    }
    case 'remove_note': {
      if (state.thread.notes.length < 2) {
        return state
      }
      let nextActiveNoteIndex = state.activeNoteIndex
      const indexToRemove = state.thread.notes.findIndex(
        p => p.id === action.noteId,
      )
      let nextNotes = [...state.thread.notes]
      if (indexToRemove !== -1) {
        const noteToRemove = state.thread.notes[indexToRemove]
        if (noteToRemove.embed.media?.type === 'video') {
          noteToRemove.embed.media.video.abortController.abort()
        }
        nextNotes.splice(indexToRemove, 1)
        nextActiveNoteIndex = Math.max(0, indexToRemove - 1)
      }
      return {
        ...state,
        activeNoteIndex: nextActiveNoteIndex,
        mutableNeedsFocusActive: true,
        thread: {
          ...state.thread,
          notes: nextNotes,
        },
      }
    }
    case 'focus_note': {
      const nextActiveNoteIndex = state.thread.notes.findIndex(
        p => p.id === action.noteId,
      )
      if (nextActiveNoteIndex === -1) {
        return state
      }
      return {
        ...state,
        activeNoteIndex: nextActiveNoteIndex,
      }
    }
  }
}

function noteReducer(state: NoteDraft, action: NoteAction): NoteDraft {
  switch (action.type) {
    case 'update_richtext': {
      return {
        ...state,
        richtext: action.richtext,
        shortenedGraphemeLength: getShortenedLength(action.richtext),
      }
    }
    case 'update_labels': {
      return {
        ...state,
        labels: action.labels,
      }
    }
    case 'embed_add_images': {
      if (action.images.length === 0) {
        return state
      }
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (!prevMedia) {
        nextMedia = {
          type: 'images',
          images: action.images.slice(0, MAX_IMAGES),
        }
      } else if (prevMedia.type === 'images') {
        nextMedia = {
          ...prevMedia,
          images: [...prevMedia.images, ...action.images].slice(0, MAX_IMAGES),
        }
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
    case 'embed_update_image': {
      const prevMedia = state.embed.media
      if (prevMedia?.type === 'images') {
        const updatedImage = action.image
        const nextMedia = {
          ...prevMedia,
          images: prevMedia.images.map(img => {
            if (img.source.id === updatedImage.source.id) {
              return updatedImage
            }
            return img
          }),
        }
        return {
          ...state,
          embed: {
            ...state.embed,
            media: nextMedia,
          },
        }
      }
      return state
    }
    case 'embed_remove_image': {
      const prevMedia = state.embed.media
      let nextLabels = state.labels
      if (prevMedia?.type === 'images') {
        const removedImage = action.image
        let nextMedia: ImagesMedia | undefined = {
          ...prevMedia,
          images: prevMedia.images.filter(img => {
            return img.source.id !== removedImage.source.id
          }),
        }
        if (nextMedia.images.length === 0) {
          nextMedia = undefined
          if (!state.embed.link) {
            nextLabels = []
          }
        }
        return {
          ...state,
          labels: nextLabels,
          embed: {
            ...state.embed,
            media: nextMedia,
          },
        }
      }
      return state
    }
    case 'embed_add_video': {
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (!prevMedia) {
        nextMedia = {
          type: 'video',
          video: createVideoState(action.asset, action.abortController),
        }
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
    case 'embed_update_video': {
      const videoAction = action.videoAction
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (prevMedia?.type === 'video') {
        nextMedia = {
          ...prevMedia,
          video: videoReducer(prevMedia.video, videoAction),
        }
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
    case 'embed_remove_video': {
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (prevMedia?.type === 'video') {
        prevMedia.video.abortController.abort()
        nextMedia = undefined
      }
      let nextLabels = state.labels
      if (!state.embed.link) {
        nextLabels = []
      }
      return {
        ...state,
        labels: nextLabels,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
    case 'embed_add_uri': {
      const prevQuote = state.embed.quote
      const prevLink = state.embed.link
      let nextQuote = prevQuote
      let nextLink = prevLink
      if (isBskyNoteUrl(action.uri)) {
        if (!prevQuote) {
          nextQuote = {
            type: 'link',
            uri: action.uri,
          }
        }
      } else {
        if (!prevLink) {
          nextLink = {
            type: 'link',
            uri: action.uri,
          }
        }
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          quote: nextQuote,
          link: nextLink,
        },
      }
    }
    case 'embed_remove_link': {
      let nextLabels = state.labels
      if (!state.embed.media) {
        nextLabels = []
      }
      return {
        ...state,
        labels: nextLabels,
        embed: {
          ...state.embed,
          link: undefined,
        },
      }
    }
    case 'embed_remove_quote': {
      return {
        ...state,
        embed: {
          ...state.embed,
          quote: undefined,
        },
      }
    }
    case 'embed_add_gif': {
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (!prevMedia) {
        nextMedia = {
          type: 'gif',
          gif: action.gif,
          alt: '',
        }
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
    case 'embed_update_gif': {
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (prevMedia?.type === 'gif') {
        nextMedia = {
          ...prevMedia,
          alt: action.alt,
        }
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
    case 'embed_remove_gif': {
      const prevMedia = state.embed.media
      let nextMedia = prevMedia
      if (prevMedia?.type === 'gif') {
        nextMedia = undefined
      }
      return {
        ...state,
        embed: {
          ...state.embed,
          media: nextMedia,
        },
      }
    }
  }
}

export function createComposerState({
  initText,
  initMention,
  initImageUris,
  initQuoteUri,
  initInteractionSettings,
}: {
  initText: string | undefined
  initMention: string | undefined
  initImageUris: ComposerOpts['imageUris']
  initQuoteUri: string | undefined
  initInteractionSettings:
    | BskyPreferences['noteInteractionSettings']
    | undefined
}): ComposerState {
  let media: ImagesMedia | undefined
  if (initImageUris?.length) {
    media = {
      type: 'images',
      images: createInitialImages(initImageUris),
    }
  }
  let quote: Link | undefined
  if (initQuoteUri) {
    // TODO: Consider passing the app url directly.
    const path = noteUriToRelativePath(initQuoteUri)
    if (path) {
      quote = {
        type: 'link',
        uri: toSonetAppUrl(path),
      }
    }
  }
  const initRichText = new RichText({
    text: initText
      ? initText
      : initMention
        ? insertMentionAt(
            `@${initMention}`,
            initMention.length + 1,
            `${initMention}`,
          )
        : '',
  })

  let link: Link | undefined

  /**
   * `initText` atm is only used for compose intents, meaning share links from
   * external sources. If `initText` is defined, we want to extract links/notes
   * from `initText` and suggest them as embeds.
   *
   * This checks for notes separately from other types of links so that notes
   * can become quotes. The util `suggestLinkCardUri` is then applied to ensure
   * we suggest at most 1 of each.
   */
  if (initText) {
    initRichText.detectFacetsWithoutResolution()
    const detectedExtUris = new Map<string, LinkFacetMatch>()
    const detectedNoteUris = new Map<string, LinkFacetMatch>()
    if (initRichText.facets) {
      for (const facet of initRichText.facets) {
        for (const feature of facet.features) {
          if (SonetRichtextFacet.isLink(feature)) {
            if (isBskyNoteUrl(feature.uri)) {
              detectedNoteUris.set(feature.uri, {facet, rt: initRichText})
            } else {
              detectedExtUris.set(feature.uri, {facet, rt: initRichText})
            }
          }
        }
      }
    }
    const pastSuggestedUris = new Set<string>()
    const suggestedExtUri = suggestLinkCardUri(
      true,
      detectedExtUris,
      new Map(),
      pastSuggestedUris,
    )
    if (suggestedExtUri) {
      link = {
        type: 'link',
        uri: suggestedExtUri,
      }
    }
    const suggestedNoteUri = suggestLinkCardUri(
      true,
      detectedNoteUris,
      new Map(),
      pastSuggestedUris,
    )
    if (suggestedNoteUri) {
      /*
       * `initQuote` is only populated via in-app user action, but we're being
       * future-defensive here.
       */
      if (!quote) {
        quote = {
          type: 'link',
          uri: suggestedNoteUri,
        }
      }
    }
  }

  return {
    activeNoteIndex: 0,
    mutableNeedsFocusActive: false,
    thread: {
      notes: [
        {
          id: nanoid(),
          richtext: initRichText,
          shortenedGraphemeLength: getShortenedLength(initRichText),
          labels: [],
          embed: {
            quote,
            media,
            link,
          },
        },
      ],
      notegate: createNotegateRecord({
        note: '',
        embeddingRules: initInteractionSettings?.notegateEmbeddingRules || [],
      }),
      threadgate: threadgateRecordToAllowUISetting({
        type: "sonet",
        note: '',
        createdAt: new Date().toString(),
        allow: initInteractionSettings?.threadgateAllowRules,
      }),
    },
  }
}

function getShortenedLength(rt: RichText) {
  return shortenLinks(rt).graphemeLength
}
