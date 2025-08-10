export function registerNotificationRoutes(router) {
    router.get('/v1/notifications', (_req, res) => {
        return res.status(501).json({ ok: false, message: 'Notifications not implemented' });
    });
    router.put('/v1/notifications/:id/read', (_req, res) => {
        return res.status(501).json({ ok: false, message: 'Notifications not implemented' });
    });
}
