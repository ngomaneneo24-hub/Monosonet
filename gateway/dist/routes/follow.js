import { verifyJwt } from '../middleware/auth.js';
export function registerFollowRoutes(router, clients) {
    router.post('/v1/follow/:targetUserId', verifyJwt, (req, res) => {
        const request = { user_id: req.params.targetUserId, follower_id: req.userId, type: 1, source: 'app' };
        clients.follow.FollowUser(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.success ?? true, follow: resp?.follow });
        });
    });
    router.delete('/v1/follow/:targetUserId', verifyJwt, (req, res) => {
        const request = { user_id: req.params.targetUserId, follower_id: req.userId };
        clients.follow.UnfollowUser(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.success ?? true });
        });
    });
}
