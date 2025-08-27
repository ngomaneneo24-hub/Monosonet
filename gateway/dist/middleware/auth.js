import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
export function verifyJwt(req, res, next) {
    const auth = req.header('authorization') || req.header('Authorization');
    if (!auth)
        return res.status(401).json({ ok: false, message: 'Missing Authorization header' });
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (!m)
        return res.status(401).json({ ok: false, message: 'Invalid Authorization header' });
    const token = m[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.sub || payload.user_id || payload.uid;
        if (!req.userId)
            return res.status(401).json({ ok: false, message: 'Invalid token payload' });
        return next();
    }
    catch (e) {
        return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
}
// Variant that also accepts token from query string (?token=...)
export function verifyJwtFromHeaderOrQuery(req, res, next) {
    let token;
    const auth = req.header('authorization') || req.header('Authorization');
    if (auth) {
        const m = /^Bearer\s+(.+)$/i.exec(auth);
        if (m)
            token = m[1];
    }
    if (!token) {
        const t = req.query?.token || undefined;
        if (t)
            token = t;
    }
    if (!token)
        return res.status(401).json({ ok: false, message: 'Missing token' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.sub || payload.user_id || payload.uid;
        if (!req.userId)
            return res.status(401).json({ ok: false, message: 'Invalid token payload' });
        return next();
    }
    catch (e) {
        return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
}
