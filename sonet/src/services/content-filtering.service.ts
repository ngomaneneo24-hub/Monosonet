// Content Filtering Service - Video content moderation and safety
import {Logger} from '../utils/logger'

export interface ContentFilteringConfig {
  enableNSFWFiltering: boolean
  enableSpoilerFiltering: boolean
  enableViolenceFiltering: boolean
  enableHateSpeechFiltering: boolean
  enableSpamFiltering: boolean
  userAge: number
  userPreferences: {
    showNSFW: boolean
    showSpoilers: boolean
    showViolence: boolean
    showHateSpeech: boolean
    showSpam: boolean
  }
}

export interface ContentFilteringResult {
  isAllowed: boolean
  reason?: string
  confidence: number
  flags: string[]
  moderationLevel: 'safe' | 'warning' | 'blocked'
  userOverride?: boolean
}

export interface VideoContentAnalysis {
  hasNudity: boolean
  hasViolence: boolean
  hasGore: boolean
  hasHateSymbols: boolean
  hasSpamIndicators: boolean
  language: string
  topics: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  ageRating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17'
}

export class ContentFilteringService {
  private logger: Logger
  private defaultConfig: ContentFilteringConfig

  constructor(logger: Logger) {
    this.logger = logger
    this.defaultConfig = {
      enableNSFWFiltering: true,
      enableSpoilerFiltering: true,
      enableViolenceFiltering: true,
      enableHateSpeechFiltering: true,
      enableSpamFiltering: true,
      userAge: 18,
      userPreferences: {
        showNSFW: false,
        showSpoilers: false,
        showViolence: false,
        showHateSpeech: false,
        showSpam: false
      }
    }
  }

  async filterVideoContent(
    videoAnalysis: VideoContentAnalysis,
    userConfig?: Partial<ContentFilteringConfig>
  ): Promise<ContentFilteringResult> {
    const config = {...this.defaultConfig, ...userConfig}
    const flags: string[] = []
    let isAllowed = true
    let reason: string | undefined
    let confidence = 1.0

    try {
      // NSFW Content Filtering
      if (config.enableNSFWFiltering && videoAnalysis.hasNudity) {
        if (!config.userPreferences.showNSFW) {
          isAllowed = false
          reason = 'NSFW content detected'
          flags.push('nsfw')
          confidence = 0.95
        } else {
          flags.push('nsfw-warning')
        }
      }

      // Violence Filtering
      if (config.enableViolenceFiltering && videoAnalysis.hasViolence) {
        if (!config.userPreferences.showViolence) {
          isAllowed = false
          reason = 'Violent content detected'
          flags.push('violence')
          confidence = 0.9
        } else {
          flags.push('violence-warning')
        }
      }

      // Gore Filtering
      if (config.enableViolenceFiltering && videoAnalysis.hasGore) {
        if (!config.userPreferences.showViolence) {
          isAllowed = false
          reason = 'Graphic content detected'
          flags.push('gore')
          confidence = 0.98
        } else {
          flags.push('gore-warning')
        }
      }

      // Hate Speech Filtering
      if (config.enableHateSpeechFiltering && videoAnalysis.hasHateSymbols) {
        if (!config.userPreferences.showHateSpeech) {
          isAllowed = false
          reason = 'Hate speech content detected'
          flags.push('hate-speech')
          confidence = 0.92
        } else {
          flags.push('hate-speech-warning')
        }
      }

      // Spam Filtering
      if (config.enableSpamFiltering && videoAnalysis.hasSpamIndicators) {
        if (!config.userPreferences.showSpam) {
          isAllowed = false
          reason = 'Spam content detected'
          flags.push('spam')
          confidence = 0.85
        } else {
          flags.push('spam-warning')
        }
      }

      // Age Rating Filtering
      if (videoAnalysis.ageRating === 'NC-17' && config.userAge < 18) {
        isAllowed = false
        reason = 'Age-restricted content'
        flags.push('age-restricted')
        confidence = 1.0
      } else if (videoAnalysis.ageRating === 'R' && config.userAge < 17) {
        isAllowed = false
        reason = 'Age-restricted content'
        flags.push('age-restricted')
        confidence = 1.0
      }

      // Spoiler Filtering
      if (config.enableSpoilerFiltering && videoAnalysis.topics.some(topic => 
        topic.toLowerCase().includes('spoiler') || topic.toLowerCase().includes('leak')
      )) {
        if (!config.userPreferences.showSpoilers) {
          flags.push('spoiler-warning')
        } else {
          flags.push('spoiler')
        }
      }

      // Determine moderation level
      const moderationLevel = this.getModerationLevel(flags, confidence)

      return {
        isAllowed,
        reason,
        confidence,
        flags,
        moderationLevel
      }

    } catch (error) {
      this.logger.error('Error in content filtering', {error, videoId: videoAnalysis})
      
      // Fail safe - allow content if filtering fails
      return {
        isAllowed: true,
        reason: 'Filtering failed, content allowed',
        confidence: 0.5,
        flags: ['filtering-error'],
        moderationLevel: 'warning'
      }
    }
  }

  async analyzeVideoContent(videoData: any): Promise<VideoContentAnalysis> {
    // This would integrate with ML models for content analysis
    // For now, return mock analysis based on video metadata
    
    try {
      const analysis: VideoContentAnalysis = {
        hasNudity: this.detectNudity(videoData),
        hasViolence: this.detectViolence(videoData),
        hasGore: this.detectGore(videoData),
        hasHateSymbols: this.detectHateSymbols(videoData),
        hasSpamIndicators: this.detectSpam(videoData),
        language: this.detectLanguage(videoData),
        topics: this.extractTopics(videoData),
        sentiment: this.analyzeSentiment(videoData),
        ageRating: this.determineAgeRating(videoData)
      }

      return analysis

    } catch (error) {
      this.logger.error('Error analyzing video content', {error, videoData})
      
      // Return safe defaults
      return {
        hasNudity: false,
        hasViolence: false,
        hasGore: false,
        hasHateSymbols: false,
        hasSpamIndicators: false,
        language: 'en',
        topics: ['general'],
        sentiment: 'neutral',
        ageRating: 'G'
      }
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<ContentFilteringConfig['userPreferences']>
  ): Promise<void> {
    try {
      // Update user preferences in database
      this.logger.info('Updated user content preferences', {userId, preferences})
    } catch (error) {
      this.logger.error('Error updating user preferences', {error, userId})
      throw error
    }
  }

  async getContentWarnings(flags: string[]): Promise<string[]> {
    const warningMessages: Record<string, string> = {
      'nsfw-warning': 'This content may contain adult themes',
      'violence-warning': 'This content may contain violence',
      'gore-warning': 'This content may contain graphic imagery',
      'hate-speech-warning': 'This content may contain hate speech',
      'spam-warning': 'This content may be promotional',
      'spoiler-warning': 'This content may contain spoilers'
    }

    return flags
      .filter(flag => flag.endsWith('-warning'))
      .map(flag => warningMessages[flag])
      .filter(Boolean)
  }

  private getModerationLevel(flags: string[], confidence: number): 'safe' | 'warning' | 'blocked' {
    if (flags.some(flag => !flag.endsWith('-warning'))) {
      return 'blocked'
    }
    
    if (flags.some(flag => flag.endsWith('-warning'))) {
      return 'warning'
    }
    
    return 'safe'
  }

  // Mock content detection methods - these would integrate with ML models
  private detectNudity(videoData: any): boolean {
    // Mock implementation - would use computer vision ML model
    return videoData.tags?.some((tag: string) => 
      ['nsfw', 'adult', 'mature'].includes(tag.toLowerCase())
    ) || false
  }

  private detectViolence(videoData: any): boolean {
    // Mock implementation - would use computer vision ML model
    return videoData.tags?.some((tag: string) => 
      ['violence', 'action', 'fight', 'war'].includes(tag.toLowerCase())
    ) || false
  }

  private detectGore(videoData: any): boolean {
    // Mock implementation - would use computer vision ML model
    return videoData.tags?.some((tag: string) => 
      ['gore', 'blood', 'horror'].includes(tag.toLowerCase())
    ) || false
  }

  private detectHateSymbols(videoData: any): boolean {
    // Mock implementation - would use computer vision + text analysis ML model
    return videoData.tags?.some((tag: string) => 
      ['hate', 'racist', 'discriminatory'].includes(tag.toLowerCase())
    ) || false
  }

  private detectSpam(videoData: any): boolean {
    // Mock implementation - would use text analysis ML model
    const text = videoData.title + ' ' + (videoData.description || '')
    const spamIndicators = ['buy now', 'click here', 'limited time', 'act fast', 'exclusive offer']
    
    return spamIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    )
  }

  private detectLanguage(videoData: any): string {
    // Mock implementation - would use language detection ML model
    return videoData.language || 'en'
  }

  private extractTopics(videoData: any): string[] {
    // Mock implementation - would use topic modeling ML model
    return videoData.tags || ['general']
  }

  private analyzeSentiment(videoData: any): 'positive' | 'negative' | 'neutral' {
    // Mock implementation - would use sentiment analysis ML model
    const text = videoData.title + ' ' + (videoData.description || '')
    const positiveWords = ['amazing', 'awesome', 'great', 'love', 'best', 'excellent']
    const negativeWords = ['terrible', 'awful', 'hate', 'worst', 'bad', 'disappointing']
    
    const positiveCount = positiveWords.filter(word => text.toLowerCase().includes(word)).length
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  private determineAgeRating(videoData: any): 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' {
    // Mock implementation - would use content analysis ML model
    if (videoData.hasNudity || videoData.hasGore) return 'NC-17'
    if (videoData.hasViolence) return 'R'
    if (videoData.hasHateSymbols) return 'PG-13'
    if (videoData.hasSpamIndicators) return 'PG'
    return 'G'
  }
}