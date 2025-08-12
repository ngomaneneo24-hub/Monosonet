// For You Feed React Query Hook - ML-powered personalized content
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {forYouFeedAPI, type ForYouFeedParams} from '#/lib/api/feed/for-you'
import {type SonetFeedViewPost} from '#/types/sonet'

const RQKEY_ROOT = 'for-you-feed'

export function RQKEY(params?: ForYouFeedParams) {
  return [RQKEY_ROOT, params || {}]
}

export interface ForYouFeedItem extends SonetFeedViewPost {
  ranking: {
    score: number
    factors: Record<string, number>
    personalization: string[]
  }
  mlInsights?: {
    engagementPrediction: number
    contentQuality: number
    diversityScore: number
    noveltyScore: number
  }
}

export interface ForYouFeedSlice {
  items: ForYouFeedItem[]
  cursor?: string
  feedContext: 'for-you'
  personalization: {
    algorithm: string
    version: string
    factors: Record<string, any>
  }
}

export function useForYouFeedQuery(params?: ForYouFeedParams) {
  return useInfiniteQuery({
    queryKey: RQKEY(params),
    queryFn: async ({pageParam}) => {
      const response = await forYouFeedAPI.getFeed({
        ...params,
        cursor: pageParam?.cursor,
        limit: params?.limit || 20
      })

      // Transform response to match our internal format
      const items: ForYouFeedItem[] = response.items.map(item => ({
        post: item.post,
        reply: undefined, // TODO: Add reply support if needed
        reason: undefined, // TODO: Add repost reason support if needed
        feedContext: item.feedContext,
        ranking: item.ranking,
        mlInsights: {
          engagementPrediction: item.ranking.score,
          contentQuality: item.ranking.factors.content_quality || 0.5,
          diversityScore: item.ranking.factors.diversity || 0.5,
          noveltyScore: item.ranking.factors.novelty || 0.5
        }
      }))

      return {
        items,
        cursor: response.pagination.cursor,
        feedContext: 'for-you' as const,
        personalization: response.personalization
      } as ForYouFeedSlice
    },
    initialPageParam: {cursor: undefined},
    getNextPageParam: (lastPage) => {
      if (!lastPage.cursor) return undefined
      return {cursor: lastPage.cursor}
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - ML ranking can change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useForYouFeedInteractionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (interaction: any) => {
      await forYouFeedAPI.trackInteraction(interaction)
    },
    onSuccess: () => {
      // Invalidate and refetch to get updated ML rankings
      queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
    },
    onError: (error) => {
      console.error('Failed to track For You feed interaction:', error)
      // Don't throw - interaction tracking shouldn't break the UI
    }
  })
}

export function useForYouFeedPersonalization() {
  return useQueryClient().getQueryData([RQKEY_ROOT, 'personalization'])
}

// Hook for getting ML insights about a specific post
export function usePostMLInsights(postId: string) {
  const queryClient = useQueryClient()
  const allPages = queryClient.getQueriesData({queryKey: [RQKEY_ROOT]})
  
  // Find the post across all pages
  for (const [_, data] of allPages) {
    if (data && typeof data === 'object' && 'pages' in data) {
      for (const page of (data as any).pages) {
        const post = page.items?.find((item: ForYouFeedItem) => 
          item.post.uri === postId
        )
        if (post) {
          return post.ranking
        }
      }
    }
  }
  
  return null
}

// Hook for getting feed personalization summary
export function useFeedPersonalizationSummary() {
  const queryClient = useQueryClient()
  const allPages = queryClient.getQueriesData({queryKey: [RQKEY_ROOT]})
  
  // Get personalization from the first page
  for (const [_, data] of allPages) {
    if (data && typeof data === 'object' && 'pages' in data) {
      const firstPage = (data as any).pages[0]
      if (firstPage?.personalization) {
        return firstPage.personalization
      }
    }
  }
  
  return null
}