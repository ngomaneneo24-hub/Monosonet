// Sonet API Types - Replacing AT Protocol types

export interface SonetUser {
  id: string
  username: string
  displayName?: string
  bio?: string
  avatar?: string
  banner?: string
  followersCount: number
  followingCount: number
  notesCount: number
  createdAt: string
  updatedAt: string
}

export interface SonetNote {
  id: string
  content: string
  author: SonetUser
  createdAt: string
  updatedAt: string
  likesCount: number
  renotesCount: number
  repliesCount: number
  isLiked: boolean
  isRenoted: boolean
  isBookmarked: boolean
  replyTo?: string
  media?: SonetMedia[]
  mentions?: string[]
  hashtags?: string[]
}

export interface SonetMedia {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  alt?: string
  width?: number
  height?: number
}

export interface SonetAuthResponse {
  accessToken: string
  refreshToken: string
  user: SonetUser
}

export interface SonetTimelineResponse {
  notes: SonetNote[]
  cursor?: string
  hasMore: boolean
}

export interface SonetSearchResponse {
  users: SonetUser[]
  notes: SonetNote[]
  cursor?: string
}

export interface SonetNotification {
  id: string
  type: 'like' | 'renote' | 'reply' | 'follow' | 'mention'
  actor: SonetUser
  target: SonetNote | SonetUser
  createdAt: string
  isRead: boolean
}

// API Error types
export class SonetError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'SonetError'
  }
}

export class SonetAuthError extends SonetError {
  constructor(message: string, statusCode: number = 401) {
    super(message, statusCode, 'AUTH_ERROR')
    this.name = 'SonetAuthError'
  }
}

export class SonetValidationError extends SonetError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'VALIDATION_ERROR')
    this.name = 'SonetValidationError'
  }
}

export interface SonetUsernameAvailability {
  available: boolean
  username: string
  suggestedUsernames?: string[]
}

// Rich Text and Facets
export class RichText {
  text: string
  facets?: SonetFacet[]

  constructor(options: {text: string; facets?: SonetFacet[]}) {
    this.text = options.text
    this.facets = options.facets
  }

  detectFacetsWithoutResolution(): void {
    // Implement facet detection logic
  }
}

export interface SonetFacet {
  index: {
    byteStart: number
    byteEnd: number
  }
  features: SonetFacetFeature[]
}

export type SonetFacetFeature = 
  | SonetMentionFeature
  | SonetLinkFeature
  | SonetTagFeature

export interface SonetMentionFeature {
  type: "sonet"
  userId: string
}

export interface SonetLinkFeature {
  type: "sonet"
  uri: string
}

export interface SonetTagFeature {
  type: "sonet"
  tag: string
}

// Threadgate and Notegate
export interface SonetThreadgate {
  allow: SonetThreadgateRule[]
}

export type SonetThreadgateRule = 
  | { type: "sonet"; mention: boolean }
  | { type: "sonet"; following: boolean }
  | { type: "sonet"; list: string }

export interface SonetNotegate {
  allow: SonetNotegateRule[]
}

export type SonetNotegateRule = 
  | { type: "sonet"; mention: boolean }
  | { type: "sonet"; following: boolean }
  | { type: "sonet"; list: string }

// Video and Media Types
export interface SonetVideoDefs {
  JobStatus: SonetJobStatus
}

export type SonetJobStatus = 
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'canceled'

export interface SonetBlobRef {
  $link: string
  mimeType: string
  size: number
}

export interface SonetAgent {
  // Basic agent interface for API calls
  api: {
    video: {
      getUploadLimits: (params: any) => Promise<any>
      uploadVideo: (params: any) => Promise<any>
    }
  }
}

// Regex constants for text processing
export const TAG_REGEX = /(^|\s)(#[a-zA-Z0-9\u0080-\uFFFF]+)/g
export const TRAILING_PUNCTUATION_REGEX = /[.,:;!?)]*$/
export const URL_REGEX = /https?:\/\/[^\s]+/g

// Label and Moderation Types
export interface SonetLabel {
  val: string
  uri: string
  cid: string
  neg?: boolean
  src: string
  cts: string
}

export interface SonetModerationCause {
  type: 'label' | 'block' | 'mute' | 'report'
  label?: SonetLabel
  reason?: string
}

export interface SonetModerationDecision {
  profile: {
    cause: SonetModerationCause | null
    filter: boolean
    label: boolean
    blur: boolean
    alert: boolean
    noOverride: boolean
  }
  content: {
    cause: SonetModerationCause | null
    filter: boolean
    label: boolean
    blur: boolean
    alert: boolean
    noOverride: boolean
  }
  user: {
    cause: SonetModerationCause | null
    filter: boolean
    label: boolean
    blur: boolean
    alert: boolean
    noOverride: boolean
  }
}