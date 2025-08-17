import { verifyJwt } from '../middleware/auth.js';
export function registerStarterpackRoutes(router, clients) {
    // Create a new starterpack
    router.note('/v1/starterpacks', verifyJwt, (req, res) => {
        const { name, description, avatar_url, is_public } = req.body;
        if (!name) {
            return res.status(400).json({ ok: false, message: 'Name is required' });
        }
        const request = {
            creator_id: req.userId,
            name,
            description: description || '',
            avatar_url: avatar_url || '',
            is_public: is_public !== undefined ? is_public : true
        };
        clients.starterpack.CreateStarterpack(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to create starterpack' });
            }
            return res.status(201).json({ ok: true, starterpack: resp.starterpack });
        });
    });
    // Get a specific starterpack
    router.get('/v1/starterpacks/:starterpackId', verifyJwt, (req, res) => {
        const { starterpackId } = req.params;
        const request = {
            starterpack_id: starterpackId,
            requester_id: req.userId
        };
        clients.starterpack.GetStarterpack(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(404).json({ ok: false, message: resp?.error_message || 'Starterpack not found' });
            }
            return res.json({ ok: true, starterpack: resp.starterpack });
        });
    });
    // Get user's starterpacks
    router.get('/v1/users/:userId/starterpacks', verifyJwt, (req, res) => {
        const { userId } = req.params;
        const { limit = 20, cursor } = req.query;
        const request = {
            user_id: userId,
            requester_id: req.userId,
            limit: parseInt(limit),
            cursor: cursor || ''
        };
        clients.starterpack.GetUserStarterpacks(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get starterpacks' });
            }
            return res.json({
                ok: true,
                starterpacks: resp.starterpacks,
                next_cursor: resp.next_cursor
            });
        });
    });
    // Update a starterpack
    router.put('/v1/starterpacks/:starterpackId', verifyJwt, (req, res) => {
        const { starterpackId } = req.params;
        const { name, description, avatar_url, is_public } = req.body;
        const request = {
            starterpack_id: starterpackId,
            requester_id: req.userId,
            name,
            description,
            avatar_url,
            is_public
        };
        clients.starterpack.UpdateStarterpack(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to update starterpack' });
            }
            return res.json({ ok: true, starterpack: resp.starterpack });
        });
    });
    // Delete a starterpack
    router.delete('/v1/starterpacks/:starterpackId', verifyJwt, (req, res) => {
        const { starterpackId } = req.params;
        const request = {
            starterpack_id: starterpackId,
            requester_id: req.userId
        };
        clients.starterpack.DeleteStarterpack(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to delete starterpack' });
            }
            return res.json({ ok: true });
        });
    });
    // Add item to starterpack
    router.note('/v1/starterpacks/:starterpackId/items', verifyJwt, (req, res) => {
        const { starterpackId } = req.params;
        const { item_type, item_uri, item_order } = req.body;
        if (!item_type || !item_uri) {
            return res.status(400).json({ ok: false, message: 'Item type and URI are required' });
        }
        const request = {
            starterpack_id: starterpackId,
            item_type,
            item_uri,
            item_order: item_order || 0,
            added_by: req.userId
        };
        clients.starterpack.AddStarterpackItem(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to add item' });
            }
            return res.status(201).json({ ok: true, item: resp.item });
        });
    });
    // Remove item from starterpack
    router.delete('/v1/starterpacks/:starterpackId/items/:itemId', verifyJwt, (req, res) => {
        const { starterpackId, itemId } = req.params;
        const request = {
            starterpack_id: starterpackId,
            item_id: itemId,
            removed_by: req.userId
        };
        clients.starterpack.RemoveStarterpackItem(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to remove item' });
            }
            return res.json({ ok: true });
        });
    });
    // Get starterpack items
    router.get('/v1/starterpacks/:starterpackId/items', verifyJwt, (req, res) => {
        const { starterpackId } = req.params;
        const { limit = 20, cursor } = req.query;
        const request = {
            starterpack_id: starterpackId,
            requester_id: req.userId,
            limit: parseInt(limit),
            cursor: cursor || ''
        };
        clients.starterpack.GetStarterpackItems(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get items' });
            }
            return res.json({
                ok: true,
                items: resp.items,
                next_cursor: resp.next_cursor
            });
        });
    });
    // Get suggested starterpacks
    router.get('/v1/starterpacks/suggested', verifyJwt, (req, res) => {
        const { limit = 20, cursor } = req.query;
        const request = {
            user_id: req.userId,
            limit: parseInt(limit),
            cursor: cursor || ''
        };
        clients.starterpack.GetSuggestedStarterpacks(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get suggested starterpacks' });
            }
            return res.json({
                ok: true,
                starterpacks: resp.starterpacks,
                next_cursor: resp.next_cursor
            });
        });
    });
}
