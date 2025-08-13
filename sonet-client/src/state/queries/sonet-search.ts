// Enterprise-Grade Sonet Search & Discovery System
// Designed to rival Twitter's search performance and relevance

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {useDebouncedCallback} from 'use-debounce'

import {logger} from '#/logger'
import {sonetClient} from '@sonet/api'
import {SonetUser, SonetNote, SonetSearchResponse} from '@sonet/types'

// =============================================================================
// ENTERPRISE SEARCH TYPES & INTERFACES
// =============================================================================

export interface SonetSearchQuery {
  query: string
  type: 'all' | 'users' | 'notes' | 'topics' | 'media'
  filters: {
    language?: string
    dateRange?: {
      start: Date
      end: Date
    }
    contentType?: 'text' | 'image' | 'video' | 'link'
    engagement?: {
      minLikes?: number
      minRenotes?: number
      minReplies?: number
    }
    userType?: 'verified' | 'influencer' | 'brand' | 'all'
    location?: string
    hashtags?: string[]
    mentions?: string[]
  }
  sortBy: 'relevance' | 'date' | 'engagement' | 'popularity'
  sortOrder: 'asc' | 'desc'
  limit: number
  cursor?: string
}

export interface SonetSearchResult {
  id: string
  type: 'user' | 'note' | 'topic' | 'media'
  relevance: number
  score: number
  highlights: {
    title?: string[]
    content?: string[]
    username?: string[]
    bio?: string[]
  }
  metadata: {
    createdAt: string
    updatedAt: string
    language: string
    location?: string
    tags: string[]
  }
  data: SonetUser | SonetNote | any
}

export interface SonetSearchMetrics {
  totalResults: number
  queryTime: number
  indexSize: number
  cacheHitRate: number
  relevanceScore: number
  userSatisfaction: number
}

export interface SonetSearchSuggestion {
  query: string
  type: 'trending' | 'popular' | 'recent' | 'related'
  score: number
  metadata: {
    searchCount: number
    clickThroughRate: number
    lastSearched: string
  }
}

// =============================================================================
// ADVANCED SEARCH ALGORITHMS & RELEVANCE SCORING
// =============================================================================

class SonetSearchEngine {
  private searchIndex: Map<string, any> = new Map()
  private userPreferences: Map<string, any> = new Map()
  private searchHistory: Map<string, number> = new Map()
  private trendingTopics: Map<string, number> = new Map()

  constructor() {
    this.initializeSearchIndex()
    this.updateTrendingTopics()
  }

  private async initializeSearchIndex() {
    // Initialize search index with real-time data
    // This would integrate with Sonet's search service
    setInterval(() => this.updateTrendingTopics(), 5 * 60 * 1000) // Update every 5 minutes
  }

  private async updateTrendingTopics() {
    try {
      // Fetch trending topics from Sonet API
      const response = await sonetClient.search('', 'topics')
      response.topics?.forEach(topic => {
        this.trendingTopics.set(topic.name, topic.popularity || 0)
      })
    } catch (error) {
      logger.error('Failed to update trending topics', {error})
    }
  }

  calculateRelevanceScore(
    query: string,
    result: any,
    userContext: any
  ): number {
    let score = 0
    const queryTerms = query.toLowerCase().split(/\s+/)
    
    // Text relevance scoring
    if (result.text) {
      const text = result.text.toLowerCase()
      queryTerms.forEach(term => {
        if (text.includes(term)) score += 10
        if (text.startsWith(term)) score += 5
        if (text.endsWith(term)) score += 3
      })
    }

    // User relevance scoring
    if (result.username) {
      const username = result.username.toLowerCase()
      queryTerms.forEach(term => {
        if (username.includes(term)) score += 15
        if (username.startsWith(term)) score += 10
      })
    }

    // Engagement scoring
    if (result.likes) score += Math.min(result.likes / 100, 20)
    if (result.renotes) score += Math.min(result.renotes / 50, 15)
    if (result.replies) score += Math.min(result.replies / 25, 10)

    // Recency scoring
    if (result.createdAt) {
      const age = Date.now() - new Date(result.createdAt).getTime()
      const daysOld = age / (1000 * 60 * 60 * 24)
      score += Math.max(0, 20 - daysOld * 2)
    }

    // User preference scoring
    if (userContext.following?.includes(result.authorId)) score += 25
    if (userContext.interests?.some((interest: string) => 
      result.tags?.includes(interest)
    )) score += 15

    // Trending topic boost
    if (result.tags?.some((tag: string) => this.trendingTopics.has(tag))) {
      score += 10
    }

    return Math.max(0, score)
  }

  generateSearchSuggestions(
    partialQuery: string,
    userContext: any,
    limit: number = 10
  ): SonetSearchSuggestion[] {
    const suggestions: SonetSearchSuggestion[] = []
    
    // Add trending topics
    this.trendingTopics.forEach((popularity, topic) => {
      if (topic.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push({
          query: topic,
          type: 'trending',
          score: popularity,
          metadata: {
            searchCount: popularity,
            clickThroughRate: 0.15,
            lastSearched: new Date().toISOString(),
          },
        })
      }
    })

    // Add recent searches
    this.searchHistory.forEach((count, query) => {
      if (query.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push({
          query,
          type: 'recent',
          score: count,
          metadata: {
            searchCount: count,
            clickThroughRate: 0.1,
            lastSearched: new Date().toISOString(),
          },
        })
      }
    })

    // Add related searches based on user context
    if (userContext.interests) {
      userContext.interests.forEach((interest: string) => {
        if (interest.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.push({
            query: interest,
            type: 'related',
            score: 5,
            metadata: {
              searchCount: 1,
              clickThroughRate: 0.2,
              lastSearched: new Date().toISOString(),
            },
          })
        }
      })
    }

    // Sort by score and return top results
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  recordSearch(query: string) {
    const currentCount = this.searchHistory.get(query) || 0
    this.searchHistory.set(query, currentCount + 1)
    
    // Keep only last 1000 searches
    if (this.searchHistory.size > 1000) {
      const entries = Array.from(this.searchHistory.entries())
      entries.sort((a, b) => b[1] - a[1])
      this.searchHistory.clear()
      entries.slice(0, 1000).forEach(([key, value]) => {
        this.searchHistory.set(key, value)
      })
    }
  }
}

// Global search engine instance
const searchEngine = new SonetSearchEngine()

// =============================================================================
// ENTERPRISE SEARCH QUERY HOOKS
// =============================================================================

export function useSonetSearch(
  query: string,
  options: {
    type?: 'all' | 'users' | 'notes' | 'topics' | 'media'
    filters?: Partial<SonetSearchQuery['filters']>
    sortBy?: 'relevance' | 'date' | 'engagement' | 'popularity'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    enabled?: boolean
    debounceMs?: number
  } = {}
) {
  const {
    type = 'all',
    filters = {},
    sortBy = 'relevance',
    sortOrder = 'desc',
    limit = 20,
    enabled = true,
    debounceMs = 300,
  } = options

  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(query)
  const [searchMetrics, setSearchMetrics] = useState<SonetSearchMetrics | null>(null)

  // Debounced search to avoid excessive API calls
  const debouncedSearch = useDebouncedCallback(
    (newQuery: string) => {
      setSearchQuery(newQuery)
      searchEngine.recordSearch(newQuery)
    },
    debounceMs
  )

  // Update search query when input changes
  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  // Main search query with enterprise-grade optimizations
  const searchQuery = useInfiniteQuery({
    queryKey: [
      'sonet-search',
      searchQuery,
      type,
      filters,
      sortBy,
      sortOrder,
      limit,
    ],
    queryFn: async ({pageParam = undefined}) => {
      const startTime = performance.now()
      
      try {
        // Execute search with advanced filters
        const response = await executeAdvancedSearch({
          query: searchQuery,
          type,
          filters,
          sortBy,
          sortOrder,
          limit,
          cursor: pageParam,
        })

        // Calculate relevance scores
        const enrichedResults = await enrichSearchResults(response.results, searchQuery)

        // Sort by relevance if needed
        if (sortBy === 'relevance') {
          enrichedResults.sort((a, b) => b.relevance - a.relevance)
        }

        const endTime = performance.now()
        const queryTime = endTime - startTime

        // Update metrics
        setSearchMetrics({
          totalResults: response.totalResults,
          queryTime,
          indexSize: response.indexSize || 0,
          cacheHitRate: response.cacheHitRate || 0,
          relevanceScore: enrichedResults.reduce((acc, r) => acc + r.relevance, 0) / enrichedResults.length,
          userSatisfaction: 0, // Would be calculated from user feedback
        })

        return {
          results: enrichedResults,
          cursor: response.cursor,
          hasMore: response.hasMore,
          totalResults: response.totalResults,
          queryTime,
        }

      } catch (error) {
        const endTime = performance.now()
        logger.error('Search query failed', {
          query: searchQuery,
          error,
          queryTime: endTime - startTime,
        })
        throw error
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: enabled && searchQuery.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false
      if (error.status === 400) return false // Bad request, don't retry
      return true
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Search suggestions
  const suggestionsQuery = useQuery({
    queryKey: ['sonet-search-suggestions', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return []
      
      // Get user context for personalized suggestions
      const userContext = await getUserSearchContext()
      
      return searchEngine.generateSearchSuggestions(searchQuery, userContext, 10)
    },
    enabled: searchQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Advanced search filters
  const applyAdvancedFilters = useCallback(async (
    newFilters: Partial<SonetSearchQuery['filters']>
  ) => {
    // Invalidate current search results
    queryClient.invalidateQueries({
      queryKey: ['sonet-search'],
    })
  }, [queryClient])

  // Search analytics and insights
  const getSearchInsights = useCallback(() => {
    if (!searchMetrics) return null

    return {
      performance: {
        queryTime: searchMetrics.queryTime,
        cacheEfficiency: searchMetrics.cacheHitRate,
      },
      quality: {
        totalResults: searchMetrics.totalResults,
        averageRelevance: searchMetrics.relevanceScore,
      },
      recommendations: generateSearchRecommendations(searchQuery, searchMetrics),
    }
  }, [searchMetrics, searchQuery])

  return {
    ...searchQuery,
    suggestions: suggestionsQuery.data || [],
    metrics: searchMetrics,
    insights: getSearchInsights(),
    applyFilters: applyAdvancedFilters,
    isSearching: searchQuery.isFetching,
  }
}

// =============================================================================
// ADVANCED SEARCH EXECUTION & ENRICHMENT
// =============================================================================

async function executeAdvancedSearch(params: {
  query: string
  type: string
  filters: any
  sortBy: string
  sortOrder: string
  limit: number
  cursor?: string
}): Promise<SonetSearchResponse> {
  const {
    query,
    type,
    filters,
    sortBy,
    sortOrder,
    limit,
    cursor,
  } = params

  try {
    // Execute search with Sonet API
    const response = await sonetClient.search(query, type as any)
    
    // Apply advanced filtering
    let filteredResults = response.results || []
    
    // Language filtering
    if (filters.language) {
      filteredResults = filteredResults.filter((result: any) => 
        result.language === filters.language
      )
    }

    // Date range filtering
    if (filters.dateRange) {
      const {start, end} = filters.dateRange
      filteredResults = filteredResults.filter((result: any) => {
        const createdAt = new Date(result.createdAt)
        return createdAt >= start && createdAt <= end
      })
    }

    // Content type filtering
    if (filters.contentType) {
      filteredResults = filteredResults.filter((result: any) => {
        if (filters.contentType === 'text') return !result.media
        if (filters.contentType === 'image') return result.media?.some((m: any) => m.type === 'image')
        if (filters.contentType === 'video') return result.media?.some((m: any) => m.type === 'video')
        if (filters.contentType === 'link') return result.text?.includes('http')
        return true
      })
    }

    // Engagement filtering
    if (filters.engagement) {
      const {minLikes, minRenotes, minReplies} = filters.engagement
      filteredResults = filteredResults.filter((result: any) => {
        if (minLikes && result.likes < minLikes) return false
        if (minRenotes && result.renotes < minRenotes) return false
        if (minReplies && result.replies < minReplies) return false
        return true
      })
    }

    // User type filtering
    if (filters.userType && type === 'users') {
      filteredResults = filteredResults.filter((result: any) => {
        if (filters.userType === 'verified') return result.verified
        if (filters.userType === 'influencer') return result.followersCount > 10000
        if (filters.userType === 'brand') return result.accountType === 'business'
        return true
      })
    }

    // Location filtering
    if (filters.location) {
      filteredResults = filteredResults.filter((result: any) => 
        result.location?.toLowerCase().includes(filters.location.toLowerCase())
      )
    }

    // Hashtag filtering
    if (filters.hashtags?.length) {
      filteredResults = filteredResults.filter((result: any) => 
        filters.hashtags.some((tag: string) => 
          result.tags?.includes(tag)
        )
      )
    }

    // Mention filtering
    if (filters.mentions?.length) {
      filteredResults = filteredResults.filter((result: any) => 
        filters.mentions.some((mention: string) => 
          result.text?.includes(`@${mention}`)
        )
      )
    }

    // Apply sorting
    if (sortBy === 'date') {
      filteredResults.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })
    } else if (sortBy === 'engagement') {
      filteredResults.sort((a: any, b: any) => {
        const engagementA = (a.likes || 0) + (a.renotes || 0) * 2 + (a.replies || 0) * 3
        const engagementB = (b.likes || 0) + (b.renotes || 0) * 2 + (b.replies || 0) * 3
        return sortOrder === 'asc' ? engagementA - engagementB : engagementB - engagementA
      })
    } else if (sortBy === 'popularity') {
      filteredResults.sort((a: any, b: any) => {
        const popularityA = a.followersCount || 0
        const popularityB = b.followersCount || 0
        return sortOrder === 'asc' ? popularityA - popularityB : popularityB - popularityA
      })
    }

    return {
      results: filteredResults.slice(0, limit),
      cursor: response.cursor,
      hasMore: response.hasMore,
      totalResults: filteredResults.length,
      indexSize: response.indexSize,
      cacheHitRate: response.cacheHitRate,
    }

  } catch (error) {
    logger.error('Advanced search execution failed', {params, error})
    throw error
  }
}

async function enrichSearchResults(
  results: any[],
  query: string
): Promise<SonetSearchResult[]> {
  const enrichedResults: SonetSearchResult[] = []

  for (const result of results) {
    try {
      // Calculate relevance score
      const userContext = await getUserSearchContext()
      const relevance = searchEngine.calculateRelevanceScore(query, result, userContext)

      // Generate highlights
      const highlights = generateSearchHighlights(query, result)

      // Build enriched result
      const enrichedResult: SonetSearchResult = {
        id: result.id,
        type: result.type || 'note',
        relevance,
        score: relevance,
        highlights,
        metadata: {
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          language: result.language || 'en',
          location: result.location,
          tags: result.tags || [],
        },
        data: result,
      }

      enrichedResults.push(enrichedResult)

    } catch (error) {
      logger.error('Failed to enrich search result', {resultId: result.id, error})
    }
  }

  return enrichedResults
}

function generateSearchHighlights(query: string, result: any) {
  const highlights: any = {}
  const queryTerms = query.toLowerCase().split(/\s+/)

  // Highlight title matches
  if (result.title) {
    highlights.title = queryTerms.filter(term => 
      result.title.toLowerCase().includes(term)
    )
  }

  // Highlight content matches
  if (result.text) {
    highlights.content = queryTerms.filter(term => 
      result.text.toLowerCase().includes(term)
    )
  }

  // Highlight username matches
  if (result.username) {
    highlights.username = queryTerms.filter(term => 
      result.username.toLowerCase().includes(term)
    )
  }

  // Highlight bio matches
  if (result.bio) {
    highlights.bio = queryTerms.filter(term => 
      result.bio.toLowerCase().includes(term)
    )
  }

  return highlights
}

async function getUserSearchContext() {
  try {
    // Get current user's search context
    const currentUser = await sonetClient.getUser('me')
    return {
      following: currentUser.following || [],
      interests: currentUser.interests || [],
      location: currentUser.location,
      language: currentUser.language,
    }
  } catch (error) {
    logger.error('Failed to get user search context', {error})
    return {
      following: [],
      interests: [],
      location: null,
      language: 'en',
    }
  }
}

function generateSearchRecommendations(query: string, metrics: SonetSearchMetrics) {
  const recommendations: string[] = []

  // Performance recommendations
  if (metrics.queryTime > 1000) {
    recommendations.push('Consider using more specific search terms to improve performance')
  }

  if (metrics.cacheHitRate < 0.3) {
    recommendations.push('Try using common search terms to benefit from cached results')
  }

  // Quality recommendations
  if (metrics.totalResults === 0) {
    recommendations.push('Try broadening your search terms or removing some filters')
  }

  if (metrics.relevanceScore < 50) {
    recommendations.push('Consider refining your search query for better results')
  }

  // User experience recommendations
  if (query.length < 3) {
    recommendations.push('Longer search queries typically yield more relevant results')
  }

  return recommendations
}

// =============================================================================
// SEARCH ANALYTICS & OPTIMIZATION
// =============================================================================

export class SonetSearchAnalytics {
  private searchMetrics = new Map<string, SonetSearchMetrics[]>()
  private userBehavior = new Map<string, any[]>()
  private performanceData = new Map<string, number[]>()

  recordSearch(query: string, metrics: SonetSearchMetrics, userBehavior: any) {
    // Record search metrics
    if (!this.searchMetrics.has(query)) {
      this.searchMetrics.set(query, [])
    }
    this.searchMetrics.get(query)!.push(metrics)

    // Record user behavior
    if (!this.userBehavior.has(query)) {
      this.userBehavior.set(query, [])
    }
    this.userBehavior.get(query)!.push(userBehavior)

    // Record performance data
    if (!this.performanceData.has(query)) {
      this.performanceData.set(query, [])
    }
    this.performanceData.get(query)!.push(metrics.queryTime)
  }

  getQueryAnalytics(query: string) {
    const metrics = this.searchMetrics.get(query) || []
    const behavior = this.userBehavior.get(query) || []
    const performance = this.performanceData.get(query) || []

    if (metrics.length === 0) return null

    return {
      totalSearches: metrics.length,
      averageQueryTime: performance.reduce((a, b) => a + b, 0) / performance.length,
      averageRelevance: metrics.reduce((a, b) => a + b.relevanceScore, 0) / metrics.length,
      userSatisfaction: behavior.reduce((a, b) => a + (b.satisfaction || 0), 0) / behavior.length,
      searchTrend: this.calculateSearchTrend(query),
    }
  }

  private calculateSearchTrend(query: string) {
    const metrics = this.searchMetrics.get(query) || []
    if (metrics.length < 2) return 'stable'

    const recent = metrics.slice(-10)
    const older = metrics.slice(-20, -10)

    const recentAvg = recent.reduce((a, b) => a + b.relevanceScore, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b.relevanceScore, 0) / older.length

    if (recentAvg > olderAvg * 1.1) return 'improving'
    if (recentAvg < olderAvg * 0.9) return 'declining'
    return 'stable'
  }

  getGlobalAnalytics() {
    const allMetrics = Array.from(this.searchMetrics.values()).flat()
    const allPerformance = Array.from(this.performanceData.values()).flat()

    return {
      totalSearches: allMetrics.length,
      averageQueryTime: allPerformance.reduce((a, b) => a + b, 0) / allPerformance.length,
      averageRelevance: allMetrics.reduce((a, b) => a + b.relevanceScore, 0) / allMetrics.length,
      cacheEfficiency: allMetrics.reduce((a, b) => a + b.cacheHitRate, 0) / allMetrics.length,
      topQueries: this.getTopQueries(),
    }
  }

  private getTopQueries() {
    const queryCounts = new Map<string, number>()
    
    this.searchMetrics.forEach((metrics, query) => {
      queryCounts.set(query, metrics.length)
    })

    return Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({query, count}))
  }

  exportData() {
    return {
      globalAnalytics: this.getGlobalAnalytics(),
      queryAnalytics: Array.from(this.searchMetrics.keys()).map(query => ({
        query,
        analytics: this.getQueryAnalytics(query),
      })),
      timestamp: Date.now(),
    }
  }
}

// Global search analytics instance
export const searchAnalytics = new SonetSearchAnalytics()