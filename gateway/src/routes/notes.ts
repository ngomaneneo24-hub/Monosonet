import { Router, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, AuthenticatedRequest } from '../middleware/auth.js';

export function registerNoteRoutes(router: Router, clients: GrpcClients) {
  router.post('/v1/notes', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const request = {
      user_id: req.userId || '',
      content: body.text || body.content || '',
      reply_to_id: body.reply_to_id || '',
      quote_note_id: body.quote_note_id || '',
      visibility: body.visibility ?? 0,
      is_sensitive: !!body.is_sensitive,
      attachments: (body.attachments || []).map((a: any) => ({ type: a.type ?? 0, url: a.url, alt_text: a.alt_text, description: a.description })),
      location: body.location,
      scheduled_at: undefined,
      tags: body.tags || []
    };
    clients.note.CreateNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, note: resp?.note });
    });
  });

  router.get('/v1/notes/:id', (req: AuthenticatedRequest, res: Response) => {
    const request = { note_id: req.params.id, requesting_user_id: req.userId || '', include_thread_context: !!req.query.include_thread };
    clients.note.GetNote(request, (err: any, resp: any) => {
      if (err) return res.status(404).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, note: resp?.note, thread: resp?.thread_context });
    });
  });

  router.delete('/v1/notes/:id', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { note_id: req.params.id, user_id: req.userId || '', cascade_delete: !!req.query.cascade };
    clients.note.DeleteNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, message: resp?.message });
    });
  });

  router.post('/v1/notes/:id/like', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { note_id: req.params.id, user_id: req.userId || '', like: req.body?.like !== false };
    clients.note.LikeNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, like_count: resp?.like_count, user_has_liked: resp?.user_has_liked });
    });
  });

  router.delete('/v1/notes/:id/like', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { note_id: req.params.id, user_id: req.userId || '', like: false };
    clients.note.LikeNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, like_count: resp?.like_count, user_has_liked: resp?.user_has_liked });
    });
  });

  router.post('/v1/notes/:id/renote', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { note_id: req.params.id, user_id: req.userId || '', renote: req.body?.renote !== false };
    clients.note.RenoteNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, renote_count: resp?.renote_count, renote: resp?.renote });
    });
  });

  router.post('/v1/notes/:id/share', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    // Alias for renote
    const request = { note_id: req.params.id, user_id: req.userId || '', renote: req.body?.share !== false };
    clients.note.RenoteNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, renote_count: resp?.renote_count, renote: resp?.renote });
    });
  });

  router.post('/v1/notes/:id/bookmark', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { note_id: req.params.id, user_id: req.userId || '', bookmark: req.body?.bookmark !== false };
    if (typeof (clients.note as any).BookmarkNote !== 'function') {
      return res.status(501).json({ ok: false, message: 'Bookmark not supported' });
    }
    (clients.note as any).BookmarkNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, user_has_bookmarked: resp?.user_has_bookmarked });
    });
  });
}