// Sonet Types - Simplified for centralized platform

export interface SonetPost {
  uri: string
  cid: string
  author: SonetProfile
  record: SonetPostRecord
  embed?: SonetEmbed
  replyCount: number
  repostCount: number
  likeCount: number
  indexedAt: string
  labels?: SonetLabel[]
  threadgate?: SonetThreadgate
}

export interface SonetProfile {
  did: string
  handle: string
  displayName?: string
  description?: string
  avatar?: string
  banner?: string
  followersCount: number
  followsCount: number
  postsCount: number
  indexedAt: string
  labels?: SonetLabel[]
  viewer?: {
    muted?: boolean
    blockedBy?: boolean
    following?: string
    followedBy?: string
  }
}

export interface SonetPostRecord {
  text: string
  createdAt: string
  reply?: {
    root: {
      uri: string
      cid: string
    }
    parent: {
      uri: string
      cid: string
    }
  }
  langs?: string[]
  labels?: string[]
  tags?: string[]
}

export interface SonetEmbed {
  $type: 'sonet.embed#images' | 'sonet.embed#external' | 'sonet.embed#record' | 'sonet.embed#recordWithMedia'
  images?: SonetImage[]
  external?: SonetExternal
  record?: SonetEmbedRecord
  recordWithMedia?: SonetRecordWithMedia
}

export interface SonetImage {
  alt: string
  image: {
    ref: {
      $link: string
    }
    mimeType: string
    size: number
  }
  aspectRatio?: {
    width: number
    height: number
  }
}

export interface SonetExternal {
  uri: string
  title: string
  description: string
  thumb?: {
    ref: {
      $link: string
    }
    mimeType: string
    size: number
  }
}

export interface SonetEmbedRecord {
  record: {
    uri: string
    cid: string
  }
}

export interface SonetRecordWithMedia {
  record: SonetEmbedRecord
  media: SonetEmbed
}

export interface SonetLabel {
  val: string
  src: string
  uri?: string
  cid?: string
  cts: string
}

export interface SonetThreadgate {
  record: {
    allow: Array<{
      $type: 'sonet.threadgate#mentionRule' | 'sonet.threadgate#followingRule' | 'sonet.threadgate#listRule'
      mention?: boolean
      following?: boolean
      list?: string
    }>
  }
}

export interface SonetFeedViewPost {
  post: SonetPost
  reply?: SonetPost
  reason?: SonetReason
  feedContext?: string
}

export interface SonetReason {
  $type: 'sonet.feed.defs#reasonRepost'
  by: SonetProfile
  indexedAt: string
}

export interface SonetInteraction {
  item: string
  event: SonetInteractionEvent
  feedContext?: string
  reqId?: string
}

export type SonetInteractionEvent = 
  | 'sonet.feed.defs#interactionSeen'
  | 'sonet.feed.defs#interactionLike'
  | 'sonet.feed.defs#interactionRepost'
  | 'sonet.feed.defs#interactionReply'
  | 'sonet.feed.defs#interactionQuote'
  | 'sonet.feed.defs#interactionShare'
  | 'sonet.feed.defs#clickthroughAuthor'
  | 'sonet.feed.defs#clickthroughEmbed'
  | 'sonet.feed.defs#clickthroughItem'
  | 'sonet.feed.defs#clickthroughReposter'
  | 'sonet.feed.defs#requestMore'
  | 'sonet.feed.defs#requestLess'

export interface SonetSavedFeed {
  id: string
  type: 'timeline' | 'feed'
  value: string
  pinned: boolean
  displayName: string
  description: string
  avatar?: string
  contentMode?: 'text' | 'images' | 'video'
}

export interface SonetFeedSlice {
  items: SonetFeedViewPost[]
  cursor?: string
  feedContext?: string
}

export interface SonetFeedInfo {
  type: 'feed' | 'timeline'
  uri: string
  feedDescriptor: string
  route: {
    href: string
    name: string
    params: Record<string, string>
  }
  cid: string
  avatar: string | undefined
  displayName: string
  description: string
  contentMode: 'text' | 'images' | 'video' | undefined
}

// Additional types needed for complete migration
export interface SonetThreadViewPost {
  thread: SonetPost
  replies: SonetPost[]
  parent?: SonetPost
  root?: SonetPost
}

export interface SonetModerationDecision {
  action: 'none' | 'warn' | 'hide' | 'blur' | 'block' | 'alert'
  cause?: string
  tags?: string[]
}

export interface SonetModerationPrefs {
  adultContentEnabled: boolean
  labels: Record<string, 'hide' | 'warn' | 'ignore'>
  labelers: string[]
}

export interface SonetAgent {
  // Basic agent interface for API calls
  api: {
    feed: {
      getFeed: (params: any) => Promise<any>
      sendInteractions: (params: any) => Promise<any>
    }
    post: {
      create: (params: any) => Promise<any>
      delete: (params: any) => Promise<any>
    }
  }
}

// Utility functions for type checking
export const SonetUtils = {
  isReasonRepost: (reason: any): reason is SonetReason => {
    return reason && reason.$type === 'sonet.feed.defs#reasonRepost'
  },
  
  isThreadViewPost: (thread: any): thread is SonetThreadViewPost => {
    return thread && thread.thread && thread.replies
  },
  
  isPostRecord: (record: any): record is SonetPostRecord => {
    return record && record.text && record.createdAt
  },
  
  validatePostRecord: (record: any): boolean => {
    return SonetUtils.isPostRecord(record)
  }
}