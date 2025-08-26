import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {atoms as a, useTheme} from '#/alf'
import {useAgent} from '#/state/session'

// Types for ghost replies
export interface GhostReply {
  id: string
  content: string
  ghostAvatar: string
  ghostId: string
  threadId: string
  createdAt: Date
  isGhostReply: true
}

export interface CreateGhostReplyRequest {
  content: string
  ghostAvatar: string
  ghostId: string
  threadId: string
}

export interface GhostReplyResponse {
  ghostReply: GhostReply
  success: boolean
}

// API functions for ghost replies
export const ghostRepliesApi = {
  // Create a new ghost reply
  async createGhostReply(agent: any, data: CreateGhostReplyRequest): Promise<GhostReplyResponse> {
    try {
      // TODO: Replace with actual API endpoint when server supports it
      // For now, we'll simulate the API call
      const response = await agent.app.sonet.unspecced.createGhostReply({
        content: data.content,
        ghostAvatar: data.ghostAvatar,
        ghostId: data.ghostId,
        threadId: data.threadId,
      })
      
      return {
        ghostReply: {
          id: response.data.id,
          content: data.content,
          ghostAvatar: data.ghostAvatar,
          ghostId: data.ghostId,
          threadId: data.threadId,
          createdAt: new Date(),
          isGhostReply: true,
        },
        success: true,
      }
    } catch (error) {
      console.error('Failed to create ghost reply:', error)
      throw new Error('Failed to create ghost reply')
    }
  },

  // Get ghost replies for a thread
  async getGhostReplies(agent: any, threadId: string): Promise<GhostReply[]> {
    try {
      // TODO: Replace with actual API endpoint when server supports it
      // For now, we'll simulate the API call
      const response = await agent.app.sonet.unspecced.getGhostReplies({
        threadId,
      })
      
      return response.data.ghostReplies.map((reply: any) => ({
        id: reply.id,
        content: reply.content,
        ghostAvatar: reply.ghostAvatar,
        ghostId: reply.ghostId,
        threadId: reply.threadId,
        createdAt: new Date(reply.createdAt),
        isGhostReply: true,
      }))
    } catch (error) {
      console.error('Failed to get ghost replies:', error)
      return []
    }
  },

  // Delete a ghost reply (for moderation)
  async deleteGhostReply(agent: any, ghostReplyId: string): Promise<boolean> {
    try {
      // TODO: Replace with actual API endpoint when server supports it
      await agent.app.sonet.unspecced.deleteGhostReply({
        ghostReplyId,
      })
      return true
    } catch (error) {
      console.error('Failed to delete ghost reply:', error)
      return false
    }
  },
}

// React Query hooks
export function useCreateGhostReply() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateGhostReplyRequest) => 
      ghostRepliesApi.createGhostReply(agent, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch ghost replies for the thread
      queryClient.invalidateQueries({
        queryKey: ['ghostReplies', variables.threadId],
      })
      
      // Also invalidate the main thread to refresh the view
      queryClient.invalidateQueries({
        queryKey: ['noteThread', variables.threadId],
      })
    },
  })
}

export function useGhostReplies(threadId: string) {
  const agent = useAgent()
  
  return useQuery({
    queryKey: ['ghostReplies', threadId],
    queryFn: () => ghostRepliesApi.getGhostReplies(agent, threadId),
    enabled: !!threadId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useDeleteGhostReply() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ghostReplyId: string) => 
      ghostRepliesApi.deleteGhostReply(agent, ghostReplyId),
    onSuccess: (data, ghostReplyId) => {
      // Invalidate all ghost reply queries
      queryClient.invalidateQueries({
        queryKey: ['ghostReplies'],
      })
    },
  })
}