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

  // Notes (Posts)
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