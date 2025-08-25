import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, AuthenticatedRequest } from '../middleware/auth.js';
import { messagingBus } from '../messaging/bus.js';

export function registerMessagingRoutes(router: Router, clients: GrpcClients) {
	router.get('/v1/messages/conversations', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
		clients.messaging.GetChats({ user_id: req.userId, limit: 20, cursor: '' }, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			return res.json({ ok: true, conversations: resp?.chats, pagination: resp?.pagination });
		});
	});

	router.get('/v1/messages/:chatId', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
		const limit = Number(req.query.limit || 20);
		const cursor = String(req.query.cursor || '');
		clients.messaging.GetMessages({ chat_id: req.params.chatId, user_id: req.userId, limit, cursor }, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			return res.json({ ok: true, messages: resp?.messages, pagination: resp?.pagination });
		});
	});

	// Use standard POST for sending messages
	router.post('/v1/messages', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
		const body = req.body || {};
		const request = { recipient_id: body.recipient_id, sender_id: req.userId, content: body.content, media_ids: body.media_ids || [] };
		clients.messaging.SendMessage(request, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			// Emit local bus event for WS fallback
			try {
				const payload = resp?.message || {};
				messagingBus.emit('message', { type: 'message', payload: {
					id: payload.message_id || payload.id,
					chatId: payload.chat_id || body.chat_id || body.chatId,
					senderId: req.userId,
					content: payload.content || body.content,
					status: 'sent',
					type: 'text',
					timestamp: new Date().toISOString()
				}})
			} catch {}
			return res.json({ ok: true, message: resp?.message });
		});
	});

	router.get('/v1/messages/note-to-self', verifyJwt, (_req: AuthenticatedRequest, res: Response) => {
		// Placeholder: back by a single-user chat or special label if supported
		return res.status(501).json({ ok: false, message: 'Note-to-self not implemented' });
	});

	// Use POST instead of nonstandard method
	router.post('/v1/messages/note-to-self', verifyJwt, (_req: AuthenticatedRequest, res: Response) => {
		return res.status(501).json({ ok: false, message: 'Note-to-self not implemented' });
	});

	router.post('/v1/messages/note-to-self/:id/note', verifyJwt, (_req: AuthenticatedRequest, res: Response) => {
		return res.status(501).json({ ok: false, message: 'Note-to-self not implemented' });
	});

	// Aliases to support client-friendly /messaging/* paths via HTTP proxy to messaging service
	const MESSAGING_HTTP_BASE = process.env.MESSAGING_HTTP_BASE || 'http://messaging-service:8086';

	router.get('/messaging/chats', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
		try {
			const url = `${MESSAGING_HTTP_BASE}/api/v1/chats?user_id=${encodeURIComponent(String(req.userId || ''))}`;
			const r = await fetch(url, { headers: { Authorization: req.headers.authorization || '' } });
			const j = await r.json().catch(() => ({}));
			if (!r.ok) return res.status(r.status).json({ ok: false, message: j?.message || 'Upstream error' });
			return res.json({ ok: true, data: j?.data || j?.chats || [] });
		} catch (e: any) {
			return res.status(502).json({ ok: false, message: e?.message || 'Proxy error' });
		}
	});

	router.get('/messaging/chats/:chatId', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
		try {
			// Fallback approach: fetch chats and filter client-side
			const url = `${MESSAGING_HTTP_BASE}/api/v1/chats?user_id=${encodeURIComponent(String(req.userId || ''))}`;
			const r = await fetch(url, { headers: { Authorization: req.headers.authorization || '' } });
			const j = await r.json().catch(() => ({}));
			if (!r.ok) return res.status(r.status).json({ ok: false, message: j?.message || 'Upstream error' });
			const chats = j?.data || j?.chats || [];
			const found = Array.isArray(chats) ? chats.find((c: any) => c.id === req.params.chatId || c.chat_id === req.params.chatId) : null;
			if (!found) return res.status(404).json({ ok: false, message: 'Chat not found' });
			return res.json({ ok: true, data: found });
		} catch (e: any) {
			return res.status(502).json({ ok: false, message: e?.message || 'Proxy error' });
		}
	});

	router.get('/messaging/chats/:chatId/messages', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
		try {
			const url = `${MESSAGING_HTTP_BASE}/api/v1/messages?chat_id=${encodeURIComponent(req.params.chatId)}&limit=${encodeURIComponent(String(req.query.limit || 50))}&offset=${encodeURIComponent(String(req.query.offset || 0))}`;
			const r = await fetch(url, { headers: { Authorization: req.headers.authorization || '' } });
			const j = await r.json().catch(() => ({}));
			if (!r.ok) return res.status(r.status).json({ ok: false, message: j?.message || 'Upstream error' });
			return res.json({ ok: true, data: j?.data?.messages || j?.messages || [] });
		} catch (e: any) {
			return res.status(502).json({ ok: false, message: e?.message || 'Proxy error' });
		}
	});

	router.post('/messaging/messages', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
		try {
			const r = await fetch(`${MESSAGING_HTTP_BASE}/api/v1/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
				body: JSON.stringify(req.body || {})
			});
			const j = await r.json().catch(() => ({}));
			if (!r.ok) return res.status(r.status).json({ ok: false, message: j?.message || 'Upstream error' });
			// Emit local bus event for WS fallback
			try {
				const chatId = req.body?.chatId || req.body?.chat_id;
				messagingBus.emit('message', { type: 'message', payload: {
					id: j?.data?.message?.message_id || j?.message?.message_id || `msg_${Date.now()}`,
					chatId,
					senderId: req.userId,
					content: req.body?.content,
					status: 'sent',
					type: 'text',
					timestamp: new Date().toISOString()
				}})
			} catch {}
			return res.json({ ok: true, data: j?.data?.message || j?.message });
		} catch (e: any) {
			return res.status(502).json({ ok: false, message: e?.message || 'Proxy error' });
		}
	});
}