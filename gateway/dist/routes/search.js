export function registerSearchRoutes(router, clients) {
    router.get('/v1/search', (req, res) => {
        const q = String(req.query.q || req.query.query || '');
        const type = String(req.query.type || 'notes');
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        if (type === 'users' && clients.search) {
            clients.search.SearchUsers({ query: q, pagination: { limit, cursor } }, (err, resp) => {
                if (err)
                    return res.status(400).json({ ok: false, message: err.message });
                return res.json({ ok: true, results: resp?.users, pagination: resp?.pagination });
            });
            return;
        }
        clients.note.SearchNotes({ query: q, user_id: '', pagination: { limit, cursor }, sort_order: 0 }, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            return res.json({ ok: resp?.success ?? true, results: resp?.notes, pagination: resp?.pagination });
        });
    });
}
