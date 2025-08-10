import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients';

function userIdFromAuth(req: Request): string | undefined {
  const auth = req.header('authorization') || req.header('Authorization');
  if (!auth) return undefined;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  // In production, verify JWT and extract subject
  return (token && token.length > 0) ? 'user-from-token' : undefined;
}

export function registerNoteRoutes(router: Router, clients: GrpcClients) {
  router.post('/v1/notes', (req: Request, res: Response) => {
    const userId = userIdFromAuth(req) || req.body?.user_id || '';
    const body = req.body || {};
    const request = {
      user_id: userId,
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

  router.get('/v1/notes/:id', (req: Request, res: Response) => {
    const request = { note_id: req.params.id, requesting_user_id: userIdFromAuth(req) || '', include_thread_context: !!req.query.include_thread };
    clients.note.GetNote(request, (err: any, resp: any) => {
      if (err) return res.status(404).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, note: resp?.note, thread: resp?.thread_context });
    });
  });

  router.delete('/v1/notes/:id', (req: Request, res: Response) => {
    const request = { note_id: req.params.id, user_id: userIdFromAuth(req) || '', cascade_delete: !!req.query.cascade };
    clients.note.DeleteNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, message: resp?.message });
    });
  });

  router.post('/v1/notes/:id/like', (req: Request, res: Response) => {
    const request = { note_id: req.params.id, user_id: userIdFromAuth(req) || '', like: req.body?.like !== false };
    clients.note.LikeNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, like_count: resp?.like_count, user_has_liked: resp?.user_has_liked });
    });
  });

  router.post('/v1/notes/:id/renote', (req: Request, res: Response) => {
    const request = { note_id: req.params.id, user_id: userIdFromAuth(req) || '', renote: req.body?.renote !== false };
    clients.note.RenoteNote(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, renote_count: resp?.renote_count, renote: resp?.renote });
    });
  });
}