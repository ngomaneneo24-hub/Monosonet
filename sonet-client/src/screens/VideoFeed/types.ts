import {AuthorFilter} from '#/state/queries/note-feed'

/**
 * Kind of like `FeedDescriptor` but not
 */
export type VideoFeedSourceContext =
  | {
      type: 'feedgen'
      uri: string
      sourceInterstitial: 'discover' | 'explore' | 'none'
      initialNoteUri?: string
    }
  | {
      type: 'author'
      userId: string
      filter: AuthorFilter
      initialNoteUri?: string
    }
