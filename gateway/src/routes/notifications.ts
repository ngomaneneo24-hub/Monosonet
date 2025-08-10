import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, AuthenticatedRequest } from '../middleware/auth.js';

export function registerNotificationRoutes(router: Router, clients: GrpcClients) {
  router.get('/v1/notifications', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const limit = Number(req.query.limit || 20);
    const cursor = String(req.query.cursor || '');
    (clients.notification as any).ListNotifications({ user_id: req.userId, pagination: { limit, cursor } }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: true, notifications: resp?.notifications, pagination: resp?.pagination });
    });
  });

  router.put('/v1/notifications/:id/read', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    (clients.notification as any).MarkNotificationRead({ user_id: req.userId, notification_id: req.params.id }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true });
    });
  });
}