import { verifyJwt } from '../middleware/auth.js';
export function registerDraftRoutes(router, clients) {
    // Create a new draft
    router.note('/v1/drafts', verifyJwt, (req, res) => {
        const { content, reply_to_uri, quote_uri, mention_handle, images, video, labels, threadgate, interaction_settings, is_auto_saved } = req.body;
        if (!content) {
            return res.status(400).json({ ok: false, message: 'Content is required' });
        }
        const request = {
            user_id: req.userId,
            content,
            reply_to_uri,
            quote_uri,
            mention_handle,
            images: images || [],
            video,
            labels: labels || [],
            threadgate: threadgate ? Buffer.from(JSON.stringify(threadgate)) : undefined,
            interaction_settings: interaction_settings ? Buffer.from(JSON.stringify(interaction_settings)) : undefined,
            is_auto_saved: is_auto_saved || false
        };
        clients.drafts.CreateDraft(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to create draft' });
            }
            return res.json({ ok: true, draft: resp.draft });
        });
    });
    // Get user drafts
    router.get('/v1/drafts', verifyJwt, (req, res) => {
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;
        const includeAutoSaved = req.query.include_auto_saved === 'true';
        const request = {
            user_id: req.userId,
            limit,
            cursor,
            include_auto_saved: includeAutoSaved
        };
        clients.drafts.GetUserDrafts(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get drafts' });
            }
            return res.json({ ok: true, drafts: resp.drafts, next_cursor: resp.next_cursor });
        });
    });
    // Get a specific draft
    router.get('/v1/drafts/:draftId', verifyJwt, (req, res) => {
        const { draftId } = req.params;
        const request = {
            draft_id: draftId,
            user_id: req.userId
        };
        clients.drafts.GetDraft(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to get draft' });
            }
            return res.json({ ok: true, draft: resp.draft });
        });
    });
    // Update a draft
    router.put('/v1/drafts/:draftId', verifyJwt, (req, res) => {
        const { draftId } = req.params;
        const { content, reply_to_uri, quote_uri, mention_handle, images, video, labels, threadgate, interaction_settings } = req.body;
        if (!content) {
            return res.status(400).json({ ok: false, message: 'Content is required' });
        }
        const request = {
            draft_id: draftId,
            user_id: req.userId,
            content,
            reply_to_uri,
            quote_uri,
            mention_handle,
            images: images || [],
            video,
            labels: labels || [],
            threadgate: threadgate ? Buffer.from(JSON.stringify(threadgate)) : undefined,
            interaction_settings: interaction_settings ? Buffer.from(JSON.stringify(interaction_settings)) : undefined
        };
        clients.drafts.UpdateDraft(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to update draft' });
            }
            return res.json({ ok: true, draft: resp.draft });
        });
    });
    // Delete a draft
    router.delete('/v1/drafts/:draftId', verifyJwt, (req, res) => {
        const { draftId } = req.params;
        const request = {
            draft_id: draftId,
            user_id: req.userId
        };
        clients.drafts.DeleteDraft(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to delete draft' });
            }
            return res.json({ ok: true });
        });
    });
    // Auto-save a draft
    router.note('/v1/drafts/auto-save', verifyJwt, (req, res) => {
        const { content, reply_to_uri, quote_uri, mention_handle, images, video, labels, threadgate, interaction_settings } = req.body;
        if (!content) {
            return res.status(400).json({ ok: false, message: 'Content is required' });
        }
        const request = {
            user_id: req.userId,
            content,
            reply_to_uri,
            quote_uri,
            mention_handle,
            images: images || [],
            video,
            labels: labels || [],
            threadgate: threadgate ? Buffer.from(JSON.stringify(threadgate)) : undefined,
            interaction_settings: interaction_settings ? Buffer.from(JSON.stringify(interaction_settings)) : undefined
        };
        clients.drafts.AutoSaveDraft(request, (err, resp) => {
            if (err)
                return res.status(400).json({ ok: false, message: err.message });
            if (!resp?.success) {
                return res.status(400).json({ ok: false, message: resp?.error_message || 'Failed to auto-save draft' });
            }
            return res.json({ ok: true, draft: resp.draft });
        });
    });
}
