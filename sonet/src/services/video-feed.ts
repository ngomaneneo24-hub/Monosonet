// Enhanced Video Feed Service - ML-powered video ranking and discovery
import {VideoFeedRepository} from '../repositories/video-feed.repository'
import {VideoMLService} from './video-ml.service'
import {ContentFilteringService} from './content-filtering.service'
import {UserEngagementService} from './user-engagement.service'
import {RealTimeUpdateService} from './real-time-update.service'
import {Logger} from '../utils/logger'

export interface VideoFeedRequest {
  userId?: string
  algorithm: 'VIDEO_ML' | 'VIDEO_TRENDING' | 'VIDEO_PERSONALIZED'
  pagination: {
    limit: number
    cursor?: string
  }
  includeRankingSignals: boolean
  realTimeUpdates: boolean
  contentFilters: {
    mediaType: 'video'
    minDuration: number
    maxDuration: number
    qualityPreference: 'auto' | 'high' | 'medium' | 'low'
    contentCategories?: string[]
    excludeCategories?: string[]
  }
  personalization?: {
    userInterests?: string[]
    contentPreferences?: Record<string, number>
    engagementHistory?: boolean
    diversityBoost?: boolean
    noveltyBoost?: boolean
  }
}

export interface VideoFeedResponse {
  success: boolean
  items: VideoFeedItem[]
  pagination: {
    cursor?: string
    hasMore: boolean
    totalCount: number
  }
  videoStats: {
    totalVideos: number
    averageDuration: number
    qualityDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
  }
  algorithm: {
    name: string
    version: string
    rankingFactors: Record<string, number>
    personalizationSummary: Record<string, any>
  }
}

export interface VideoFeedItem {
  note: any // TODO: Replace with proper SonetNote type
  video: {
    duration: number
    quality: string
    thumbnail: string
    playbackUrl: string
    resolution: string
    aspectRatio: string
    fileSize: number
    encoding: string
  }
  mlScore: number
  rankingFactors: Record<string, number>
  engagementMetrics: {
    viewCount: number
    likeCount: number
    repostCount: number
    replyCount: number
    shareCount: number
    completionRate: number
    averageWatchTime: number
  }
  contentAnalysis: {
    category: string
    tags: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    contentQuality: number
    noveltyScore: number
    diversityScore: number
    trendingScore: number
  }
  personalization: {
    relevanceScore: number
    interestMatch: string[]
    engagementPrediction: number
    retentionPrediction: number
  }
  cursor?: string
}

export class VideoFeedService {
  constructor(
    private videoFeedRepo: VideoFeedRepository,
    private videoMLService: VideoMLService,
    private contentFiltering: ContentFilteringService,
    private userEngagement: UserEngagementService,
    private realTimeUpdates: RealTimeUpdateService,
    private logger: Logger
  ) {}

  async getVideoFeed(request: VideoFeedRequest): Promise<VideoFeedResponse> {
    try {
      this.logger.info('Processing video feed request', {
        userId: request.userId,
        algorithm: request.algorithm,
        filters: request.contentFilters
      })

      // 1. Get base video candidates
      const candidates = await this.getVideoCandidates(request)
      
      // 2. Apply ML ranking and personalization
      const rankedItems = await this.rankVideoContent(candidates, request)
      
      // 3. Apply content filtering and moderation
      const filteredItems = await this.applyContentFiltering(rankedItems, request)
      
      // 4. Apply diversity and novelty boosting
      const optimizedItems = await this.optimizeFeedDiversity(filteredItems, request)
      
      // 5. Generate pagination and stats
      const pagination = this.generatePagination(optimizedItems, request.pagination)
      const videoStats = await this.generateVideoStats(candidates)
      
      // 6. Set up real-time updates if requested
      if (request.realTimeUpdates && request.userId) {
        await this.setupRealTimeUpdates(request.userId, request.algorithm)
      }

      this.logger.info('Video feed generated successfully', {
        itemCount: optimizedItems.length,
        algorithm: request.algorithm,
        userId: request.userId
      })

      return {
        success: true,
        items: optimizedItems,
        pagination,
        videoStats,
        algorithm: {
          name: request.algorithm,
          version: '2.0.0',
          rankingFactors: this.getRankingFactors(optimizedItems),
          personalizationSummary: this.getPersonalizationSummary(optimizedItems, request)
        }
      }

    } catch (error) {
      this.logger.error('Failed to generate video feed', {
        error: error.message,
        userId: request.userId,
        algorithm: request.algorithm
      })
      
      throw new Error(`Failed to generate video feed: ${error.message}`)
    }
  }

  private async getVideoCandidates(request: VideoFeedRequest): Promise<any[]> {
    const {contentFilters, pagination} = request
    
    // Get videos based on content filters
    const candidates = await this.videoFeedRepo.getVideos({
      minDuration: contentFilters.minDuration,
      maxDuration: contentFilters.maxDuration,
      qualityPreference: contentFilters.qualityPreference,
      categories: contentFilters.contentCategories,
      excludeCategories: contentFilters.excludeCategories,
      limit: pagination.limit * 3, // Get more candidates for ranking
      cursor: pagination.cursor
    })

    return candidates
  }

  private async rankVideoContent(candidates: any[], request: VideoFeedRequest): Promise<VideoFeedItem[]> {
    const {userId, algorithm, personalization} = request
    
    // Apply ML ranking based on algorithm
    let rankedItems: VideoFeedItem[] = []
    
    switch (algorithm) {
      case 'VIDEO_ML':
        rankedItems = await this.applyMLRanking(candidates, userId, personalization)
        break
        
      case 'VIDEO_TRENDING':
        rankedItems = await this.applyTrendingRanking(candidates)
        break
        
      case 'VIDEO_PERSONALIZED':
        rankedItems = await this.applyPersonalizedRanking(candidates, userId, personalization)
        break
        
      default:
        rankedItems = await this.applyDefaultRanking(candidates)
    }

    return rankedItems
  }

  private async applyMLRanking(candidates: any[], userId?: string, personalization?: any): Promise<VideoFeedItem[]> {
    const mlRanked = await Promise.all(
      candidates.map(async (candidate) => {
        // Get ML predictions
        const mlPredictions = await this.videoMLService.getPredictions({
          videoId: candidate.id,
          userId,
          features: {
            videoFeatures: candidate.videoFeatures,
            userFeatures: userId ? await this.userEngagement.getUserFeatures(userId) : null,
            contextualFeatures: await this.getContextualFeatures(candidate)
          }
        })

        // Calculate ML score
        const mlScore = this.calculateMLScore(mlPredictions, personalization)
        
        // Transform to VideoFeedItem
        return this.transformToVideoFeedItem(candidate, mlScore, mlPredictions)
      })
    )

    // Sort by ML score
    return mlRanked.sort((a, b) => b.mlScore - a.mlScore)
  }

  private async applyTrendingRanking(candidates: any[]): Promise<VideoFeedItem[]> {
    // Sort by trending metrics (views, engagement, velocity)
    const trendingRanked = candidates.map(candidate => {
      const trendingScore = this.calculateTrendingScore(candidate)
      return this.transformToVideoFeedItem(candidate, trendingScore)
    })

    return trendingRanked.sort((a, b) => b.mlScore - a.mlScore)
  }

  private async applyPersonalizedRanking(candidates: any[], userId: string, personalization?: any): Promise<VideoFeedItem[]> {
    if (!userId) return this.applyDefaultRanking(candidates)

    // Get user's engagement patterns and preferences
    const userProfile = await this.userEngagement.getUserProfile(userId)
    const userInterests = personalization?.userInterests || userProfile.interests
    const contentPreferences = personalization?.contentPreferences || userProfile.contentPreferences

    // Apply personalized ranking
    const personalizedRanked = candidates.map(candidate => {
      const personalizationScore = this.calculatePersonalizationScore(
        candidate,
        userInterests,
        contentPreferences
      )
      return this.transformToVideoFeedItem(candidate, personalizationScore)
    })

    return personalizedRanked.sort((a, b) => b.mlScore - a.mlScore)
  }

  private async applyDefaultRanking(candidates: any[]): Promise<VideoFeedItem[]> {
    // Default ranking: engagement + recency
    const defaultRanked = candidates.map(candidate => {
      const defaultScore = this.calculateDefaultScore(candidate)
      return this.transformToVideoFeedItem(candidate, defaultScore)
    })

    return defaultRanked.sort((a, b) => b.mlScore - a.mlScore)
  }

  private async applyContentFiltering(items: VideoFeedItem[], request: VideoFeedRequest): Promise<VideoFeedItem[]> {
    const {userId, contentFilters} = request
    
    // Apply content filtering and moderation
    const filteredItems = await Promise.all(
      items.map(async (item) => {
        const filteringResult = await this.contentFiltering.filterContent({
          content: item.note,
          video: item.video,
          userId,
          filters: contentFilters
        })

        if (filteringResult.allowed) {
          return {
            ...item,
            contentAnalysis: {
              ...item.contentAnalysis,
              moderation: filteringResult.moderation
            }
          }
        }
        
        return null
      })
    )

    // Remove filtered items
    return filteredItems.filter(item => item !== null) as VideoFeedItem[]
  }

  private async optimizeFeedDiversity(items: VideoFeedItem[], request: VideoFeedRequest): Promise<VideoFeedItem[]> {
    const {personalization} = request
    
    if (!personalization?.diversityBoost && !personalization?.noveltyBoost) {
      return items
    }

    let optimizedItems = [...items]

    // Apply diversity boosting
    if (personalization.diversityBoost) {
      optimizedItems = this.applyDiversityBoosting(optimizedItems)
    }

    // Apply novelty boosting
    if (personalization.noveltyBoost) {
      optimizedItems = this.applyNoveltyBoosting(optimizedItems)
    }

    return optimizedItems
  }

  private applyDiversityBoosting(items: VideoFeedItem[]): VideoFeedItem[] {
    const diversified: VideoFeedItem[] = []
    const usedCategories = new Set<string>()
    const usedCreators = new Set<string>()

    // First pass: add diverse content
    for (const item of items) {
      const category = item.contentAnalysis.category
      const creator = item.note.author.did

      if (!usedCategories.has(category) || !usedCreators.has(creator)) {
        diversified.push(item)
        usedCategories.add(category)
        usedCreators.add(creator)
      }
    }

    // Second pass: fill remaining slots
    for (const item of items) {
      if (diversified.length >= items.length) break
      if (!diversified.includes(item)) {
        diversified.push(item)
      }
    }

    return diversified
  }

  private applyNoveltyBoosting(items: VideoFeedItem[]): VideoFeedItem[] {
    // Boost items with high novelty scores
    return items.sort((a, b) => {
      const noveltyA = a.contentAnalysis.noveltyScore
      const noveltyB = b.contentAnalysis.noveltyScore
      
      if (Math.abs(noveltyA - noveltyB) < 0.1) {
        // If novelty is similar, prefer higher ML score
        return b.mlScore - a.mlScore
      }
      
      return noveltyB - noveltyA
    })
  }

  private calculateMLScore(predictions: any, personalization?: any): number {
    // Weighted combination of ML predictions
    const weights = {
      engagement: 0.4,
      retention: 0.3,
      quality: 0.2,
      diversity: 0.1
    }

    let score = 0
    score += (predictions.engagementPrediction || 0) * weights.engagement
    score += (predictions.retentionPrediction || 0) * weights.retention
    score += (predictions.qualityScore || 0) * weights.quality
    score += (predictions.diversityScore || 0) * weights.diversity

    // Apply personalization adjustments
    if (personalization) {
      const personalizationStrength = personalization.personalizationStrength || 0.8
      score = score * (1 - personalizationStrength) + (predictions.personalizationScore || 0) * personalizationStrength
    }

    return Math.max(0, Math.min(1, score))
  }

  private calculateTrendingScore(candidate: any): number {
    const {viewCount, likeCount, repostCount, replyCount, createdAt} = candidate
    
    // Calculate velocity (engagement per hour)
    const hoursSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    const velocity = (likeCount + repostCount * 2 + replyCount * 3) / Math.max(hoursSinceCreation, 1)
    
    // Normalize to 0-1 range
    return Math.min(1, velocity / 1000)
  }

  private calculatePersonalizationScore(candidate: any, userInterests: string[], contentPreferences: Record<string, number>): number {
    let score = 0
    
    // Interest matching
    const category = candidate.contentAnalysis?.category || 'general'
    if (userInterests.includes(category)) {
      score += 0.3
    }
    
    // Content preference matching
    const preference = contentPreferences[category] || 0.5
    score += preference * 0.4
    
    // Creator preference
    const creator = candidate.note.author.did
    const creatorPreference = contentPreferences[`creator_${creator}`] || 0.5
    score += creatorPreference * 0.3
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateDefaultScore(candidate: any): number {
    const {viewCount, likeCount, repostCount, replyCount, createdAt} = candidate
    
    // Engagement score
    const engagementScore = (likeCount + repostCount * 2 + replyCount * 3) / Math.max(viewCount, 1)
    
    // Recency score (newer content gets slight boost)
    const hoursSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    const recencyScore = Math.max(0, 1 - hoursSinceCreation / 168) // 1 week decay
    
    return (engagementScore * 0.7 + recencyScore * 0.3) / 10 // Normalize
  }

  private transformToVideoFeedItem(candidate: any, score: number, mlPredictions?: any): VideoFeedItem {
    return {
      note: candidate.note,
      video: {
        duration: candidate.video.duration,
        quality: candidate.video.quality,
        thumbnail: candidate.video.thumbnail,
        playbackUrl: candidate.video.playbackUrl,
        resolution: candidate.video.resolution,
        aspectRatio: candidate.video.aspectRatio,
        fileSize: candidate.video.fileSize,
        encoding: candidate.video.encoding
      },
      mlScore: score,
      rankingFactors: mlPredictions?.rankingFactors || {},
      engagementMetrics: {
        viewCount: candidate.viewCount || 0,
        likeCount: candidate.likeCount || 0,
        repostCount: candidate.repostCount || 0,
        replyCount: candidate.replyCount || 0,
        shareCount: candidate.shareCount || 0,
        completionRate: candidate.completionRate || 0,
        averageWatchTime: candidate.averageWatchTime || 0
      },
      contentAnalysis: {
        category: candidate.category || 'general',
        tags: candidate.tags || [],
        sentiment: candidate.sentiment || 'neutral',
        contentQuality: candidate.contentQuality || 0.5,
        noveltyScore: candidate.noveltyScore || 0.5,
        diversityScore: candidate.diversityScore || 0.5,
        trendingScore: candidate.trendingScore || 0.5
      },
      personalization: {
        relevanceScore: candidate.relevanceScore || 0.5,
        interestMatch: candidate.interestMatch || [],
        engagementPrediction: candidate.engagementPrediction || 0.5,
        retentionPrediction: candidate.retentionPrediction || 0.5
      },
      cursor: candidate.cursor
    }
  }

  private generatePagination(items: VideoFeedItem[], requestPagination: any) {
    const {limit} = requestPagination
    const hasMore = items.length > limit
    
    return {
      cursor: hasMore ? items[limit - 1].cursor : undefined,
      hasMore,
      totalCount: items.length
    }
  }

  private async generateVideoStats(candidates: any[]) {
    const totalVideos = candidates.length
    const averageDuration = candidates.reduce((sum, c) => sum + (c.video.duration || 0), 0) / totalVideos
    
    const qualityDistribution = candidates.reduce((acc, c) => {
      const quality = c.video.quality || 'unknown'
      acc[quality] = (acc[quality] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const categoryDistribution = candidates.reduce((acc, c) => {
      const category = c.category || 'general'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalVideos,
      averageDuration: Math.round(averageDuration),
      qualityDistribution,
      categoryDistribution
    }
  }

  private getRankingFactors(items: VideoFeedItem[]): Record<string, number> {
    // Aggregate ranking factors across all items
    const factors: Record<string, number> = {}
    
    items.forEach(item => {
      Object.entries(item.rankingFactors).forEach(([factor, value]) => {
        factors[factor] = (factors[factor] || 0) + (value as number)
      })
    })
    
    // Normalize
    Object.keys(factors).forEach(factor => {
      factors[factor] = factors[factor] / items.length
    })
    
    return factors
  }

  private getPersonalizationSummary(items: VideoFeedItem[], request: VideoFeedRequest): Record<string, any> {
    if (!request.userId || !request.personalization) {
      return {}
    }

    return {
      userInterests: request.personalization.userInterests || [],
      contentPreferences: request.personalization.contentPreferences || {},
      diversityBoost: request.personalization.diversityBoost || false,
      noveltyBoost: request.personalization.noveltyBoost || false,
      personalizationStrength: request.personalization.personalizationStrength || 0.8
    }
  }

  private async getContextualFeatures(candidate: any) {
    // Get contextual features like time of day, trending topics, etc.
    return {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      trendingTopics: await this.getTrendingTopics(),
      seasonalFactors: this.getSeasonalFactors()
    }
  }

  private async getTrendingTopics(): Promise<string[]> {
    // TODO: Implement trending topics detection
    return ['technology', 'entertainment', 'sports']
  }

  private getSeasonalFactors(): Record<string, number> {
    const now = new Date()
    const month = now.getMonth()
    
    return {
      holidaySeason: month >= 10 || month <= 1 ? 1.2 : 1.0,
      summerSeason: month >= 5 && month <= 8 ? 1.1 : 1.0,
      weekend: [0, 6].includes(now.getDay()) ? 1.1 : 1.0
    }
  }

  private async setupRealTimeUpdates(userId: string, algorithm: string) {
    await this.realTimeUpdates.subscribeToUpdates(userId, {
      type: 'video-feed',
      algorithm,
      filters: ['new-videos', 'engagement-updates', 'ranking-changes']
    })
  }
}