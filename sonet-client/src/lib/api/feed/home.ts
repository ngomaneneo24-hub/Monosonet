import {type SonetFeedDefs, type SonetAppAgent} from '@sonet/api'

import {PROD_DEFAULT_FEED} from '#/lib/constants'
import {CustomFeedAPI} from './custom'
import {FollowingFeedAPI} from './following'
import {type FeedAPI, type FeedAPIResponse} from './types'

// HACK
// the feed API does not include any facilities for passing down
// non-note elements. adding that is a bit of a heavy lift, and we
// have just one temporary usecase for it: flagging when the home feed
// falls back to discover.
// we use this fallback marker note to drive this instead. see Feed.tsx
// for the usage.
// -prf
export const FALLBACK_MARKER_POST: SonetFeedDefs.FeedViewNote = {
  note: {
    uri: 'fallback-marker-note',
    cid: 'fake',
    record: {},
    author: {
      userId: 'userId:fake',
      username: 'fake.com',
    },
    indexedAt: new Date().toISOString(),
  },
}

export class HomeFeedAPI implements FeedAPI {
  agent: SonetAppAgent
  following: FollowingFeedAPI
  discover: CustomFeedAPI
  usingDiscover = false
  itemCursor = 0
  userInterests?: string

  constructor({
    userInterests,
    agent,
  }: {
    userInterests?: string
    agent: SonetAppAgent
  }) {
    this.agent = agent
    this.following = new FollowingFeedAPI({agent})
    this.discover = new CustomFeedAPI({
      agent,
      feedParams: {feed: PROD_DEFAULT_FEED('whats-hot')},
    })
    this.userInterests = userInterests
  }

  reset() {
    this.following = new FollowingFeedAPI({agent: this.agent})
    this.discover = new CustomFeedAPI({
      agent: this.agent,
      feedParams: {feed: PROD_DEFAULT_FEED('whats-hot')},
      userInterests: this.userInterests,
    })
    this.usingDiscover = false
    this.itemCursor = 0
  }

  async peekLatest(): Promise<SonetFeedDefs.FeedViewNote> {
    if (this.usingDiscover) {
      return this.discover.peekLatest()
    }
    return this.following.peekLatest()
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    if (!cursor) {
      this.reset()
    }

    let returnCursor
    let notes: SonetFeedDefs.FeedViewNote[] = []

    if (!this.usingDiscover) {
      const res = await this.following.fetch({cursor, limit})
      returnCursor = res.cursor
      notes = notes.concat(res.feed)
      if (!returnCursor) {
        cursor = ''
        notes.push(FALLBACK_MARKER_POST)
        this.usingDiscover = true
      }
    }

    if (this.usingDiscover && !__DEV__) {
      const res = await this.discover.fetch({cursor, limit})
      returnCursor = res.cursor
      notes = notes.concat(res.feed)
    }

    return {
      cursor: returnCursor,
      feed: notes,
    }
  }
}
