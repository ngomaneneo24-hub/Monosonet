// Video Feed Repository - Data access layer for video content
import {Database} from '../database/database'
import {Cache} from '../cache/cache'
import {Logger} from '../utils/logger'

export interface VideoQueryParams {
  minDuration?: number
  maxDuration?: number
  qualityPreference?: 'auto' | 'high' | 'medium' | 'low'
  categories?: string[]
  excludeCategories?: string[]
  limit: number
  cursor?: string
  userId?: string
  algorithm?: string
}

export interface VideoCandidate {
  id: string
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
    bitrate: number
    frameRate: number
    createdAt: string
  }
  videoFeatures: {
    brightness: number
    contrast: number
    saturation: number
    motionIntensity: number
    sceneComplexity: number
    audioQuality: number
    backgroundMusic: boolean
    speechClarity: number
  }
  category: string
  tags: string[]
  language: string
  creatorId: string
  viewCount: number
  likeCount: number
  repostCount: number
  replyCount: number
  shareCount: number
  completionRate: number
  averageWatchTime: number
  cursor: string
}

export class VideoFeedRepository {
  constructor(
    private database: Database,
    private cache: Cache,
    private logger: Logger
  ) {}

  async getVideos(params: VideoQueryParams): Promise<VideoCandidate[]> {
    const cacheKey = this.generateCacheKey(params)
    
    try {
      // Try to get from cache first
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        this.logger.debug('Video feed retrieved from cache', {cacheKey})
        return cached
      }

      // Get from database
      const videos = await this.queryVideosFromDatabase(params)
      
      // Cache the results
      await this.cache.set(cacheKey, videos, 300) // 5 minutes cache
      
      this.logger.info('Video feed retrieved from database', {
        count: videos.length,
        params
      })
      
      return videos

    } catch (error) {
      this.logger.error('Failed to get videos from repository', {
        error: error.message,
        params
      })
      
      // Return fallback data
      return this.getFallbackVideos(params.limit)
    }
  }

  async getVideoById(videoId: string): Promise<VideoCandidate | null> {
    const cacheKey = `video:${videoId}`
    
    try {
      // Try cache first
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Get from database
      const video = await this.database.query(
        'SELECT * FROM videos WHERE id = ?',
        [videoId]
      )

      if (video && video.length > 0) {
        const videoData = this.mapDatabaseRowToVideo(video[0])
        
        // Cache the video
        await this.cache.set(cacheKey, videoData, 1800) // 30 minutes cache
        
        return videoData
      }

      return null

    } catch (error) {
      this.logger.error('Failed to get video by ID', {
        error: error.message,
        videoId
      })
      
      return null
    }
  }

  async getVideosByCreator(creatorId: string, limit: number = 20): Promise<VideoCandidate[]> {
    const cacheKey = `creator_videos:${creatorId}:${limit}`
    
    try {
      // Try cache first
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Get from database
      const videos = await this.database.query(
        `SELECT * FROM videos 
         WHERE creator_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [creatorId, limit]
      )

      const videoData = videos.map(row => this.mapDatabaseRowToVideo(row))
      
      // Cache the results
      await this.cache.set(cacheKey, videoData, 600) // 10 minutes cache
      
      return videoData

    } catch (error) {
      this.logger.error('Failed to get videos by creator', {
        error: error.message,
        creatorId
      })
      
      return []
    }
  }

  async getTrendingVideos(limit: number = 20, timeWindow: string = '24h'): Promise<VideoCandidate[]> {
    const cacheKey = `trending_videos:${timeWindow}:${limit}`
    
    try {
      // Try cache first
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Calculate time window
      const timeWindowMs = this.getTimeWindowMs(timeWindow)
      const cutoffTime = new Date(Date.now() - timeWindowMs)

      // Get trending videos based on engagement velocity
      const videos = await this.database.query(
        `SELECT v.*, 
                (v.like_count + v.repost_count * 2 + v.reply_count * 3) / 
                GREATEST(TIMESTAMPDIFF(HOUR, v.created_at, NOW()), 1) as velocity
         FROM videos v
         WHERE v.created_at > ?
         AND v.view_count > 10
         ORDER BY velocity DESC, v.view_count DESC
         LIMIT ?`,
        [cutoffTime, limit]
      )

      const videoData = videos.map(row => this.mapDatabaseRowToVideo(row))
      
      // Cache the results
      await this.cache.set(cacheKey, videoData, 300) // 5 minutes cache for trending
      
      return videoData

    } catch (error) {
      this.logger.error('Failed to get trending videos', {
        error: error.message,
        timeWindow
      })
      
      return []
    }
  }

  async getVideosByCategory(category: string, limit: number = 20): Promise<VideoCandidate[]> {
    const cacheKey = `category_videos:${category}:${limit}`
    
    try {
      // Try cache first
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Get from database
      const videos = await this.database.query(
        `SELECT * FROM videos 
         WHERE category = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [category, limit]
      )

      const videoData = videos.map(row => this.mapDatabaseRowToVideo(row))
      
      // Cache the results
      await this.cache.set(cacheKey, videoData, 900) // 15 minutes cache
      
      return videoData

    } catch (error) {
      this.logger.error('Failed to get videos by category', {
        error: error.message,
        category
      })
      
      return []
    }
  }

  async updateVideoMetrics(videoId: string, metrics: Partial<VideoCandidate>): Promise<void> {
    try {
      // Update database
      await this.database.query(
        `UPDATE videos 
         SET view_count = ?, like_count = ?, repost_count = ?, reply_count = ?, 
             share_count = ?, completion_rate = ?, average_watch_time = ?
         WHERE id = ?`,
        [
          metrics.viewCount || 0,
          metrics.likeCount || 0,
          metrics.repostCount || 0,
          metrics.replyCount || 0,
          metrics.shareCount || 0,
          metrics.completionRate || 0,
          metrics.averageWatchTime || 0,
          videoId
        ]
      )

      // Invalidate cache
      await this.cache.delete(`video:${videoId}`)
      
      // Invalidate related caches
      await this.invalidateRelatedCaches(videoId)

      this.logger.debug('Video metrics updated', {videoId, metrics})

    } catch (error) {
      this.logger.error('Failed to update video metrics', {
        error: error.message,
        videoId
      })
    }
  }

  async searchVideos(query: string, limit: number = 20): Promise<VideoCandidate[]> {
    const cacheKey = `search_videos:${query}:${limit}`
    
    try {
      // Try cache first
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Search in database
      const videos = await this.database.query(
        `SELECT * FROM videos 
         WHERE MATCH(title, description, tags) AGAINST(? IN BOOLEAN MODE)
         OR title LIKE ? OR description LIKE ?
         ORDER BY created_at DESC 
         LIMIT ?`,
        [query, `%${query}%`, `%${query}%`, limit]
      )

      const videoData = videos.map(row => this.mapDatabaseRowToVideo(row))
      
      // Cache the results
      await this.cache.set(cacheKey, videoData, 600) // 10 minutes cache
      
      return videoData

    } catch (error) {
      this.logger.error('Failed to search videos', {
        error: error.message,
        query
      })
      
      return []
    }
  }

  private async queryVideosFromDatabase(params: VideoQueryParams): Promise<VideoCandidate[]> {
    let query = `
      SELECT v.*, 
             COALESCE(vf.brightness, 0.5) as brightness,
             COALESCE(vf.contrast, 0.5) as contrast,
             COALESCE(vf.saturation, 0.5) as saturation,
             COALESCE(vf.motion_intensity, 0.5) as motion_intensity,
             COALESCE(vf.scene_complexity, 0.5) as scene_complexity,
             COALESCE(vf.audio_quality, 0.5) as audio_quality,
             COALESCE(vf.background_music, false) as background_music,
             COALESCE(vf.speech_clarity, 0.5) as speech_clarity
      FROM videos v
      LEFT JOIN video_features vf ON v.id = vf.video_id
      WHERE 1=1
    `
    
    const queryParams: any[] = []

    // Apply filters
    if (params.minDuration !== undefined) {
      query += ' AND v.duration >= ?'
      queryParams.push(params.minDuration)
    }

    if (params.maxDuration !== undefined) {
      query += ' AND v.duration <= ?'
      queryParams.push(params.maxDuration)
    }

    if (params.qualityPreference && params.qualityPreference !== 'auto') {
      const qualityMap = {
        'high': ['4K', '2K', '1080p'],
        'medium': ['1080p', '720p'],
        'low': ['720p', '480p', '360p']
      }
      
      const qualities = qualityMap[params.qualityPreference] || []
      if (qualities.length > 0) {
        query += ` AND v.resolution IN (${qualities.map(() => '?').join(',')})`
        queryParams.push(...qualities)
      }
    }

    if (params.categories && params.categories.length > 0) {
      query += ` AND v.category IN (${params.categories.map(() => '?').join(',')})`
      queryParams.push(...params.categories)
    }

    if (params.excludeCategories && params.excludeCategories.length > 0) {
      query += ` AND v.category NOT IN (${params.excludeCategories.map(() => '?').join(',')})`
      queryParams.push(...params.excludeCategories)
    }

    // Apply cursor-based pagination
    if (params.cursor) {
      query += ' AND v.created_at < (SELECT created_at FROM videos WHERE id = ?)'
      queryParams.push(params.cursor)
    }

    // Order by relevance (can be customized based on algorithm)
    query += ' ORDER BY v.created_at DESC'

    // Apply limit
    query += ' LIMIT ?'
    queryParams.push(params.limit)

    // Execute query
    const videos = await this.database.query(query, queryParams)
    
    return videos.map(row => this.mapDatabaseRowToVideo(row))
  }

  private mapDatabaseRowToVideo(row: any): VideoCandidate {
    return {
      id: row.id,
      note: {
        id: row.id,
        text: row.title,
        author: {
          did: row.creator_id,
          handle: row.creator_handle,
          displayName: row.creator_display_name
        },
        createdAt: row.created_at
      },
      video: {
        duration: row.duration,
        quality: row.quality,
        thumbnail: row.thumbnail_url,
        playbackUrl: row.playback_url,
        resolution: row.resolution,
        aspectRatio: row.aspect_ratio,
        fileSize: row.file_size,
        encoding: row.encoding,
        bitrate: row.bitrate,
        frameRate: row.frame_rate,
        createdAt: row.created_at
      },
      videoFeatures: {
        brightness: row.brightness,
        contrast: row.contrast,
        saturation: row.saturation,
        motionIntensity: row.motion_intensity,
        sceneComplexity: row.scene_complexity,
        audioQuality: row.audio_quality,
        backgroundMusic: row.background_music,
        speechClarity: row.speech_clarity
      },
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      language: row.language,
      creatorId: row.creator_id,
      viewCount: row.view_count,
      likeCount: row.like_count,
      repostCount: row.repost_count,
      replyCount: row.reply_count,
      shareCount: row.share_count,
      completionRate: row.completion_rate,
      averageWatchTime: row.average_watch_time,
      cursor: row.id
    }
  }

  private generateCacheKey(params: VideoQueryParams): string {
    const keyParts = [
      'video_feed',
      params.minDuration || 'any',
      params.maxDuration || 'any',
      params.qualityPreference || 'auto',
      params.categories?.join(',') || 'all',
      params.excludeCategories?.join(',') || 'none',
      params.limit,
      params.cursor || 'start'
    ]
    
    return keyParts.join(':')
  }

  private getTimeWindowMs(timeWindow: string): number {
    const timeMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    
    return timeMap[timeWindow] || timeMap['24h']
  }

  private async invalidateRelatedCaches(videoId: string): Promise<void> {
    // Get video details to invalidate related caches
    const video = await this.getVideoById(videoId)
    if (!video) return

    const cacheKeys = [
      `creator_videos:${video.creatorId}:*`,
      `category_videos:${video.category}:*`,
      'trending_videos:*',
      'video_feed:*'
    ]

    // Invalidate related caches
    for (const pattern of cacheKeys) {
      await this.cache.deletePattern(pattern)
    }
  }

  private getFallbackVideos(limit: number): VideoCandidate[] {
    // Return mock data when database fails
    const fallbackVideos: VideoCandidate[] = []
    
    for (let i = 0; i < limit; i++) {
      fallbackVideos.push({
        id: `fallback_${i}`,
        note: {
          id: `fallback_${i}`,
          text: `Fallback Video ${i + 1}`,
          author: {
            did: 'fallback_creator',
            handle: 'fallback.user',
            displayName: 'Fallback User'
          },
          createdAt: new Date().toISOString()
        },
        video: {
          duration: 30000,
          quality: '720p',
          thumbnail: 'https://via.placeholder.com/320x180',
          playbackUrl: 'https://example.com/fallback.mp4',
          resolution: '720p',
          aspectRatio: '16:9',
          fileSize: 5000000,
          encoding: 'h264',
          bitrate: 1000000,
          frameRate: 30,
          createdAt: new Date().toISOString()
        },
        videoFeatures: {
          brightness: 0.5,
          contrast: 0.5,
          saturation: 0.5,
          motionIntensity: 0.5,
          sceneComplexity: 0.5,
          audioQuality: 0.5,
          backgroundMusic: false,
          speechClarity: 0.5
        },
        category: 'general',
        tags: ['fallback'],
        language: 'en',
        creatorId: 'fallback_creator',
        viewCount: 100,
        likeCount: 10,
        repostCount: 2,
        replyCount: 5,
        shareCount: 1,
        completionRate: 0.7,
        averageWatchTime: 21000,
        cursor: `fallback_${i}`
      })
    }
    
    return fallbackVideos
  }
}