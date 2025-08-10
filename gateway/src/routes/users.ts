import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, AuthenticatedRequest } from '../middleware/auth.js';

export function registerUserRoutes(router: Router, clients: GrpcClients) {
  router.get('/v1/users/me', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    clients.user.GetUserProfile({ user_id: req.userId }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
    });
  });

  router.put('/v1/users/me', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    const request = {
      user_id: req.userId,
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

  router.get('/v1/users/:id', (req: Request, res: Response) => {
    clients.user.GetUserProfile({ user_id: req.params.id }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user });
    });
  });

  router.patch('/v1/users/:id', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
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

  router.get('/v1/users/:id/followers', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const limit = Number(req.query.limit || 20);
    const cursor = String(req.query.cursor || '');
    clients.follow.GetFollowers({ user_id: req.params.id, requesting_user_id: req.userId, limit, cursor }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: true, followers: resp?.followers, pagination: resp?.pagination });
    });
  });

  router.get('/v1/users/:id/following', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const limit = Number(req.query.limit || 20);
    const cursor = String(req.query.cursor || '');
    clients.follow.GetFollowing({ user_id: req.params.id, requesting_user_id: req.userId, limit, cursor }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: true, following: resp?.following, pagination: resp?.pagination });
    });
  });
}