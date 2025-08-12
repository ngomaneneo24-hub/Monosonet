import {type SonetFeedDefs, type SonetAppAgent} from '@sonet/api'

import {DEMO_FEED} from '#/lib/demo'
import {type FeedAPI, type FeedAPIResponse} from './types'

export class DemoFeedAPI implements FeedAPI {
  agent: SonetAppAgent

  constructor({agent}: {agent: SonetAppAgent}) {
    this.agent = agent
  }

  async peekLatest(): Promise<SonetFeedDefs.FeedViewNote> {
    return DEMO_FEED.feed[0]
  }

  async fetch(): Promise<FeedAPIResponse> {
    return DEMO_FEED
  }
}
