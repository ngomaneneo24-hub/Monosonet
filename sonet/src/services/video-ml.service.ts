// Video ML Service - AI-powered predictions for video content
import {VideoFeatureExtractor} from '../ml/video-feature-extractor'
import {UserFeatureExtractor} from '../ml/user-feature-extractor'
import {MLModelClient} from '../ml/ml-model-client'
import {VideoAnalytics} from '../analytics/video-analytics'
import {Logger} from '../utils/logger'

export interface MLPredictionRequest {
  videoId: string
  userId?: string
  features: {
    videoFeatures: VideoFeatures
    userFeatures?: UserFeatures
    contextualFeatures: ContextualFeatures
  }
}

export interface MLPredictionResponse {
  engagementPrediction: number
  retentionPrediction: number
  qualityScore: number
  diversityScore: number
  personalizationScore: number
  rankingFactors: Record<string, number>
  confidence: number
  modelVersion: string
  inferenceTime: number
}

export interface VideoFeatures {
  // Technical features
  duration: number
  resolution: string
  aspectRatio: string
  fileSize: number
  encoding: string
  bitrate: number
  frameRate: number
  
  // Content features
  category: string
  tags: string[]
  language: string
  hasAudio: boolean
  hasSubtitles: boolean
  
  // Visual features
  brightness: number
  contrast: number
  saturation: number
  motionIntensity: number
  sceneComplexity: number
  
  // Audio features
  audioQuality: number
  backgroundMusic: boolean
  speechClarity: number
  
  // Engagement features
  viewCount: number
  likeCount: number
  repostCount: number
  replyCount: number
  shareCount: number
  completionRate: number
  averageWatchTime: number
  
  // Creator features
  creatorFollowers: number
  creatorVerified: boolean
  creatorEngagementRate: number
  creatorContentQuality: number
}

export interface UserFeatures {
  // Demographics
  age: number
  gender: string
  location: string
  language: string
  
  // Interests
  interests: string[]
  contentPreferences: Record<string, number>
  creatorPreferences: Record<string, number>
  
  // Behavior patterns
  watchTimePatterns: {
    timeOfDay: Record<string, number>
    dayOfWeek: Record<string, number>
    sessionLength: number
    videosPerSession: number
  }
  
  // Engagement patterns
  engagementPatterns: {
    likeRate: number
    repostRate: number
    replyRate: number
    shareRate: number
    completionRate: number
  }
  
  // Content preferences
  contentPreferences: {
    preferredCategories: Record<string, number>
    preferredDurations: Record<string, number>
    preferredQualities: Record<string, number>
    preferredCreators: Record<string, number>
  }
  
  // ML model features
  userEmbedding: number[]
  userCluster: number
  userEngagementScore: number
  userRetentionScore: number
}

export interface ContextualFeatures {
  // Temporal features
  timeOfDay: number
  dayOfWeek: number
  month: number
  season: string
  holiday: boolean
  
  // Trending features
  trendingTopics: string[]
  trendingHashtags: string[]
  viralContent: boolean
  
  // Platform features
  platform: string
  appVersion: string
  userAgent: string
  
  // Network features
  connectionType: string
  bandwidth: number
  deviceType: string
}

export class VideoMLService {
  constructor(
    private videoFeatureExtractor: VideoFeatureExtractor,
    private userFeatureExtractor: UserFeatureExtractor,
    private mlModelClient: MLModelClient,
    private videoAnalytics: VideoAnalytics,
    private logger: Logger
  ) {}

  async getPredictions(request: MLPredictionRequest): Promise<MLPredictionResponse> {
    const startTime = Date.now()
    
    try {
      this.logger.info('Getting ML predictions for video', {
        videoId: request.videoId,
        userId: request.userId
      })

      // 1. Extract and normalize features
      const normalizedFeatures = await this.extractAndNormalizeFeatures(request.features)
      
      // 2. Get ML model predictions
      const predictions = await this.getModelPredictions(normalizedFeatures)
      
      // 3. Calculate ranking factors
      const rankingFactors = this.calculateRankingFactors(predictions, request.features)
      
      // 4. Calculate confidence score
      const confidence = this.calculateConfidence(predictions, request.features)
      
      const inferenceTime = Date.now() - startTime
      
      this.logger.info('ML predictions generated successfully', {
        videoId: request.videoId,
        inferenceTime,
        confidence
      })

      return {
        ...predictions,
        rankingFactors,
        confidence,
        modelVersion: '2.0.0',
        inferenceTime
      }

    } catch (error) {
      this.logger.error('Failed to get ML predictions', {
        error: error.message,
        videoId: request.videoId,
        userId: request.userId
      })
      
      // Return fallback predictions
      return this.getFallbackPredictions(request.features)
    }
  }

  private async extractAndNormalizeFeatures(features: any): Promise<number[]> {
    const normalizedFeatures: number[] = []
    
    // Normalize video features
    const videoFeatures = await this.videoFeatureExtractor.extract(features.videoFeatures)
    normalizedFeatures.push(...videoFeatures)
    
    // Normalize user features (if available)
    if (features.userFeatures) {
      const userFeatures = await this.userFeatureExtractor.extract(features.userFeatures)
      normalizedFeatures.push(...userFeatures)
    } else {
      // Add default user features
      const defaultUserFeatures = new Array(64).fill(0)
      normalizedFeatures.push(...defaultUserFeatures)
    }
    
    // Normalize contextual features
    const contextualFeatures = this.normalizeContextualFeatures(features.contextualFeatures)
    normalizedFeatures.push(...contextualFeatures)
    
    return normalizedFeatures
  }

  private async getModelPredictions(features: number[]): Promise<Partial<MLPredictionResponse>> {
    // Get predictions from ML model
    const modelResponse = await this.mlModelClient.predict({
      modelName: 'video-engagement-v2',
      features,
      options: {
        includeConfidence: true,
        includeFeatureImportance: true
      }
    })

    return {
      engagementPrediction: modelResponse.predictions.engagement || 0.5,
      retentionPrediction: modelResponse.predictions.retention || 0.5,
      qualityScore: modelResponse.predictions.quality || 0.5,
      diversityScore: modelResponse.predictions.diversity || 0.5,
      personalizationScore: modelResponse.predictions.personalization || 0.5
    }
  }

  private calculateRankingFactors(predictions: any, features: any): Record<string, number> {
    const rankingFactors: Record<string, number> = {}
    
    // Content quality factors
    rankingFactors.content_quality = predictions.qualityScore || 0.5
    rankingFactors.technical_quality = this.calculateTechnicalQuality(features.videoFeatures)
    rankingFactors.visual_appeal = this.calculateVisualAppeal(features.videoFeatures)
    rankingFactors.audio_quality = this.calculateAudioQuality(features.videoFeatures)
    
    // Engagement factors
    rankingFactors.engagement_potential = predictions.engagementPrediction || 0.5
    rankingFactors.retention_potential = predictions.retentionPrediction || 0.5
    rankingFactors.viral_potential = this.calculateViralPotential(features.videoFeatures)
    
    // Personalization factors
    rankingFactors.personalization_score = predictions.personalizationScore || 0.5
    rankingFactors.interest_match = this.calculateInterestMatch(features)
    rankingFactors.creator_preference = this.calculateCreatorPreference(features)
    
    // Diversity factors
    rankingFactors.content_diversity = predictions.diversityScore || 0.5
    rankingFactors.category_diversity = this.calculateCategoryDiversity(features)
    rankingFactors.creator_diversity = this.calculateCreatorDiversity(features)
    
    // Trending factors
    rankingFactors.trending_score = this.calculateTrendingScore(features)
    rankingFactors.timeliness = this.calculateTimeliness(features.contextualFeatures)
    rankingFactors.seasonal_relevance = this.calculateSeasonalRelevance(features.contextualFeatures)
    
    return rankingFactors
  }

  private calculateTechnicalQuality(videoFeatures: VideoFeatures): number {
    let score = 0
    
    // Resolution quality
    const resolutionScore = this.getResolutionScore(videoFeatures.resolution)
    score += resolutionScore * 0.3
    
    // Bitrate quality
    const bitrateScore = Math.min(1, videoFeatures.bitrate / 5000000) // 5Mbps = 1.0
    score += bitrateScore * 0.2
    
    // Frame rate quality
    const frameRateScore = videoFeatures.frameRate >= 60 ? 1.0 : videoFeatures.frameRate >= 30 ? 0.8 : 0.6
    score += frameRateScore * 0.2
    
    // Encoding quality
    const encodingScore = videoFeatures.encoding === 'h264' ? 0.8 : videoFeatures.encoding === 'h265' ? 1.0 : 0.6
    score += encodingScore * 0.15
    
    // File size efficiency
    const sizeEfficiency = videoFeatures.duration > 0 ? videoFeatures.fileSize / (videoFeatures.duration * 1000) : 0
    const sizeScore = sizeEfficiency < 1000 ? 1.0 : Math.max(0, 1 - (sizeEfficiency - 1000) / 1000)
    score += sizeScore * 0.15
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateVisualAppeal(videoFeatures: VideoFeatures): number {
    let score = 0
    
    // Brightness (prefer well-lit content)
    const brightnessScore = videoFeatures.brightness > 0.3 && videoFeatures.brightness < 0.8 ? 1.0 : 0.5
    score += brightnessScore * 0.25
    
    // Contrast (prefer good contrast)
    const contrastScore = videoFeatures.contrast > 0.4 ? 1.0 : videoFeatures.contrast > 0.2 ? 0.7 : 0.4
    score += contrastScore * 0.25
    
    // Motion intensity (prefer moderate motion)
    const motionScore = videoFeatures.motionIntensity > 0.2 && videoFeatures.motionIntensity < 0.8 ? 1.0 : 0.6
    score += motionScore * 0.25
    
    // Scene complexity (prefer interesting but not overwhelming)
    const complexityScore = videoFeatures.sceneComplexity > 0.3 && videoFeatures.sceneComplexity < 0.8 ? 1.0 : 0.7
    score += complexityScore * 0.25
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateAudioQuality(videoFeatures: VideoFeatures): number {
    let score = 0
    
    // Overall audio quality
    score += (videoFeatures.audioQuality || 0.5) * 0.4
    
    // Speech clarity
    score += (videoFeatures.speechClarity || 0.5) * 0.3
    
    // Background music presence
    score += videoFeatures.backgroundMusic ? 0.3 : 0.1
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateViralPotential(videoFeatures: VideoFeatures): number {
    let score = 0
    
    // Engagement velocity
    const velocity = (videoFeatures.likeCount + videoFeatures.repostCount * 2 + videoFeatures.replyCount * 3) / 
                    Math.max(videoFeatures.viewCount, 1)
    score += Math.min(1, velocity / 0.1) * 0.4
    
    // Completion rate
    score += (videoFeatures.completionRate || 0.5) * 0.3
    
    // Share potential (based on content type)
    const shareableCategories = ['entertainment', 'comedy', 'news', 'sports', 'music']
    const categoryScore = shareableCategories.includes(videoFeatures.category) ? 1.0 : 0.6
    score += categoryScore * 0.3
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateInterestMatch(features: any): number {
    if (!features.userFeatures) return 0.5
    
    const userInterests = features.userFeatures.interests || []
    const videoCategory = features.videoFeatures.category
    
    if (userInterests.includes(videoCategory)) {
      return 1.0
    }
    
    // Check for partial matches
    const partialMatches = userInterests.filter(interest => 
      videoCategory.includes(interest) || interest.includes(videoCategory)
    )
    
    return partialMatches.length > 0 ? 0.7 : 0.3
  }

  private calculateCreatorPreference(features: any): number {
    if (!features.userFeatures) return 0.5
    
    const creatorId = features.videoFeatures.creatorId
    const creatorPreferences = features.userFeatures.contentPreferences?.preferredCreators || {}
    
    return creatorPreferences[creatorId] || 0.5
  }

  private calculateCategoryDiversity(features: any): number {
    // This would be calculated across the entire feed, not for individual videos
    // For now, return a default score
    return 0.5
  }

  private calculateCreatorDiversity(features: any): number {
    // This would be calculated across the entire feed, not for individual videos
    // For now, return a default score
    return 0.5
  }

  private calculateTrendingScore(features: any): number {
    const videoFeatures = features.videoFeatures
    
    // Calculate trending velocity
    const hoursSinceCreation = (Date.now() - new Date(videoFeatures.createdAt).getTime()) / (1000 * 60 * 60)
    const velocity = (videoFeatures.likeCount + videoFeatures.repostCount * 2 + videoFeatures.replyCount * 3) / 
                    Math.max(hoursSinceCreation, 1)
    
    // Normalize to 0-1 range
    return Math.min(1, velocity / 1000)
  }

  private calculateTimeliness(contextualFeatures: ContextualFeatures): number {
    // Prefer recent content
    const timeOfDay = contextualFeatures.timeOfDay
    const currentHour = new Date().getHours()
    const hourDiff = Math.abs(timeOfDay - currentHour)
    
    // Prefer content from similar times of day
    return Math.max(0, 1 - hourDiff / 12)
  }

  private calculateSeasonalRelevance(contextualFeatures: ContextualFeatures): number {
    const month = contextualFeatures.month
    const season = contextualFeatures.season
    
    // Boost seasonal content
    if (season === 'summer' && (month >= 5 && month <= 8)) return 1.2
    if (season === 'winter' && (month >= 11 || month <= 2)) return 1.2
    if (season === 'spring' && (month >= 3 && month <= 5)) return 1.1
    if (season === 'fall' && (month >= 9 && month <= 11)) return 1.1
    
    return 1.0
  }

  private calculateConfidence(predictions: any, features: any): number {
    let confidence = 0.5 // Base confidence
    
    // Higher confidence for videos with more data
    const viewCount = features.videoFeatures.viewCount || 0
    if (viewCount > 1000) confidence += 0.2
    else if (viewCount > 100) confidence += 0.1
    
    // Higher confidence for users with more data
    if (features.userFeatures) {
      const userEngagementScore = features.userFeatures.userEngagementScore || 0
      confidence += userEngagementScore * 0.1
    }
    
    // Higher confidence for high-quality predictions
    const predictionVariance = this.calculatePredictionVariance(predictions)
    confidence += (1 - predictionVariance) * 0.2
    
    return Math.max(0, Math.min(1, confidence))
  }

  private calculatePredictionVariance(predictions: any): number {
    const values = Object.values(predictions).filter(v => typeof v === 'number')
    if (values.length === 0) return 0.5
    
    const mean = values.reduce((sum, val) => sum + (val as number), 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow((val as number) - mean, 2), 0) / values.length
    
    return Math.sqrt(variance)
  }

  private getResolutionScore(resolution: string): number {
    const resolutionMap: Record<string, number> = {
      '4K': 1.0,
      '2K': 0.9,
      '1080p': 0.8,
      '720p': 0.6,
      '480p': 0.4,
      '360p': 0.2
    }
    
    for (const [key, score] of Object.entries(resolutionMap)) {
      if (resolution.includes(key)) return score
    }
    
    return 0.5
  }

  private normalizeContextualFeatures(contextualFeatures: ContextualFeatures): number[] {
    const normalized: number[] = []
    
    // Normalize time features
    normalized.push(contextualFeatures.timeOfDay / 24)
    normalized.push(contextualFeatures.dayOfWeek / 7)
    normalized.push(contextualFeatures.month / 12)
    
    // Normalize boolean features
    normalized.push(contextualFeatures.holiday ? 1 : 0)
    normalized.push(contextualFeatures.viralContent ? 1 : 0)
    
    // Normalize trending features
    normalized.push(Math.min(1, contextualFeatures.trendingTopics.length / 10))
    normalized.push(Math.min(1, contextualFeatures.trendingHashtags.length / 10))
    
    // Normalize network features
    const bandwidthScore = Math.min(1, contextualFeatures.bandwidth / 10000000) // 10Mbps = 1.0
    normalized.push(bandwidthScore)
    
    // Add device type encoding
    const deviceTypes = ['mobile', 'tablet', 'desktop', 'tv']
    const deviceTypeIndex = deviceTypes.indexOf(contextualFeatures.deviceType) || 0
    normalized.push(deviceTypeIndex / deviceTypes.length)
    
    return normalized
  }

  private getFallbackPredictions(features: any): MLPredictionResponse {
    // Return reasonable fallback predictions when ML fails
    return {
      engagementPrediction: 0.5,
      retentionPrediction: 0.5,
      qualityScore: 0.5,
      diversityScore: 0.5,
      personalizationScore: 0.5,
      rankingFactors: {
        content_quality: 0.5,
        engagement_potential: 0.5,
        personalization_score: 0.5
      },
      confidence: 0.3,
      modelVersion: 'fallback',
      inferenceTime: 0
    }
  }
}