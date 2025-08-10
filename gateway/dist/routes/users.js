export function registerUserRoutes(router, clients) {
    router.get('/v1/users/:id', (req, res) => {
        clients.user.GetUserProfile({ user_id: req.params.id }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
        });
    });
    router.patch('/v1/users/:id', (req, res) => {
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
}
