import {
  type Agent,
  type SonetFeedDefs,
  type SonetFeedGetNotes,
} from '@sonet/api'

import {logger} from '#/logger'
import {type FeedAPI, type FeedAPIResponse} from './types'

export class NoteListFeedAPI implements FeedAPI {
  agent: Agent
  params: SonetFeedGetNotes.QueryParams
  peek: SonetFeedDefs.FeedViewNote | null = null

  constructor({
    agent,
    feedParams,
  }: {
    agent: Agent
    feedParams: SonetFeedGetNotes.QueryParams
  }) {
    this.agent = agent
    if (feedParams.uris.length > 25) {
      logger.warn(
        `Too many URIs provided - expected 25, got ${feedParams.uris.length}`,
      )
    }
    this.params = {
      uris: feedParams.uris.slice(0, 25),
    }
  }

  async peekLatest(): Promise<SonetFeedDefs.FeedViewNote> {
    if (this.peek) return this.peek
    throw new Error('Has not fetched yet')
  }

  async fetch({}: {}): Promise<FeedAPIResponse> {
    const res = await this.agent.app.sonet.feed.getNotes({
      ...this.params,
    })
    if (res.success) {
      this.peek = {note: res.data.notes[0]}
      return {
        feed: res.data.notes.map(note => ({note})),
      }
    }
    return {
      feed: [],
    }
  }
}
