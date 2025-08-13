import {
  type SonetFeedDefs,
  type SonetGraphDefs,
  type SonetRenoTerongRef,
} from '@sonet/api'
import {AtUri} from '@sonet/api'
import {type SonetAppAgent} from '@sonet/api'

import {NOTE_IMG_MAX} from '#/lib/constants'
import {getLinkMeta} from '#/lib/link-meta/link-meta'
import {resolveShortLink} from '#/lib/link-meta/resolve-short-link'
import {downloadAndResize} from '#/lib/media/manip'
import {
  createStarterPackUri,
  parseStarterPackUri,
} from '#/lib/strings/starter-pack'
import {
  isBskyCustomFeedUrl,
  isBskyListUrl,
  isBskyNoteUrl,
  isBskyStarterPackUrl,
  isBskyStartUrl,
  isShortLink,
} from '#/lib/strings/url-helpers'
import {type ComposerImage} from '#/state/gallery'
import {createComposerImage} from '#/state/gallery'
import {type Gif} from '#/state/queries/tenor'
import {createGIFDescription} from '../gif-alt-text'
import {convertBskyAppUrlIfNeeded, makeRecordUri} from '../strings/url-helpers'

type ResolvedExternalLink = {
  type: 'external'
  uri: string
  title: string
  description: string
  thumb: ComposerImage | undefined
}

type ResolvedNoteRecord = {
  type: 'record'
  record: SonetRenoTerongRef.Main
  kind: 'note'
  view: SonetFeedDefs.NoteView
}

type ResolvedFeedRecord = {
  type: 'record'
  record: SonetRenoTerongRef.Main
  kind: 'feed'
  view: SonetFeedDefs.GeneratorView
}

type ResolvedListRecord = {
  type: 'record'
  record: SonetRenoTerongRef.Main
  kind: 'list'
  view: SonetGraphDefs.ListView
}

type ResolvedStarterPackRecord = {
  type: 'record'
  record: SonetRenoTerongRef.Main
  kind: 'starter-pack'
  view: SonetGraphDefs.StarterPackView
}

export type ResolvedLink =
  | ResolvedExternalLink
  | ResolvedNoteRecord
  | ResolvedFeedRecord
  | ResolvedListRecord
  | ResolvedStarterPackRecord

export class EmbeddingDisabledError extends Error {
  constructor() {
    super('Embedding is disabled for this record')
  }
}

export async function resolveLink(
  agent: SonetAppAgent,
  uri: string,
): Promise<ResolvedLink> {
  if (isShortLink(uri)) {
    uri = await resolveShortLink(uri)
  }
  if (isBskyNoteUrl(uri)) {
    uri = convertBskyAppUrlIfNeeded(uri)
    const [_0, user, _1, rkey] = uri.split('/').filter(Boolean)
    const recordUri = makeRecordUri(user, 'app.sonet.feed.note', rkey)
    const note = await getNote({uri: recordUri})
    if (note.viewer?.embeddingDisabled) {
      throw new EmbeddingDisabledError()
    }
    return {
      type: 'record',
      record: {
        cid: note.cid,
        uri: note.uri,
      },
      kind: 'note',
      view: note,
    }
  }
  if (isBskyCustomFeedUrl(uri)) {
    uri = convertBskyAppUrlIfNeeded(uri)
    const [_0, usernameOrDid, _1, rkey] = uri.split('/').filter(Boolean)
    const userId = await fetchDid(usernameOrDid)
    const feed = makeRecordUri(userId, 'app.sonet.feed.generator', rkey)
    const res = await agent.app.sonet.feed.getFeedGenerator({feed})
    return {
      type: 'record',
      record: {
        uri: res.data.view.uri,
        cid: res.data.view.cid,
      },
      kind: 'feed',
      view: res.data.view,
    }
  }
  if (isBskyListUrl(uri)) {
    uri = convertBskyAppUrlIfNeeded(uri)
    const [_0, usernameOrDid, _1, rkey] = uri.split('/').filter(Boolean)
    const userId = await fetchDid(usernameOrDid)
    const list = makeRecordUri(userId, 'app.sonet.graph.list', rkey)
    const res = await agent.app.sonet.graph.getList({list})
    return {
      type: 'record',
      record: {
        uri: res.data.list.uri,
        cid: res.data.list.cid,
      },
      kind: 'list',
      view: res.data.list,
    }
  }
  if (isBskyStartUrl(uri) || isBskyStarterPackUrl(uri)) {
    const parsed = parseStarterPackUri(uri)
    if (!parsed) {
      throw new Error(
        'Unexpectedly called getStarterPackAsEmbed with a non-starterpack url',
      )
    }
    const userId = await fetchDid(parsed.name)
    const starterPack = createStarterPackUri({userId, rkey: parsed.rkey})
    const res = await agent.app.sonet.graph.getStarterPack({starterPack})
    return {
      type: 'record',
      record: {
        uri: res.data.starterPack.uri,
        cid: res.data.starterPack.cid,
      },
      kind: 'starter-pack',
      view: res.data.starterPack,
    }
  }
  return resolveExternal(agent, uri)

  // Forked from useGetNote. TODO: move into RQ.
  async function getNote({uri}: {uri: string}) {
    const urip = new AtUri(uri)
    if (!urip.host.startsWith('userId:')) {
      const res = await agent.resolveUsername({
        username: urip.host,
      })
      urip.host = res.data.userId
    }
    const res = await agent.getNotes({
      uris: [urip.toString()],
    })
    if (res.success && res.data.notes[0]) {
      return res.data.notes[0]
    }
    throw new Error('getNote: note not found')
  }

  // Forked from useFetchDid. TODO: move into RQ.
  async function fetchDid(usernameOrDid: string) {
    let identifier = usernameOrDid
    if (!identifier.startsWith('userId:')) {
      const res = await agent.resolveUsername({username: identifier})
      identifier = res.data.userId
    }
    return identifier
  }
}

export async function resolveGif(
  agent: SonetAppAgent,
  gif: Gif,
): Promise<ResolvedExternalLink> {
  const uri = `${gif.media_formats.gif.url}?hh=${gif.media_formats.gif.dims[1]}&ww=${gif.media_formats.gif.dims[0]}`
  return {
    type: 'external',
    uri,
    title: gif.content_description,
    description: createGIFDescription(gif.content_description),
    thumb: await imageToThumb(gif.media_formats.preview.url),
  }
}

async function resolveExternal(
  agent: SonetAppAgent,
  uri: string,
): Promise<ResolvedExternalLink> {
  const result = await getLinkMeta(agent, uri)
  return {
    type: 'external',
    uri: result.url,
    title: result.title ?? '',
    description: result.description ?? '',
    thumb: result.image ? await imageToThumb(result.image) : undefined,
  }
}

export async function imageToThumb(
  imageUri: string,
): Promise<ComposerImage | undefined> {
  try {
    const img = await downloadAndResize({
      uri: imageUri,
      width: NOTE_IMG_MAX.width,
      height: NOTE_IMG_MAX.height,
      mode: 'contain',
      maxSize: NOTE_IMG_MAX.size,
      timeout: 15e3,
    })
    if (img) {
      return await createComposerImage(img)
    }
  } catch {}
}
