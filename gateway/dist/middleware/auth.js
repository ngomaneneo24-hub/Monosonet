import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production';
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
