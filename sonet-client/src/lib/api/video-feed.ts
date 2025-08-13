// Video Feed API Client - REST integration with C++ gRPC service
import {SONET_API_BASE} from '../constants'

// Types matching the C++ Protobuf definitions
export interface VideoFeedRequest {
  feed_type: 'for_you' | 'trending' | 'following' | 'discover'
  algorithm: 'hybrid' | 'ml_ranking' | 'recency' | 'engagement' | 'personalized'
  pagination: {
    limit: number
    offset: number
    cursor?: string
  }
  categories?: string[]
  exclude_categories?: string[]
  tags?: string[]
  exclude_tags?: string[]
  min_duration_ms?: number
  max_duration_ms?: number
  quality_preference?: 'auto' | '720p' | '1080p' | '4k'
  user_id?: string
  user_context?: {
    age?: number
    location?: string
    language?: string
    device_type?: string
    interests?: string[]
    preferences?: string[]
    is_premium?: boolean
    account_age_days?: number
  }
  context?: {
    session_id?: string
    device_type?: string
    platform?: string
    app_version?: string
    ip_address?: string
    user_agent?: string
    language?: string
    timezone?: string
    screen_width?: number
    screen_height?: number
  }
  ml_settings?: {
    enable_ml_ranking?: boolean
    model_version?: string
    ml_weight?: number
    enabled_features?: string[]
    enable_ab_testing?: boolean
    experiment_id?: string
  }
}

export interface PersonalizedFeedRequest {
  user_id: string
  base_request: VideoFeedRequest
  personalization: {
    enable_ml_ranking: boolean
    ml_weight: number
    user_interests: string[]
    content_preferences: Record<string, number>
    watch_history_weight: number
    social_connections_weight: number
  }
  user_interests: string[]
  user_preferences: string[]
}

export interface VideoFeedResponse {
  items: VideoItem[]
  pagination: {
    total_count: number
    page_count: number
    limit: number
    offset: number
    next_cursor?: string
    prev_cursor?: string
  }
  metadata: {
    feed_type: string
    algorithm: string
    algorithm_version: string
    total_items: number
    filtered_items: number
    generated_at: string
    generation_time_ms: number
    statistics: {
      average_ranking_score: number
      diversity_score: number
      freshness_score: number
      quality_score: number
      top_categories: string[]
      top_creators: string[]
      trending_topics: string[]
    }
  }
  ml_insights: {
    model_version: string
    prediction_accuracy: number
    key_factors: string[]
    personalization: {
      user_preference_score: number
      content_affinity: number
      category_matches: string[]
      creator_matches: string[]
    }
    content_recommendations: string[]
    ml_confidence: number
  }
  performance: {
    request_latency_ms: number
    ml_inference_time_ms: number
    database_query_time_ms: number
    cache_hit_rate: number
    memory_usage_mb: number
    cpu_usage_percent: number
  }
}

export interface VideoItem {
  id: string
  title: string
  description: string
  thumbnail_url: string
  playback_url: string
  video: {
    duration_ms: number
    quality: string
    resolution: string
    aspect_ratio: string
    file_size_bytes: number
    encoding: string
    bitrate_kbps: number
    frame_rate: number
    features: {
      brightness: number
      contrast: number
      saturation: number
      motion_intensity: number
      scene_complexity: number
      audio_quality: number
      background_music: boolean
      speech_clarity: number
      color_vibrancy: number
      visual_appeal: number
    }
  }
  creator: {
    user_id: string
    username: string
    display_name: string
    avatar_url: string
    verified: boolean
    follower_count: number
    following_count: number
    bio?: string
    interests?: string[]
  }
  engagement: {
    view_count: number
    unique_viewers: number
    like_count: number
    renote_count: number
    reply_count: number
    share_count: number
    bookmark_count: number
    average_watch_time_ms: number
    completion_rate: number
    skip_rate: number
    engagement_score: number
    viral_score: number
    retention_score: number
  }
  ml_ranking: {
    ranking_score: number
    algorithm_version: string
    factors: Array<{
      name: string
      weight: number
      value: number
      description: string
    }>
    predictions: {
      engagement_probability: number
      viral_probability: number
      retention_probability: number
      quality_score: number
      relevance_score: number
    }
    personalization: {
      category_matches: string[]
      creator_matches: string[]
      topic_matches: string[]
      interest_matches: string[]
      user_preference_score: number
      content_affinity: number
    }
    confidence: number
  }
  content_flags: string[]
  content_warnings: string[]
  created_at: string
  updated_at: string
}

export interface EngagementEvent {
  user_id: string
  video_id: string
  event_type: 'view' | 'like' | 'renote' | 'reply' | 'share' | 'bookmark' | 'skip' | 'report'
  timestamp: string
  duration_ms?: number
  completion_rate?: number
  context?: string
  request_context?: {
    session_id?: string
    device_type?: string
    platform?: string
    app_version?: string
    ip_address?: string
    user_agent?: string
    language?: string
    timezone?: string
    screen_width?: number
    screen_height?: number
  }
}

export interface EngagementResponse {
  success: boolean
  message: string
  updated_count: number
  timestamp: string
}

export interface FeedInsightsRequest {
  user_id: string
  feed_type: string
  algorithm: string
  time_window_hours: number
}

export interface FeedInsightsResponse {
  user_id: string
  top_categories: string[]
  top_creators: string[]
  top_topics: string[]
  watch_patterns: {
    average_watch_time_ms: number
    completion_rate: number
    active_hours: number[]
    preferred_duration_ms: number
    preferred_quality: string
  }
  engagement_trends: {
    like_rate: number
    renote_rate: number
    reply_rate: number
    share_rate: number
    skip_rate: number
    engagement_score: number
  }
  personalization: {
    discovered_interests: string[]
    content_preferences: string[]
    personalization_effectiveness: number
    recommended_categories: string[]
    recommended_creators: string[]
  }
}

// Video Feed API Implementation
export class VideoFeedAPI {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string = SONET_API_BASE, apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  // Get video feed with ML ranking
  async getVideoFeed(request: VideoFeedRequest): Promise<VideoFeedResponse> {
    const url = `${this.baseUrl}/v1/video-feed`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Video feed request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get personalized feed for specific user
  async getPersonalizedFeed(request: PersonalizedFeedRequest): Promise<VideoFeedResponse> {
    const url = `${this.baseUrl}/v1/video-feed/personalized`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Personalized feed request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Track user engagement events
  async trackEngagement(event: EngagementEvent): Promise<EngagementResponse> {
    const url = `${this.baseUrl}/v1/video-feed/engagement`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      throw new Error(`Engagement tracking failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get feed insights and analytics
  async getFeedInsights(request: FeedInsightsRequest): Promise<FeedInsightsResponse> {
    const url = `${this.baseUrl}/v1/video-feed/insights`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Feed insights request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get trending videos
  async getTrendingVideos(limit: number = 20, timeWindow: string = '24h'): Promise<VideoFeedResponse> {
    const request: VideoFeedRequest = {
      feed_type: 'trending',
      algorithm: 'trending',
      pagination: { limit, offset: 0 }
    }

    return this.getVideoFeed(request)
  }

  // Get videos by category
  async getVideosByCategory(category: string, limit: number = 20): Promise<VideoFeedResponse> {
    const request: VideoFeedRequest = {
      feed_type: 'discover',
      algorithm: 'recency',
      pagination: { limit, offset: 0 },
      categories: [category]
    }

    return this.getVideoFeed(request)
  }

  // Get videos by creator
  async getVideosByCreator(creatorId: string, limit: number = 20): Promise<VideoFeedResponse> {
    const url = `${this.baseUrl}/v1/video-feed/creator/${creatorId}?limit=${limit}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Creator videos request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Search videos
  async searchVideos(query: string, limit: number = 20): Promise<VideoFeedResponse> {
    const url = `${this.baseUrl}/v1/video-feed/search?q=${encodeURIComponent(query)}&limit=${limit}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Video search failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get similar videos
  async getSimilarVideos(videoId: string, limit: number = 20): Promise<VideoFeedResponse> {
    const url = `${this.baseUrl}/v1/video-feed/similar/${videoId}?limit=${limit}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Similar videos request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get video analytics
  async getVideoAnalytics(videoId: string, timeWindow: string = '30d'): Promise<any> {
    const url = `${this.baseUrl}/v1/video-feed/analytics/${videoId}?time_window=${timeWindow}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Video analytics request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Get video recommendations
  async getVideoRecommendations(userId: string, limit: number = 20): Promise<any> {
    const url = `${this.baseUrl}/v1/video-feed/recommendations/${userId}?limit=${limit}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Video recommendations request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Health check
  async healthCheck(): Promise<any> {
    const url = `${this.baseUrl}/v1/video-feed/health`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Track engagement batch
  async trackEngagementBatch(events: EngagementEvent[]): Promise<any> {
    const url = `${this.baseUrl}/v1/video-feed/engagement/batch`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({events})
    })

    if (!response.ok) {
      throw new Error(`Batch engagement tracking failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Private helper methods
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }
}

// Default API instance
export const videoFeedAPI = new VideoFeedAPI()

// Utility functions for common video feed operations
export const createForYouFeedRequest = (
  userId: string,
  limit: number = 20,
  cursor?: string
): VideoFeedRequest => ({
  feed_type: 'for_you',
  algorithm: 'hybrid',
  pagination: { limit, offset: 0, cursor },
  user_id: userId,
  ml_settings: {
    enable_ml_ranking: true,
    model_version: 'latest',
    ml_weight: 0.7,
    enabled_features: ['user_preference', 'content_quality', 'engagement_potential'],
    enable_ab_testing: true
  }
})

export const createTrendingFeedRequest = (
  limit: number = 20,
  timeWindow: string = '24h'
): VideoFeedRequest => ({
  feed_type: 'trending',
  algorithm: 'trending',
  pagination: { limit, offset: 0 },
  ml_settings: {
    enable_ml_ranking: true,
    model_version: 'latest',
    ml_weight: 0.6,
    enabled_features: ['viral_potential', 'engagement_velocity', 'trending_signals']
  }
})

export const createPersonalizedFeedRequest = (
  userId: string,
  interests: string[],
  limit: number = 20
): PersonalizedFeedRequest => ({
  user_id: userId,
  base_request: {
    feed_type: 'for_you',
    algorithm: 'personalized',
    pagination: { limit, offset: 0 },
    user_id: userId
  },
  personalization: {
    enable_ml_ranking: true,
    ml_weight: 0.8,
    user_interests: interests,
    content_preferences: {},
    watch_history_weight: 0.3,
    social_connections_weight: 0.2
  },
  user_interests: interests,
  user_preferences: []
})

// Error handling utilities
export class VideoFeedAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message)
    this.name = 'VideoFeedAPIError'
  }
}

export const usernameVideoFeedError = (error: any): VideoFeedAPIError => {
  if (error instanceof VideoFeedAPIError) {
    return error
  }

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new VideoFeedAPIError('Network error - unable to connect to video feed service', 0)
  }

  return new VideoFeedAPIError(
    error.message || 'Unknown video feed error',
    error.statusCode || 500,
    error.response
  )
}