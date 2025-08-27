import { Router, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, verifyJwtFromHeaderOrQuery, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'node:crypto';
import { SERVICE_ENDPOINTS } from '../config/environment.js';
import http from 'http';
import https from 'https';

// Basic mapping from client reasonType to server report_type
function mapReasonToReportType(reason: string): string {
  switch ((reason || '').toLowerCase()) {
    case 'spam':
      return 'spam';
    case 'rude':
    case 'harassment':
    case 'trolling':
      return 'harassment';
    case 'violation':
    case 'illegal':
      return 'violence';
    case 'sexual':
      return 'nsfw';
    case 'misleading':
      return 'misinformation';
    default:
      return 'report_abuse';
  }
}

export function registerModerationRoutes(router: Router, clients: GrpcClients) {
  // Deterministic UUID v5-like mapping for non-UUID ids
  function toUuid(id: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return id;
    const ns = 'sonet-id-namespace::moderation';
    const hash = crypto.createHash('sha1').update(ns).update(id || '').digest('hex');
    // Set version (5) and variant bits on the hex string
    const bytes = hash.substring(0, 32); // 16 bytes (32 hex)
    const v = (parseInt(bytes.substring(12, 13), 16) & 0x0f) | 0x50; // set version 5
    const r = (parseInt(bytes.substring(16, 17), 16) & 0x3) | 0x8;   // set variant 10xx
    const hex =
      bytes.substring(0, 8) + '-' +
      bytes.substring(8, 12) + '-' +
      v.toString(16) + bytes.substring(13, 16) + '-' +
      r.toString(16) + bytes.substring(17, 20) + '-' +
      bytes.substring(20, 32);
    return hex;
  }
  // Create a user report (proxy to moderation service)
  router.post('/v1/moderation/reports', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body || {};
      const subject = body.subject || {};
      const reasonType: string = body.reasonType || '';
      const reason: string = body.reason || '';

      // Build CreateReportRequest for gRPC
      const report_type = mapReasonToReportType(reasonType);
      const reporter_id = toUuid(req.userId || '');
      let target_id = '';
      let content_id: string | undefined = undefined;

      if (subject.type === 'user') {
        target_id = toUuid(subject.userId || '');
      } else if (subject.type === 'content') {
        target_id = toUuid(subject.userId || subject.ownerId || '');
        content_id = subject.id || subject.uri || undefined;
      } else if (subject.type === 'message') {
        target_id = toUuid(subject.userId || subject.senderId || '');
        content_id = subject.messageId || undefined;
      }

      if (!target_id) {
        return res.status(400).json({ ok: false, message: 'Missing target user id' });
      }

      // Synthesize minimal text evidence from reason/details
      const evidence = [] as Array<{ evidence_type: string; content: string; url?: string; screenshot?: Buffer; metadata?: Record<string, string> }>
      if (typeof reason === 'string' && reason.trim().length > 0) {
        evidence.push({ evidence_type: 'text', content: reason.trim() });
      }

      // Call gRPC ModerationService.CreateReport
      const reqPayload = { reporter_id, target_id, content_id: content_id || '', report_type, reason: reason || '', description: body.description || '', evidence, metadata: {} } as any;

      const resp: any = await new Promise((resolve, reject) => {
        (clients.moderation as any).CreateReport(reqPayload, (err: any, data: any) => {
          if (err) return reject(err);
          resolve(data);
        });
      });

      return res.json({ ok: true, data: resp });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || 'Failed to create report' });
    }
  });

  // Fetch a report by id
  router.get('/v1/moderation/reports/:id', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const report_id = req.params.id;
      const resp: any = await new Promise((resolve, reject) => {
        (clients.moderation as any).GetReport({ report_id }, (err: any, data: any) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
      return res.json({ ok: true, data: resp?.report || resp });
    } catch (e: any) {
      return res.status(404).json({ ok: false, message: e?.message || 'Report not found' });
    }
  });

  // List reports for a user (target) - optional
  router.get('/v1/moderation/reports/user/:userId', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user_id = req.params.userId;
      const resp: any = await new Promise((resolve, reject) => {
        (clients.moderation as any).GetReportsByUser({ user_id }, (err: any, data: any) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
      return res.json({ ok: true, data: resp?.reports || [] });
    } catch (e: any) {
      return res.status(400).json({ ok: false, message: e?.message || 'Failed to fetch reports' });
    }
  });

  // SSE proxy helper
  function proxySse(req: AuthenticatedRequest, res: Response, upstreamPath: string) {
    const base = new URL(SERVICE_ENDPOINTS.moderationHttpBase);
    const url = new URL(upstreamPath, base);
    url.search = new URLSearchParams(req.query as any).toString();

    const isHttps = url.protocol === 'https:';
    const agent = isHttps ? https : http;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const upstreamReq = agent.request(url, {
      method: 'GET',
      headers: {
        'accept': 'text/event-stream',
        // Forward auth if needed by upstream
        'authorization': req.headers['authorization'] || '',
      },
    }, (upstreamRes) => {
      upstreamRes.on('data', (chunk) => {
        res.write(chunk);
      });
      upstreamRes.on('end', () => {
        res.end();
      });
    });

    upstreamReq.on('error', () => {
      // Emit an SSE error event, then close
      res.write(`event: error\n`);
      res.write(`data: {"message":"upstream connection error"}\n\n`);
      res.end();
    });

    // Close upstream if client disconnects
    req.on('close', () => {
      upstreamReq.destroy();
    });

    upstreamReq.end();
  }

  // Reports stream proxy
  router.get('/v1/stream/reports', verifyJwtFromHeaderOrQuery, (req: AuthenticatedRequest, res: Response) => {
    proxySse(req, res, '/api/v1/stream/reports');
  });

  // Signals stream proxy
  router.get('/v1/stream/signals', verifyJwtFromHeaderOrQuery, (req: AuthenticatedRequest, res: Response) => {
    proxySse(req, res, '/api/v1/stream/signals');
  });
}

