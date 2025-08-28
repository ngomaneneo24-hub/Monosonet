import { Router, Response, Request } from 'express';
import { credentials } from '@grpc/grpc-js';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import path from 'node:path';
import url from 'node:url';
import multer from 'multer';
import { AuthenticatedRequest, verifyJwt } from '../middleware/auth.js';
import { createGrpcClients } from '../grpc/clients.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROTO_DIR = process.env.PROTO_DIR || path.resolve(__dirname, '../../proto');
const mediaPkgDef = loadSync(path.join(PROTO_DIR, 'services/media.proto'), { longs: String, enums: String, defaults: true, oneofs: true });
const mediaPackage: any = loadPackageDefinition(mediaPkgDef)['sonet.media'];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export function registerMediaRoutes(router: Router) {
  const { media: mediaClient } = createGrpcClients();
  // naive in-memory like store for media items: { mediaId: { likeCount, userIds:Set } }
  const mediaLikes: Map<string, { count: number } > = new Map();

  router.post('/v1/media/upload', verifyJwt, upload.single('media') /* accept 'media' */, (req: (AuthenticatedRequest & Request) & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) return res.status(400).json({ ok: false, message: 'file required' });
    const call = mediaClient.Upload((err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: true, media: resp });
    });
    call.write({ init: { owner_user_id: req.userId, type: 1, original_filename: req.file.originalname, mime_type: req.file.mimetype } });
    call.write({ chunk: { content: req.file.buffer } });
    call.end();
  });

  router.get('/v1/media/:id', (req: Request, res: Response) => {
    mediaClient.GetMedia({ media_id: req.params.id }, (err: any, resp: any) => {
      if (err) return res.status(404).json({ ok: false, message: err.message });
      return res.json({ ok: true, media: resp?.media });
    });
  });

  router.delete('/v1/media/:id', verifyJwt, (req: AuthenticatedRequest, res: Response) => {
    mediaClient.DeleteMedia({ media_id: req.params.id }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: resp?.deleted ?? false });
    });
  });

  // Toggle like via gRPC MediaService (backed by dev in-memory counter server-side)
  router.post('/v1/media/:id/like', (req: Request, res: Response) => {
    const mediaId = req.params.id;
    const { isLiked } = (req.body as any) ?? {};
    if (typeof isLiked !== 'boolean') {
      return res.status(400).json({ ok: false, message: 'isLiked boolean required' });
    }
    mediaClient.ToggleMediaLike({ media_id: mediaId, user_id: 'current', is_liked: isLiked }, (err: any, resp: any) => {
      if (err) return res.status(400).json({ ok: false, message: err.message });
      return res.json({ ok: true, mediaId: resp?.media_id, isLiked: !!resp?.is_liked, likeCount: Number(resp?.like_count || 0) });
    });
  });
}