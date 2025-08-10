import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';

export function registerSearchRoutes(router: Router, clients: GrpcClients) {
  router.get('/v1/search', (req: Request, res: Response) => {
    const q = String(req.query.q || req.query.query || '');
    const type = String(req.query.type || 'notes');
    const limit = Number(req.query.limit || 20);
    const cursor = String(req.query.cursor || '');
    if (type === 'users') {
      return res.status(501).json({ ok: false, message: 'User search not implemented yet' });
    }
    clients.note.SearchNotes({ query: q, user_id: '', pagination: { limit, cursor }, sort_order: 0 }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, results: resp?.notes, pagination: resp?.pagination });
    });
  });
}