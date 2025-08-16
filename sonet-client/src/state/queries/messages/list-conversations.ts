import React from 'react'
import {useSonetListChatsQuery} from './sonet/list-conversations'

// Re-export to satisfy existing imports throughout the app which point to
// `#/state/queries/messages/list-conversations`.
export function useListConvosQuery(params: {status?: 'accepted' | 'request'; enabled?: any} = {}) {
	// Sonet API currently returns a flat list; adapt to the infinite-query shape
	const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, isError, error, refetch} = useSonetListChatsQuery({type: 'direct'})
	// Provide an adapter with `pages` so existing code works unmodified
	const adapted = React.useMemo(() => ({
		pages: [{convos: (data?.pages?.flatMap(p => p.chats) ?? data?.chats) || []}],
	}), [data])
	return {
		data: adapted,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		isError,
		error,
		refetch,
	}
}

// Minimal unread count aggregate used by nav components
export function useUnreadMessageCount() {
	// For now, compute by checking chats with `unreadCount > 0` on the first page
	const {data} = useSonetListChatsQuery({type: 'direct'})
	const count = React.useMemo(() => {
		const chats = (data?.pages?.flatMap(p => p.chats) ?? data?.chats) || []
		const total = chats.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0)
		return total
	}, [data])
	return {
		count,
		numUnread: count ? String(Math.min(count, 30)) : '',
		hasNew: count > 0,
	}
}