import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { getUserById } from './db.js';

export interface AuthenticatedRequest<P = Record<string, string>> extends Request<P> {
  user?: { id: string; role: string; orgId: string | null };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: 'Authentication required' });
    const user = await getUserById(session.user.id);
    if (!user || !user.approved) return res.status(403).json({ error: 'User not approved' });
    req.user = { id: user.id, role: user.role, orgId: user.org_id ?? null };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Resolve which org the caller operates on for ORG-CONTENT tools (funnels,
// dashboards, calculators). agency_admin is always pinned to their own org
// (query/body orgId is ignored — they can never reach another tenant). super_admin
// must pass ?orgId (or body.orgId on writes) to target a specific org; this MAY be
// the platform org ('default'/Layer One), which legitimately holds content —
// unlike customer/invite scoping (agency.ts callerOrg) where 'default' is refused.
// Returns null when a super_admin gave no orgId → caller should return empty/400.
export function resolveContentOrg(req: AuthenticatedRequest): string | null {
  if (req.user!.role === 'super_admin') {
    const q = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
    const body = req.body as { orgId?: unknown } | undefined;
    const b = typeof body?.orgId === 'string' ? body.orgId.trim() : '';
    return q || b || null;
  }
  return req.user!.orgId ?? null;
}

export function requireRole(...allowed: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!session) return res.status(401).json({ error: 'Authentication required' });
      const user = await getUserById(session.user.id);
      if (!user || !user.approved) return res.status(403).json({ error: 'User not approved' });
      if (!allowed.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = { id: user.id, role: user.role, orgId: user.org_id ?? null };
      next();
    } catch (err) {
      console.error('Role auth error:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}
