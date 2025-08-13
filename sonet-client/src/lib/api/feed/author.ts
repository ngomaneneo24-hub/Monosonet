import {
  SonetFeedDefs,
  SonetFeedGetAuthorFeed as GetAuthorFeed,
  SonetAppAgent,
} from '@sonet/api'

import {FeedAPI, FeedAPIResponse} from './types'
import {useSonetApi} from '#/state/session/sonet'

export class AuthorFeedAPI implements FeedAPI {
  agent: SonetAppAgent
  _params: GetAuthorFeed.QueryParams

  constructor({
    agent,
    feedParams,
  }: {
    agent: SonetAppAgent
    feedParams: GetAuthorFeed.QueryParams
  }) {
    this.agent = agent
    this._params = feedParams
  }

  get params() {
    const params = {...this._params}
    params.includePins =
      params.filter === 'notes_with_replies' ||
      params.filter === 'notes_and_author_threads'
    return params
  }

  async peekLatest(): Promise<SonetFeedDefs.FeedViewNote> {
    const res = await this.agent.getAuthorFeed({
      ...this.params,
      limit: 1,
    })
    return res.data.feed[0]
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    const res = await this.agent.getAuthorFeed({
      ...this.params,
      cursor,
      limit,
    })
    if (res.success) {
      return {
        cursor: res.data.cursor,
        feed: this._filter(res.data.feed),
      }
    }
    return {
      feed: [],
    }
  }

  _filter(feed: SonetFeedDefs.FeedViewNote[]) {
    if (this.params.filter === 'notes_and_author_threads') {
      return feed.filter(note => {
        const isReply = note.reply
        const isRenote = SonetFeedDefs.isReasonRenote(note.reason)
        const isPin = SonetFeedDefs.isReasonPin(note.reason)
        if (!isReply) return true
        if (isRenote || isPin) return true
        return isReply && isAuthorReplyChain(this.params.actor, note, feed)
      })
    }

    return feed
  }
}

export class SonetAuthorFeedAPI implements FeedAPI {
  private sonet: ReturnType<typeof useSonetApi>['getApi'] extends () => infer T ? T : any
  private userId: string
  constructor({sonet, userId}: {sonet: any; userId: string}) {
    this.sonet = sonet
    this.userId = userId
  }
  async peekLatest(): Promise<SonetFeedDefs.FeedViewNote> {
    const res = await this.sonet.getUserTimeline(this.userId, {limit: 1})
    const n = (res?.notes || [])[0]
    return n ? mapSonetNote(n) : {note: {uri: 'sonet://empty', cid: 'empty'} as any}
  }
  async fetch({cursor, limit}: {cursor: string | undefined; limit: number}): Promise<FeedAPIResponse> {
    const res = await this.sonet.getUserTimeline(this.userId, {cursor, limit})
    const notes = Array.isArray(res?.notes) ? res.notes : []
    return {cursor: res?.pagination?.cursor || undefined, feed: notes.map(mapSonetNote)}
  }
}

function mapSonetNote(n: any): SonetFeedDefs.FeedViewNote {
  const author = n.author || {}
  const note: SonetFeedDefs.NoteView = {
    uri: `sonet://note/${n.id}`,
    cid: n.id,
    author: {
      userId: author.userId || author.id || 'sonet:user',
      username: author.username || 'user',
      displayName: author.display_name,
      avatar: author.avatar_url,
    } as any,
    record: {text: n.content || n.text || ''} as any,
    likeCount: n.like_count || 0,
    renoteCount: n.renote_count || n.renote_count || 0,
    replyCount: n.reply_count || 0,
    indexedAt: n.created_at || new Date().toISOString(),
  }
  return {note}
}

function isAuthorReplyChain(
  actor: string,
  note: SonetFeedDefs.FeedViewNote,
  notes: SonetFeedDefs.FeedViewNote[],
): boolean {
  // current note is by a different user (shouldn't happen)
  if (note.note.author.userId !== actor) return false

  const replyParent = note.reply?.parent

  if (SonetFeedDefs.isNoteView(replyParent)) {
    // reply parent is by a different user
    if (replyParent.author.userId !== actor) return false

    // A top-level note that matches the parent of the current note.
    const parentNote = notes.find(p => p.note.uri === replyParent.uri)

    /*
     * Either we haven't fetched the parent at the top level, or the only
     * record we have is on feedItem.reply.parent, which we've already checked
     * above.
     */
    if (!parentNote) return true

    // Walk up to parent
    return isAuthorReplyChain(actor, parentNote, notes)
  }

  // Just default to showing it
  return true
}
