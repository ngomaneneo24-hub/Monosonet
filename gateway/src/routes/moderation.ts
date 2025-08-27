import { Router, Response } from 'express';
import { GrpcClients } from '../grpc/clients.js';
import { verifyJwt, AuthenticatedRequest } from '../middleware/auth.js';

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
  // Create a user report (proxy to moderation service)
  router.post('/v1/moderation/reports', verifyJwt, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body || {};
      const subject = body.subject || {};
      const reasonType: string = body.reasonType || '';
      const reason: string = body.reason || '';

      // Build CreateReportRequest for gRPC
      const report_type = mapReasonToReportType(reasonType);
      const reporter_id = req.userId || '';
      let target_id = '';
      let content_id: string | undefined = undefined;

      if (subject.type === 'user') {
        target_id = subject.userId || '';
      } else if (subject.type === 'content') {
        target_id = subject.userId || subject.ownerId || '';
        content_id = subject.id || subject.uri || undefined;
      } else if (subject.type === 'message') {
        target_id = subject.userId || subject.senderId || '';
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
}

