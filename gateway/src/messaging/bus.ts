import {EventEmitter} from 'events'

export type MessageEvent = {
	type: 'message'
	payload: {
		id: string
		chatId: string
		senderId: string
		content: string
		status: 'sent' | 'delivered' | 'read' | 'failed'
		type: 'text' | 'image' | 'file'
		timestamp: string
	}
}

export type TypingEvent = {
	type: 'typing'
	payload: {
		chat_id: string
		user_id: string
		is_typing: boolean
		timestamp: string
	}
}

class MessagingBus extends EventEmitter {}

export const messagingBus = new MessagingBus()