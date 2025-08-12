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

export interface SonetHandleAvailability {
  available: boolean
  handle: string
  suggestedHandles?: string[]
}