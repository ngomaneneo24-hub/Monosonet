import { verifyJwt } from '../middleware/auth.js';
export function registerMessagingRoutes(router, clients) {
    router.get('/v1/messages/conversations', verifyJwt, (req, res) => {
        clients.messaging.GetChats({ user_id: req.userId, limit: 20, cursor: '' }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: true, conversations: resp?.chats, pagination: resp?.pagination });
        });
    });
    router.get('/v1/messages/:chatId', verifyJwt, (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        clients.messaging.GetMessages({ chat_id: req.params.chatId, user_id: req.userId, limit, cursor }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: true, messages: resp?.messages, pagination: resp?.pagination });
        });
    });
    router.post('/v1/messages', verifyJwt, (req, res) => {
        const body = req.body || {};
        const request = { recipient_id: body.recipient_id, sender_id: req.userId, content: body.content, media_ids: body.media_ids || [] };
        clients.messaging.SendMessage(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: true, message: resp?.message });
        });
    });
    router.get('/v1/messages/note-to-self', verifyJwt, (_req, res) => {
        // Placeholder: back by a single-user chat or special label if supported
        return res.status(501).json({ ok: false, message: 'Note-to-self not implemented' });
    });
    router.post('/v1/messages/note-to-self', verifyJwt, (_req, res) => {
        return res.status(501).json({ ok: false, message: 'Note-to-self not implemented' });
    });
    router.post('/v1/messages/note-to-self/:id/post', verifyJwt, (_req, res) => {
        return res.status(501).json({ ok: false, message: 'Note-to-self not implemented' });
    });
}
