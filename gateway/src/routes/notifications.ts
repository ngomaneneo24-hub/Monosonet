import { Router, Request, Response } from 'express';

export function registerNotificationRoutes(router: Router) {
  router.get('/v1/notifications', (_req: Request, res: Response) => {
    return res.status(501).json({ ok: false, message: 'Notifications not implemented' });
  });

  router.put('/v1/notifications/:id/read', (_req: Request, res: Response) => {
    return res.status(501).json({ ok: false, message: 'Notifications not implemented' });
  });
}