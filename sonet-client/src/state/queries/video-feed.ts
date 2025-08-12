import {useInfiniteQuery, useMutation, useQueryClient, useQuery} from '@tanstack/react-query'
import {videoFeedAPI, VideoFeedRequest, PersonalizedFeedRequest, EngagementEvent} from '../../lib/api/video-feed'

// Query Keys
export const VIDEO_FEED_QUERY_KEY = 'video-feed'
export const VIDEO_FEED_PERSONALIZED_KEY = 'video-feed-personalized'
export const VIDEO_FEED_TRENDING_KEY = 'video-feed-trending'
export const VIDEO_FEED_CREATOR_KEY = 'video-feed-creator'
export const VIDEO_FEED_SEARCH_KEY = 'video-feed-search'

// Video Feed Query Hook
export const useVideoFeedQuery = ({
  request,
  enabled = true
}: {
  request: VideoFeedRequest
  enabled?: boolean
}) => {
  return useInfiniteQuery({
    queryKey: [VIDEO_FEED_QUERY_KEY, request],
    queryFn: async ({pageParam = 0}) => {
      const updatedRequest = {
        ...request,
        pagination: {
          ...request.pagination,
          offset: pageParam
        }
      }
      
      const response = await videoFeedAPI.getVideoFeed(updatedRequest)
      return response
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.next_cursor) {
        return undefined
      }
      
      const totalOffset = allPages.reduce((sum, page) => sum + page.pagination.limit, 0)
      return totalOffset
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

// Personalized Feed Query Hook
export const usePersonalizedVideoFeedQuery = ({
  request,
  enabled = true
}: {
  request: PersonalizedFeedRequest
  enabled?: boolean
}) => {
  return useInfiniteQuery({
    queryKey: [VIDEO_FEED_PERSONALIZED_KEY, request.user_id],
    queryFn: async ({pageParam = 0}) => {
      const updatedRequest = {
        ...request,
        base_request: {
          ...request.base_request,
          pagination: {
            ...request.base_request.pagination,
            offset: pageParam
          }
        }
      }
      
      const response = await videoFeedAPI.getPersonalizedFeed(updatedRequest)
      return response
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.next_cursor) {
        return undefined
      }
      
      const totalOffset = allPages.reduce((sum, page) => sum + page.pagination.limit, 0)
      return totalOffset
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for personalized)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

// Trending Videos Query Hook
export const useTrendingVideosQuery = ({
  limit = 20,
  timeWindow = '24h',
  enabled = true
}: {
  limit?: number
  timeWindow?: string
  enabled?: boolean
}) => {
  return useInfiniteQuery({
    queryKey: [VIDEO_FEED_TRENDING_KEY, limit, timeWindow],
    queryFn: async ({pageParam = 0}) => {
      const response = await videoFeedAPI.getTrendingVideos(limit, timeWindow)
      return response
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.next_cursor) {
        return undefined
      }
      
      const totalOffset = allPages.reduce((sum, page) => sum + page.pagination.limit, 0)
      return totalOffset
    },
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute (trending changes fast)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

// Creator Videos Query Hook
export const useCreatorVideosQuery = ({
  creatorId,
  limit = 20,
  enabled = true
}: {
  creatorId: string
  limit?: number
  enabled?: boolean
}) => {
  return useInfiniteQuery({
    queryKey: [VIDEO_FEED_CREATOR_KEY, creatorId, limit],
    queryFn: async ({pageParam = 0}) => {
      const response = await videoFeedAPI.getVideosByCreator(creatorId, limit)
      return response
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.next_cursor) {
        return undefined
      }
      
      const totalOffset = allPages.reduce((sum, page) => sum + page.pagination.limit, 0)
      return totalOffset
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

// Video Search Query Hook
export const useVideoSearchQuery = ({
  query,
  limit = 20,
  enabled = true
}: {
  query: string
  limit?: number
  enabled?: boolean
}) => {
  return useInfiniteQuery({
    queryKey: [VIDEO_FEED_SEARCH_KEY, query, limit],
    queryFn: async ({pageParam = 0}) => {
      const response = await videoFeedAPI.searchVideos(query, limit)
      return response
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination.next_cursor) {
        return undefined
      }
      
      const totalOffset = allPages.reduce((sum, page) => sum + page.pagination.limit, 0)
      return totalOffset
    },
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

// Engagement Tracking Mutation
export const useEngagementTrackingMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (event: EngagementEvent) => {
      return await videoFeedAPI.trackEngagement(event)
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [VIDEO_FEED_QUERY_KEY]
      })
      
      // Update local cache if needed
      // This could update view counts, like counts, etc. in the UI
      console.log('Engagement tracked successfully:', variables.event_type)
    },
    onError: (error, variables) => {
      console.error('Failed to track engagement:', error)
      // Could show a toast or retry mechanism
    }
  })
}

// Batch Engagement Tracking Mutation
export const useBatchEngagementTrackingMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (events: EngagementEvent[]) => {
      // Use the batch endpoint if available, otherwise process individually
      try {
        return await videoFeedAPI.trackEngagementBatch(events)
      } catch (error) {
        // Fallback to individual tracking
        const results = await Promise.allSettled(
          events.map(event => videoFeedAPI.trackEngagement(event))
        )
        return {
          total_events: events.length,
          successful_events: results.filter(r => r.status === 'fulfilled').length,
          failed_events: results.filter(r => r.status === 'rejected').length,
          results
        }
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [VIDEO_FEED_QUERY_KEY]
      })
      
      console.log(`Batch engagement tracked: ${data.successful_events}/${data.total_events} successful`)
    },
    onError: (error, variables) => {
      console.error('Failed to track batch engagement:', error)
    }
  })
}

// Video Analytics Query Hook
export const useVideoAnalyticsQuery = ({
  videoId,
  timeWindow = '30d',
  enabled = true
}: {
  videoId: string
  timeWindow?: string
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ['video-analytics', videoId, timeWindow],
    queryFn: async () => {
      return await videoFeedAPI.getVideoAnalytics(videoId, timeWindow)
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Video Recommendations Query Hook
export const useVideoRecommendationsQuery = ({
  userId,
  limit = 20,
  enabled = true
}: {
  userId: string
  limit?: number
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ['video-recommendations', userId, limit],
    queryFn: async () => {
      return await videoFeedAPI.getVideoRecommendations(userId, limit)
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Feed Insights Query Hook
export const useFeedInsightsQuery = ({
  userId,
  feedType,
  algorithm,
  timeWindow = 24,
  enabled = true
}: {
  userId: string
  feedType: string
  algorithm: string
  timeWindow?: number
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ['feed-insights', userId, feedType, algorithm, timeWindow],
    queryFn: async () => {
      return await videoFeedAPI.getFeedInsights({
        user_id: userId,
        feed_type: feedType,
        algorithm,
        time_window_hours: timeWindow
      })
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}

// Health Check Query Hook
export const useVideoFeedHealthQuery = (enabled = true) => {
  return useQuery({
    queryKey: ['video-feed-health'],
    queryFn: async () => {
      return await videoFeedAPI.healthCheck()
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Check every minute
  })
}