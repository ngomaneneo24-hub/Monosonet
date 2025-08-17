import { Router, Request, Response } from 'express';
import { GrpcClients } from '../grpc/clients';

export function registerAuthRoutes(router: Router, clients: GrpcClients) {
	router.post('/v1/auth/register', (req: Request, res: Response) => {
		const body = req.body || {};
		const request = {
			username: body.username || '',
			email: body.email || '',
			password: body.password || '',
			display_name: body.display_name || body.full_name || '',
			invitation_code: body.invitation_code || '',
			accept_terms: !!body.accept_terms,
			accept_privacy: !!body.accept_privacy
		};
		clients.user.RegisterUser(request, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			return res.json({ ok: resp?.status?.ok ?? true, user: resp?.user, verification_token: resp?.verification_token });
		});
	});

	router.post('/v1/auth/login', (req: Request, res: Response) => {
		const body = req.body || {};
		const request = {
			credentials: { email: body.username || body.email || '', password: body.password || '', two_factor_code: body.two_factor_code || '' },
			device_name: body.device_name || 'client'
		};
		clients.user.LoginUser(request, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			return res.json({ ok: resp?.status?.ok ?? true, access_token: resp?.access_token, refresh_token: resp?.refresh_token, session: resp?.session, requires_2fa: resp?.requires_2fa });
		});
	});

	router.post('/v1/auth/refresh', (req: Request, res: Response) => {
		const request = { refresh_token: req.body?.refresh_token || '' };
		clients.user.RefreshToken(request, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			return res.json({ ok: resp?.status?.ok ?? true, access_token: resp?.access_token, expires_in: resp?.expires_in });
		});
	});

	router.post('/v1/auth/logout', (req: Request, res: Response) => {
		const request = { session_id: req.body?.session_id || '', logout_all_devices: !!req.body?.logout_all_devices };
		clients.user.LogoutUser(request, (err: any, resp: any) => {
			if (err) return res.status(400).json({ ok: false, message: err.message });
			return res.json({ ok: resp?.status?.ok ?? true });
		});
	});
}