import { verifyJwt } from '../middleware/auth.js';
export function registerNotificationRoutes(router, clients) {
    router.get('/v1/notifications', verifyJwt, (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        clients.notification.ListNotifications({ user_id: req.userId, pagination: { limit, cursor } }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: true, notifications: resp?.notifications, pagination: resp?.pagination });
        });
    });
    router.put('/v1/notifications/:id/read', verifyJwt, (req, res) => {
        clients.notification.MarkNotificationRead({ user_id: req.userId, notification_id: req.params.id }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.success ?? true });
        });
    });
}
