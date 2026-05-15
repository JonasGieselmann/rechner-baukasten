import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { getUserById } from './db.js';

export interface AuthenticatedRequest<P = Record<string, string>> extends Request<P> {
  user?: { id: string; role: string };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: 'Authentication required' });
    const user = await getUserById(session.user.id);
    if (!user || !user.approved) return res.status(403).json({ error: 'User not approved' });
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...allowed: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!session) return res.status(401).json({ error: 'Authentication required' });
      const user = await getUserById(session.user.id);
      if (!user || !user.approved) return res.status(403).json({ error: 'User not approved' });
      if (!allowed.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = { id: user.id, role: user.role };
      next();
    } catch (err) {
      console.error('Role auth error:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}
