function userIdFromAuth(req) {
    const auth = req.header('authorization') || req.header('Authorization');
    if (!auth)
        return undefined;
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    return (token && token.length > 0) ? 'user-from-token' : undefined;
}
export function registerTimelineRoutes(router, clients) {
    router.get('/v1/timeline/home', (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        const request = {
            user_id: userIdFromAuth(req) || String(req.query.user_id || ''),
            algorithm: Number(req.query.algorithm || 3), // HYBRID default
            pagination: { limit, cursor },
            include_ranking_signals: false,
            real_time_updates: false
        };
        clients.timeline.GetTimeline(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            // Flatten to a simple list of notes for the client
            const notes = (resp?.items || []).map((it) => it.note);
            return res.json({ ok: resp?.success ?? true, notes, pagination: resp?.pagination });
        });
    });
    router.get('/v1/timeline/user/:id', (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        const includeReplies = req.query.include_replies === 'true';
        const includeRenotes = req.query.include_renotes !== 'false';
        const request = {
            target_user_id: req.params.id,
            requesting_user_id: userIdFromAuth(req) || '',
            pagination: { limit, cursor },
            include_replies: includeReplies,
            include_renotes: includeRenotes
        };
        clients.timeline.GetUserTimeline(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            const notes = (resp?.items || []).map((it) => it.note);
            return res.json({ ok: resp?.success ?? true, notes, pagination: resp?.pagination });
        });
    });
}
