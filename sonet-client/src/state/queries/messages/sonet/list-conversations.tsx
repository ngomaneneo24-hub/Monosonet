import {createContext, useCallback, useContext, useEffect, useMemo} from 'react'
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query'
import {useSonetApi, useSonetSession} from '#/state/session/sonet'
import {SonetMessagingApi} from '#/services/sonetMessagingApi'
import type {SonetChat, SonetGetChatsParams} from '#/services/sonetMessagingApi'
import type {SonetListChatsQuery} from '#/state/messages/sonet/types'

export const RQKEY_ROOT = 'sonet-convo-list'
export const RQKEY = (
  type: 'direct' | 'group' | 'channel' | 'all',
  readState: 'all' | 'unread' = 'all',
) => [RQKEY_ROOT, type, readState]

type RQPageParam = string | undefined

export function useSonetListChatsQuery({
  enabled,
  type,
  readState = 'all',
}: {
  enabled?: boolean
  type?: 'direct' | 'group' | 'channel'
  readState?: 'all' | 'unread'
} = {}) {
  const sonetApi = useSonetApi()
  const messagingApi = useMemo(() => new SonetMessagingApi(sonetApi), [sonetApi])

  return useInfiniteQuery({
    enabled,
    queryKey: RQKEY(type ?? 'all', readState),
    queryFn: async ({pageParam}) => {
      const params: SonetGetChatsParams = {
        user_id: 'me', // Will be replaced with actual user ID
        limit: 20,
        cursor: pageParam,
      }
      if (type && type !== 'all') {
        params.type = type
      }
      
      const result = await messagingApi.getChats(params)
      return {
        chats: result.chats,
        pagination: result.pagination,
      }
    },
    initialPageParam: undefined as RQPageParam,
    getNextPageParam: lastPage => lastPage.pagination.cursor,
  })
}

const SonetListChatsContext = createContext<{
  direct: SonetChat[]
  group: SonetChat[]
  channel: SonetChat[]
} | null>(null)

export function useSonetListChats() {
  const ctx = useContext(SonetListChatsContext)
  if (!ctx) {
    throw new Error('useSonetListChats must be used within a SonetListChatsProvider')
  }
  return ctx
}

const empty = {direct: [], group: [], channel: []}

export function SonetListChatsProvider({children}: {children: React.ReactNode}) {
  const {hasSession} = useSonetSession()

  if (!hasSession) {
    return (
      <SonetListChatsContext.Provider value={empty}>
        {children}
      </SonetListChatsContext.Provider>
    )
  }

  return <SonetListChatsProviderInner>{children}</SonetListChatsProviderInner>
}

export function SonetListChatsProviderInner({
  children,
}: {
  children: React.ReactNode
}) {
  const {data: directData} = useSonetListChatsQuery({type: 'direct'})
  const {data: groupData} = useSonetListChatsQuery({type: 'group'})
  const {data: channelData} = useSonetListChatsQuery({type: 'channel'})
  const queryClient = useQueryClient()

  const direct = useMemo(() => {
    return directData?.pages.flatMap(page => page.chats) || []
  }, [directData])

  const group = useMemo(() => {
    return groupData?.pages.flatMap(page => page.chats) || []
  }, [groupData])

  const channel = useMemo(() => {
    return channelData?.pages.flatMap(page => page.chats) || []
  }, [channelData])

  const value = useMemo(() => ({
    direct,
    group,
    channel,
  }), [direct, group, channel])

  return (
    <SonetListChatsContext.Provider value={value}>
      {children}
    </SonetListChatsContext.Provider>
  )
}

export function useSonetUnreadMessageCount() {
  const {direct, group, channel} = useSonetListChats()
  
  return useMemo(() => {
    const allChats = [...direct, ...group, ...channel]
    return allChats.reduce((count, chat) => {
      // Calculate unread count based on chat.last_message_id and user's read status
      // This would need to be implemented based on your unread tracking logic
      return count + 0 // Placeholder
    }, 0)
  }, [direct, group, channel])
}

export function useSonetOnMarkAsRead() {
  const queryClient = useQueryClient()
  
  return useCallback((chatId: string) => {
    // Invalidate and refetch chat list to update unread counts
    queryClient.invalidateQueries({queryKey: [RQKEY_ROOT]})
  }, [queryClient])
}

// Helper functions for optimistic updates
export function optimisticUpdate(
  chatId: string,
  old: SonetListChatsQuery | undefined,
  updateFn?: (chat: SonetChat) => SonetChat,
) {
  if (!old || !updateFn) return old
  
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      chats: page.chats.map(chat => 
        chat.chat_id === chatId ? updateFn(chat) : chat
      ),
    })),
  }
}

export function optimisticDelete(chatId: string, old: SonetListChatsQuery | undefined) {
  if (!old) return old
  
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      chats: page.chats.filter(chat => chat.chat_id !== chatId),
    })),
  }
}

export function getSonetChatFromQueryData(chatId: string, old: SonetListChatsQuery) {
  for (const page of old.pages) {
    const chat = page.chats.find(c => c.chat_id === chatId)
    if (chat) return chat
  }
  return undefined
}