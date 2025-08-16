// Sonet API Client - Replacing AT Protocol agent

import { 
  SonetUser, 
  SonetNote, 
  SonetAuthResponse, 
  SonetTimelineResponse,
  SonetSearchResponse,
  SonetNotification,
  SonetError,
  SonetAuthError,
  SonetValidationError
} from '../types/sonet'

// Core types that the codebase expects
export interface SonetEmbedRecord {
  View: any
  ViewRecord: any
  ViewDetached: any
  Main: any
  isView: (obj: any) => boolean
  isViewRecord: (obj: any) => boolean
  isViewDetached: (obj: any) => boolean
}

export interface SonetEmbedRecordWithMedia {
  View: any
  ViewRecord: any
  Main: any
  isView: (obj: any) => boolean
}

export interface SonetFeedNote {
  Record: any
  isRecord: (obj: any) => boolean
}

export interface SonetFeedDefs {
  NoteView: any
}

export interface SonetActorDefs {
  ProfileViewBasic: any
}

export interface SonetUnspeccedDefs {
  ThreadItemNote: any
  ThreadItemNoUnauthenticated: any
  ThreadItemNotFound: any
  ThreadItemBlocked: any
}

export interface SonetUnspeccedGetNoteThreadV2 {
  ThreadItem: any
}

export interface SonetEmbedExternal {
  View: any
  isView: (obj: any) => boolean
}

export interface SonetEmbedImages {
  View: any
  isView: (obj: any) => boolean
}

export interface SonetEmbedVideo {
  View: any
  isView: (obj: any) => boolean
}

// SonetAppAgent is defined in sonet-agent.ts to avoid duplicate declarations

export interface SonetLabelDefs {
  // Add label definitions as needed
}

export interface SonetRepoApplyWrites {
  Create: any
}

export interface SonetRenoTerongRef {
  // Add reno terong ref definitions as needed
}

export interface ModerationOpts {
  userDid: string
  // Add other moderation options as needed
}

export interface AtUri {
  href: string
  host: string
  rkey: string
}

export interface BlobRef {
  // Add blob ref definitions as needed
}

export interface RichText {
  text: string
  // Add other rich text properties as needed
}

export interface TID {
  // Add TID definitions as needed
}

// Utility type for typed objects
export type $Typed<T> = T

// Moderation function
export function moderateNote(note: any, moderationOpts: ModerationOpts) {
  // Implement proper moderation logic
  return {
    ui: (context: string) => ({
      blur: false,
      filter: false,
      blurs: [],
      filters: [],
    }),
  }
}

export class SonetClient {
  private baseUrl: string
  private accessToken?: string
  private refreshToken?: string

  constructor(baseUrl: string = 'https://api.sonet.app') {
    this.baseUrl = baseUrl
  }

  // Authentication
  async login(identifier: string, password: string): Promise<SonetAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      })

      if (!response.ok) {
        throw new SonetAuthError('Login failed', response.status)
      }

      const data: SonetAuthResponse = await response.json()
      this.accessToken = data.accessToken
      this.refreshToken = data.refreshToken
      return data
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Login failed', 500)
    }
  }

  async register(username: string, email: string, password: string): Promise<SonetAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        throw new SonetValidationError('Registration failed', response.status)
      }

      const data: SonetAuthResponse = await response.json()
      this.accessToken = data.accessToken
      this.refreshToken = data.refreshToken
      return data
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Registration failed', 500)
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        })
      }
    } finally {
      this.accessToken = undefined
      this.refreshToken = undefined
    }
  }

  async activateAccount(): Promise<void> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new SonetError('Failed to activate account', response.status)
      }
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to activate account', 500)
    }
  }

  // Notes (Notes)
  async createNote(content: string, replyTo?: string, media?: any[]): Promise<SonetNote> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ content, replyTo, media }),
      })

      if (!response.ok) {
        throw new SonetValidationError('Failed to create note', response.status)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to create note', 500)
    }
  }

  async getTimeline(source: string = 'following', cursor?: string): Promise<SonetTimelineResponse> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const params = new URLSearchParams({ source })
      if (cursor) params.append('cursor', cursor)

      const response = await fetch(`${this.baseUrl}/api/v1/timeline?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new SonetError('Failed to fetch timeline', response.status)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to fetch timeline', 500)
    }
  }

  async getNote(id: string): Promise<SonetNote> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/notes/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new SonetError('Note not found', response.status)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to fetch note', 500)
    }
  }

  // Interactions
  async reactToNote(noteId: string, type: 'like' | 'renote' | 'bookmark'): Promise<void> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/notes/${noteId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new SonetError('Failed to react to note', response.status)
      }
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to react to note', 500)
    }
  }

  async removeReaction(noteId: string, type: 'like' | 'renote' | 'bookmark'): Promise<void> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/notes/${noteId}/react`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new SonetError('Failed to remove reaction', response.status)
      }
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to remove reaction', 500)
    }
  }

  // Users
  async followUser(targetUserId: string): Promise<void> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ targetUserId }),
      })

      if (!response.ok) {
        throw new SonetError('Failed to follow user', response.status)
      }
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to follow user', 500)
    }
  }

  async unfollowUser(targetUserId: string): Promise<void> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/follow/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new SonetError('Failed to unfollow user', response.status)
      }
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to unfollow user', 500)
    }
  }

  async getUser(username: string): Promise<SonetUser> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users/${username}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new SonetError('User not found', response.status)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Failed to fetch user', 500)
    }
  }

  // Search
  async search(query: string, type: 'users' | 'notes' | 'all' = 'all'): Promise<SonetSearchResponse> {
    if (!this.accessToken) throw new SonetAuthError('Not authenticated')

    try {
      const params = new URLSearchParams({ q: query, type })
      const response = await fetch(`${this.baseUrl}/api/v1/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new SonetError('Search failed', response.status)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SonetError) throw error
      throw new SonetError('Search failed', 500)
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  getAccessToken(): string | undefined {
    return this.accessToken
  }

  setAccessToken(token: string): void {
    this.accessToken = token
  }
}

// Export singleton instance
export const sonetClient = new SonetClient()

// Export for backward compatibility during migration
export default SonetClient

// Re-export all types and functions for @sonet/api compatibility
export * from '../types/sonet'