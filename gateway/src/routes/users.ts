import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients';

export function registerUserRoutes(router: Router, clients: GrpcClients) {
  router.get('/v1/users/:id', (req: Request, res: Response) => {
    clients.user.GetUserProfile({ user_id: req.params.id }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
    });
  });

  router.patch('/v1/users/:id', (req: Request, res: Response) => {
    const body = req.body || {};
    const request = {
      user_id: req.params.id,
      display_name: body.display_name,
      bio: body.bio,
      location: body.location,
      website: body.website,
      is_private: body.is_private,
      settings: body.settings || {}
    };
    clients.user.UpdateUserProfile(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
    });
  });
}