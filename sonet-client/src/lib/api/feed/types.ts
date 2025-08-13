import {SonetFeedDefs} from '@sonet/api'

export interface FeedAPIResponse {
  cursor?: string
  feed: SonetFeedDefs.FeedViewNote[]
}

export interface FeedAPI {
  peekLatest(): Promise<SonetFeedDefs.FeedViewNote>
  fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse>
}

export interface ReasonFeedSource {
  type: "sonet"
  uri: string
  href: string
}

export function isReasonFeedSource(v: unknown): v is ReasonFeedSource {
  return (
    !!v &&
    typeof v === 'object' &&
    '$type' in v &&
    v.$type === 'reasonFeedSource'
  )
}
