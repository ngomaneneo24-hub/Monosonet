import { Router, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, AuthenticatedRequest } from '../middleware/auth.js';

export function registerFollowRoutes(router: Router, clients: GrpcClients) {
  router.note('/v1/follow/:targetUserId', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { user_id: req.params.targetUserId, follower_id: req.userId, type: 1, source: 'app' };
    clients.follow.FollowUser(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true, follow: resp?.follow });
    });
  });

  router.delete('/v1/follow/:targetUserId', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    const request = { user_id: req.params.targetUserId, follower_id: req.userId };
    clients.follow.UnfollowUser(request, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.success ?? true });
    });
  });
}