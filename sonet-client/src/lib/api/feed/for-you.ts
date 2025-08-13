// For You Feed API Client - ML-powered personalized content
import {SONET_API_BASE} from '#/lib/constants'
import {type SonetFeedSlice, type SonetFeedViewNote} from '#/types/sonet'

export interface ForYouFeedParams {
  limit?: number
  cursor?: string
  interests?: string[]
  preferences?: string[]
  engagement?: boolean
}

export interface ForYouFeedResponse {
  ok: boolean
  items: Array<{
    note: any // TODO: Replace with proper SonetNote type
    ranking: {
      score: number
      factors: Record<string, number>
      personalization: string[]
    }
    feedContext: 'for-you'
    cursor?: string
  }>
  pagination: {
    cursor?: string
    hasMore: boolean
  }
  personalization: {
    algorithm: string
    version: string
    factors: Record<string, any>
  }
}

export interface ForYouFeedAPI {
  getFeed: (params: ForYouFeedParams) => Promise<ForYouFeedResponse>
  trackInteraction: (interaction: any) => Promise<void>
  getPersonalization: () => Promise<any>
}

class ForYouFeedAPIImpl implements ForYouFeedAPI {
  private baseUrl: string
  private authToken?: string

  constructor(baseUrl: string = SONET_API_BASE) {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string) {
    this.authToken = token
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return response.json()
  }

  async getFeed(params: ForYouFeedParams): Promise<ForYouFeedResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.cursor) queryParams.append('cursor', params.cursor)
    if (params.interests?.length) queryParams.append('interests', params.interests.join(','))
    if (params.preferences?.length) queryParams.append('preferences', params.preferences.join(','))
    if (params.engagement) queryParams.append('engagement', 'true')

    const endpoint = `/v1/feeds/for-you?${queryParams.toString()}`
    
    return this.makeRequest<ForYouFeedResponse>(endpoint)
  }

  async trackInteraction(interaction: any): Promise<void> {
    const endpoint = '/v1/feeds/interactions'
    
    await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ interactions: [interaction] })
    })
  }

  async getPersonalization(): Promise<any> {
    // TODO: Get actual user ID from auth context
    const userId = 'current-user'
    const endpoint = `/v1/feeds/personalization/${userId}`
    
    return this.makeRequest(endpoint)
  }
}

// Export singleton instance
export const forYouFeedAPI = new ForYouFeedAPIImpl()

// Export for testing
export {ForYouFeedAPIImpl}