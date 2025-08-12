import { verifyJwt } from '../middleware/auth.js';
export function registerUserRoutes(router, clients) {
    // Get user privacy settings
    router.get('/v1/users/:userId/privacy', verifyJwt, (req, res) => {
        const { userId } = req.params;
        // Only allow users to access their own privacy settings
        if (req.userId !== userId) {
            return res.status(403).json({ ok: false, message: 'Access denied' });
        }
        const request = {
            user_id: userId
        };
        clients.user.GetUserPrivacy(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get privacy settings' });
            }
            return res.json({ ok: true, is_private: resp.is_private });
        });
    });
    // Update user privacy settings
    router.put('/v1/users/:userId/privacy', verifyJwt, (req, res) => {
        const { userId } = req.params;
        const { is_private } = req.body;
        // Only allow users to update their own privacy settings
        if (req.userId !== userId) {
            return res.status(403).json({ ok: false, message: 'Access denied' });
        }
        if (typeof is_private !== 'boolean') {
            return res.status(400).json({ ok: false, message: 'is_private must be a boolean' });
        }
        const request = {
            user_id: userId,
            is_private: is_private
        };
        clients.user.UpdateUserPrivacy(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to update privacy settings' });
            }
            return res.json({ ok: true, is_private: resp.is_private });
        });
    });
    // Get user profile (with privacy check)
    router.get('/v1/users/:userId/profile', verifyJwt, (req, res) => {
        const { userId } = req.params;
        const requesterId = req.userId;
        const request = {
            user_id: userId,
            requester_id: requesterId
        };
        clients.user.GetUserProfile(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get user profile' });
            }
            return res.json({ ok: true, profile: resp.profile });
        });
    });
}
