import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check Authorization header first, then query param (used by EventSource which can't set headers)
  const auth = req.headers.authorization;
  const raw  = auth?.startsWith('Bearer ') ? auth.slice(7)
             : typeof req.query.token === 'string' ? req.query.token
             : null;

  if (!raw) {
    return res.status(401).json({ ok: false, error: 'No token provided' });
  }
  try {
    req.user = verifyToken(raw);
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  return next();
}
