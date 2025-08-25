import { verifyJwt } from '../middleware/auth.js';
export function registerListRoutes(router, clients) {
    // Create a new list
    router.post('/v1/lists', verifyJwt, (req, res) => {
        const { name, description, is_public, list_type } = req.body;
        if (!name) {
            return res.status(400).json({ ok: false, message: 'Name is required' });
        }
        const request = {
            owner_id: req.userId,
            name,
            description: description || '',
            is_public: is_public !== undefined ? is_public : false,
            list_type: list_type || 'custom'
        };
        clients.list.CreateList(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to create list' });
            }
            return res.status(201).json({ ok: true, list: resp.list });
        });
    });
    // Get a specific list
    router.get('/v1/lists/:listId', verifyJwt, (req, res) => {
        const { listId } = req.params;
        const request = {
            list_id: listId,
            requester_id: req.userId
        };
        clients.list.GetList(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(404).json({ ok: false, message: resp?.error_message || 'List not found' });
            }
            return res.json({ ok: true, list: resp.list });
        });
    });
    // Get user's lists
    router.get('/v1/users/:userId/lists', verifyJwt, (req, res) => {
        const { userId } = req.params;
        const { limit = 20, cursor } = req.query;
        const request = {
            user_id: userId,
            requester_id: req.userId,
            limit: parseInt(limit),
            cursor: cursor || ''
        };
        clients.list.GetUserLists(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get lists' });
            }
            return res.json({
                ok: true,
                lists: resp.lists,
                next_cursor: resp.next_cursor
            });
        });
    });
    // Update a list
    router.put('/v1/lists/:listId', verifyJwt, (req, res) => {
        const { listId } = req.params;
        const { name, description, is_public, list_type } = req.body;
        const request = {
            list_id: listId,
            requester_id: req.userId,
            name,
            description,
            is_public,
            list_type
        };
        clients.list.UpdateList(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to update list' });
            }
            return res.json({ ok: true, list: resp.list });
        });
    });
    // Delete a list
    router.delete('/v1/lists/:listId', verifyJwt, (req, res) => {
        const { listId } = req.params;
        const request = {
            list_id: listId,
            requester_id: req.userId
        };
        clients.list.DeleteList(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to delete list' });
            }
            return res.json({ ok: true });
        });
    });
    // Add member to list
    router.post('/v1/lists/:listId/members', verifyJwt, (req, res) => {
        const { listId } = req.params;
        const { user_id, notes } = req.body;
        if (!user_id) {
            return res.status(400).json({ ok: false, message: 'User ID is required' });
        }
        const request = {
            list_id: listId,
            user_id,
            added_by: req.userId,
            notes: notes || ''
        };
        clients.list.AddListMember(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to add member' });
            }
            return res.status(201).json({ ok: true, member: resp.member });
        });
    });
    // Remove member from list
    router.delete('/v1/lists/:listId/members/:userId', verifyJwt, (req, res) => {
        const { listId, userId } = req.params;
        const request = {
            list_id: listId,
            user_id: userId,
            removed_by: req.userId
        };
        clients.list.RemoveListMember(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to remove member' });
            }
            return res.json({ ok: true });
        });
    });
    // Get list members
    router.get('/v1/lists/:listId/members', verifyJwt, (req, res) => {
        const { listId } = req.params;
        const { limit = 20, cursor } = req.query;
        const request = {
            list_id: listId,
            requester_id: req.userId,
            limit: parseInt(limit),
            cursor: cursor || ''
        };
        clients.list.GetListMembers(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get members' });
            }
            return res.json({
                ok: true,
                members: resp.members,
                next_cursor: resp.next_cursor
            });
        });
    });
    // Check if user is in list
    router.get('/v1/lists/:listId/members/:userId/check', verifyJwt, (req, res) => {
        const { listId, userId } = req.params;
        const request = {
            list_id: listId,
            user_id: userId,
            requester_id: req.userId
        };
        clients.list.IsUserInList(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to check membership' });
            }
            return res.json({ ok: true, is_member: resp.is_member });
        });
    });
}
