import { verifyJwt } from '../middleware/auth.js';
export function registerUserRoutes(router, clients) {
    router.get('/v1/users/me', verifyJwt, (req, res) => {
        clients.user.GetUserProfile({ user_id: req.userId }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
        });
    });
    router.put('/v1/users/me', verifyJwt, (req, res) => {
        const body = req.body || {};
        const request = {
            user_id: req.userId,
            display_name: body.display_name,
            bio: body.bio,
            location: body.location,
            website: body.website,
            is_private: body.is_private,
            settings: body.settings || {}
        };
        clients.user.UpdateUserProfile(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
        });
    });
    router.get('/v1/users/:id', (req, res) => {
        clients.user.GetUserProfile({ user_id: req.params.id }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
        });
    });
    router.patch('/v1/users/:id', verifyJwt, (req, res) => {
        const body = req.body || {};
        const request = {
            user_id: req.params.id,
            display_name: body.display_name,
            bio: body.bio,
            location: body.location,
            website: body.website,
            is_private: body.is_private,
            settings: body.settings || {}
        };
        clients.user.UpdateUserProfile(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
        });
    });
    router.get('/v1/users/:id/followers', verifyJwt, (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        clients.follow.GetFollowers({ user_id: req.params.id, requesting_user_id: req.userId, limit, cursor }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: true, followers: resp?.followers, pagination: resp?.pagination });
        });
    });
    router.get('/v1/users/:id/following', verifyJwt, (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        clients.follow.GetFollowing({ user_id: req.params.id, requesting_user_id: req.userId, limit, cursor }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: true, following: resp?.following, pagination: resp?.pagination });
        });
    });
}
