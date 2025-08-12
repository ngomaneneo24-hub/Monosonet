// User Engagement Service - Track user behavior and engagement patterns
import {Logger} from '../utils/logger'

export interface UserEngagementEvent {
  userId: string
  videoId: string
  eventType: 'view' | 'like' | 'repost' | 'reply' | 'share' | 'bookmark' | 'skip' | 'report'
  timestamp: Date
  duration?: number // For view events
  completionRate?: number // For view events
  context?: {
    feedType: string
    position: number
    algorithm: string
    sessionId: string
  }
}

export interface UserEngagementProfile {
  userId: string
  interests: string[]
  contentPreferences: {
    categories: Record<string, number> // category -> preference score (0-1)
    creators: Record<string, number> // creatorId -> preference score (0-1)
    topics: Record<string, number> // topic -> preference score (0-1)
    videoTypes: Record<string, number> // video type -> preference score (0-1)
  }
  engagementPatterns: {
    averageWatchTime: number
    completionRate: number
    skipRate: number
    likeRate: number
    repostRate: number
    replyRate: number
    shareRate: number
    activeHours: number[]
    preferredDuration: number
    preferredQuality: string
  }
  demographics: {
    age?: number
    location?: string
    language?: string
    deviceType?: string
  }
  lastActive: Date
  totalEngagement: number
}

export interface EngagementMetrics {
  viewCount: number
  uniqueViewers: number
  likeCount: number
  repostCount: number
  replyCount: number
  shareCount: number
  bookmarkCount: number
  averageWatchTime: number
  completionRate: number
  skipRate: number
  engagementScore: number
  viralScore: number
  retentionScore: number
}

export class UserEngagementService {
  private logger: Logger
  private engagementCache: Map<string, UserEngagementProfile>
  private metricsCache: Map<string, EngagementMetrics>

  constructor(logger: Logger) {
    this.logger = logger
    this.engagementCache = new Map()
    this.metricsCache = new Map()
  }

  async trackEngagementEvent(event: UserEngagementEvent): Promise<void> {
    try {
      this.logger.info('Tracking engagement event', {event})

      // Store event in database
      await this.storeEngagementEvent(event)

      // Update user engagement profile
      await this.updateUserEngagementProfile(event)

      // Update video engagement metrics
      await this.updateVideoEngagementMetrics(event)

      // Clear relevant caches
      this.clearEngagementCaches(event.userId, event.videoId)

    } catch (error) {
      this.logger.error('Error tracking engagement event', {error, event})
      throw error
    }
  }

  async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile | null> {
    try {
      // Check cache first
      if (this.engagementCache.has(userId)) {
        return this.engagementCache.get(userId)!
      }

      // Fetch from database
      const profile = await this.fetchUserEngagementProfile(userId)
      
      if (profile) {
        // Cache the profile
        this.engagementCache.set(userId, profile)
      }

      return profile

    } catch (error) {
      this.logger.error('Error fetching user engagement profile', {error, userId})
      return null
    }
  }

  async getVideoEngagementMetrics(videoId: string): Promise<EngagementMetrics | null> {
    try {
      // Check cache first
      if (this.metricsCache.has(videoId)) {
        return this.metricsCache.get(videoId)!
      }

      // Fetch from database
      const metrics = await this.fetchVideoEngagementMetrics(videoId)
      
      if (metrics) {
        // Cache the metrics
        this.metricsCache.set(videoId, metrics)
      }

      return metrics

    } catch (error) {
      this.logger.error('Error fetching video engagement metrics', {error, videoId})
      return null
    }
  }

  async calculatePersonalizationScore(
    userId: string,
    videoData: any
  ): Promise<number> {
    try {
      const userProfile = await this.getUserEngagementProfile(userId)
      if (!userProfile) return 0.5

      let score = 0.5 // Base score
      let factors = 0

      // Category preference
      if (videoData.category && userProfile.contentPreferences.categories[videoData.category]) {
        score += userProfile.contentPreferences.categories[videoData.category] * 0.3
        factors++
      }

      // Creator preference
      if (videoData.creatorId && userProfile.contentPreferences.creators[videoData.creatorId]) {
        score += userProfile.contentPreferences.creators[videoData.creatorId] * 0.25
        factors++
      }

      // Topic preferences
      if (videoData.tags) {
        const topicScore = videoData.tags.reduce((sum: number, tag: string) => {
          return sum + (userProfile.contentPreferences.topics[tag] || 0)
        }, 0) / videoData.tags.length
        
        if (topicScore > 0) {
          score += topicScore * 0.2
          factors++
        }
      }

      // Video type preference
      if (videoData.videoFeatures) {
        const videoType = this.determineVideoType(videoData.videoFeatures)
        if (userProfile.contentPreferences.videoTypes[videoType]) {
          score += userProfile.contentPreferences.videoTypes[videoType] * 0.15
          factors++
        }
      }

      // Duration preference
      if (videoData.video?.duration) {
        const durationScore = this.calculateDurationPreference(
          videoData.video.duration,
          userProfile.engagementPatterns.preferredDuration
        )
        score += durationScore * 0.1
        factors++
      }

      // Normalize score if we have factors
      if (factors > 0) {
        score = Math.min(1.0, Math.max(0.0, score))
      }

      return score

    } catch (error) {
      this.logger.error('Error calculating personalization score', {error, userId, videoId: videoData.id})
      return 0.5
    }
  }

  async updateUserInterests(userId: string, videoId: string, engagement: string): Promise<void> {
    try {
      const profile = await this.getUserEngagementProfile(userId)
      if (!profile) return

      // Get video data to extract interests
      const videoData = await this.getVideoData(videoId)
      if (!videoData) return

      // Update interests based on engagement
      const interestBoost = this.getInterestBoost(engagement)
      
      if (videoData.category) {
        profile.contentPreferences.categories[videoData.category] = 
          (profile.contentPreferences.categories[videoData.category] || 0) + interestBoost
      }

      if (videoData.creatorId) {
        profile.contentPreferences.creators[videoData.creatorId] = 
          (profile.contentPreferences.creators[videoData.creatorId] || 0) + interestBoost
      }

      if (videoData.tags) {
        videoData.tags.forEach((tag: string) => {
          profile.contentPreferences.topics[tag] = 
            (profile.contentPreferences.topics[tag] || 0) + interestBoost
        })
      }

      // Normalize scores to prevent overflow
      this.normalizePreferences(profile.contentPreferences)

      // Update in database
      await this.updateUserEngagementProfileInDB(userId, profile)

      // Clear cache
      this.engagementCache.delete(userId)

    } catch (error) {
      this.logger.error('Error updating user interests', {error, userId, videoId})
    }
  }

  async getEngagementInsights(userId: string): Promise<{
    topCategories: Array<{category: string, score: number}>
    topCreators: Array<{creatorId: string, score: number}>
    topTopics: Array<{topic: string, score: number}>
    watchPatterns: {
      averageWatchTime: number
      completionRate: number
      activeHours: number[]
    }
  }> {
    try {
      const profile = await this.getUserEngagementProfile(userId)
      if (!profile) {
        return {
          topCategories: [],
          topCreators: [],
          topTopics: [],
          watchPatterns: {
            averageWatchTime: 0,
            completionRate: 0,
            activeHours: []
          }
        }
      }

      const topCategories = Object.entries(profile.contentPreferences.categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, score]) => ({category, score}))

      const topCreators = Object.entries(profile.contentPreferences.creators)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([creatorId, score]) => ({creatorId, score}))

      const topTopics = Object.entries(profile.contentPreferences.topics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, score]) => ({topic, score}))

      return {
        topCategories,
        topCreators,
        topTopics,
        watchPatterns: {
          averageWatchTime: profile.engagementPatterns.averageWatchTime,
          completionRate: profile.engagementPatterns.completionRate,
          activeHours: profile.engagementPatterns.activeHours
        }
      }

    } catch (error) {
      this.logger.error('Error getting engagement insights', {error, userId})
      return {
        topCategories: [],
        topCreators: [],
        topTopics: [],
        watchPatterns: {
          averageWatchTime: 0,
          completionRate: 0,
          activeHours: []
        }
      }
    }
  }

  // Private helper methods
  private async storeEngagementEvent(event: UserEngagementEvent): Promise<void> {
    // Store in database - implementation would depend on your DB choice
    this.logger.debug('Storing engagement event', {event})
  }

  private async updateUserEngagementProfile(event: UserEngagementEvent): Promise<void> {
    // Update user profile based on engagement - implementation would depend on your DB choice
    this.logger.debug('Updating user engagement profile', {event})
  }

  private async updateVideoEngagementMetrics(event: UserEngagementEvent): Promise<void> {
    // Update video metrics based on engagement - implementation would depend on your DB choice
    this.logger.debug('Updating video engagement metrics', {event})
  }

  private async fetchUserEngagementProfile(userId: string): Promise<UserEngagementProfile | null> {
    // Fetch from database - implementation would depend on your DB choice
    // For now, return mock data
    return {
      userId,
      interests: ['technology', 'gaming', 'music'],
      contentPreferences: {
        categories: {
          'technology': 0.8,
          'gaming': 0.9,
          'music': 0.7,
          'sports': 0.3
        },
        creators: {
          'tech_creator': 0.9,
          'gaming_creator': 0.8
        },
        topics: {
          'programming': 0.9,
          'esports': 0.8,
          'rock': 0.7
        },
        videoTypes: {
          'tutorial': 0.9,
          'gameplay': 0.8,
          'music_video': 0.7
        }
      },
      engagementPatterns: {
        averageWatchTime: 45000, // 45 seconds
        completionRate: 0.75,
        skipRate: 0.15,
        likeRate: 0.25,
        repostRate: 0.05,
        replyRate: 0.08,
        shareRate: 0.03,
        activeHours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
        preferredDuration: 60000, // 1 minute
        preferredQuality: '720p'
      },
      demographics: {
        age: 25,
        location: 'US',
        language: 'en',
        deviceType: 'mobile'
      },
      lastActive: new Date(),
      totalEngagement: 150
    }
  }

  private async fetchVideoEngagementMetrics(videoId: string): Promise<EngagementMetrics | null> {
    // Fetch from database - implementation would depend on your DB choice
    // For now, return mock data
    return {
      viewCount: 1250,
      uniqueViewers: 980,
      likeCount: 89,
      repostCount: 12,
      replyCount: 23,
      shareCount: 8,
      bookmarkCount: 15,
      averageWatchTime: 42000, // 42 seconds
      completionRate: 0.68,
      skipRate: 0.22,
      engagementScore: 0.72,
      viralScore: 0.45,
      retentionScore: 0.68
    }
  }

  private clearEngagementCaches(userId: string, videoId: string): void {
    this.engagementCache.delete(userId)
    this.metricsCache.delete(videoId)
  }

  private determineVideoType(videoFeatures: any): string {
    if (videoFeatures.motionIntensity > 0.7) return 'action'
    if (videoFeatures.audioQuality > 0.8 && videoFeatures.speechClarity > 0.7) return 'tutorial'
    if (videoFeatures.backgroundMusic) return 'music_video'
    if (videoFeatures.sceneComplexity > 0.6) return 'cinematic'
    return 'general'
  }

  private calculateDurationPreference(videoDuration: number, preferredDuration: number): number {
    const difference = Math.abs(videoDuration - preferredDuration)
    const maxDifference = preferredDuration * 2
    
    return Math.max(0, 1 - (difference / maxDifference))
  }

  private getInterestBoost(engagement: string): number {
    const boostMap: Record<string, number> = {
      'view': 0.01,
      'like': 0.05,
      'repost': 0.1,
      'reply': 0.08,
      'share': 0.12,
      'bookmark': 0.15,
      'skip': -0.02,
      'report': -0.1
    }
    
    return boostMap[engagement] || 0
  }

  private normalizePreferences(preferences: Record<string, number>): void {
    const maxScore = Math.max(...Object.values(preferences))
    if (maxScore > 1.0) {
      Object.keys(preferences).forEach(key => {
        preferences[key] = preferences[key] / maxScore
      })
    }
  }

  private async getVideoData(videoId: string): Promise<any> {
    // Fetch video data from database - implementation would depend on your DB choice
    // For now, return mock data
    return {
      id: videoId,
      category: 'technology',
      creatorId: 'tech_creator',
      tags: ['programming', 'tutorial', 'web-development'],
      video: {
        duration: 60000
      },
      videoFeatures: {
        motionIntensity: 0.3,
        audioQuality: 0.9,
        speechClarity: 0.95,
        backgroundMusic: false,
        sceneComplexity: 0.4
      }
    }
  }

  private async updateUserEngagementProfileInDB(userId: string, profile: UserEngagementProfile): Promise<void> {
    // Update in database - implementation would depend on your DB choice
    this.logger.debug('Updating user engagement profile in DB', {userId})
  }
}