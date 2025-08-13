import {SonetFeedDefs, SonetAppAgent} from '@sonet/api'

import {FeedAPI, FeedAPIResponse} from './types'

export class FollowingFeedAPI implements FeedAPI {
  agent: SonetAppAgent

  constructor({agent}: {agent: SonetAppAgent}) {
    this.agent = agent
  }

  async peekLatest(): Promise<SonetFeedDefs.FeedViewNote> {
    const res = await this.agent.getTimeline({
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
    const res = await this.agent.getTimeline({
      cursor,
      limit,
    })
    if (res.success) {
      return {
        cursor: res.data.cursor,
        feed: res.data.feed,
      }
    }
    return {
      feed: [],
    }
  }
}
