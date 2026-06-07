import { Router } from 'express';
import { nanoid } from 'nanoid';
import { requireRole, type AuthenticatedRequest } from './middleware.js';
import { auth } from './auth.js';
import {
  createInvite,
  getInvitesByOrg,
  getUsersByOrg,
  getUserById,
  setCredentialPassword,
} from './db.js';

const router = Router();

// The org the caller manages. agency_admin -> their own org; super_admin may pass ?orgId.
function callerOrg(req: AuthenticatedRequest): string | null {
  if (req.user!.role === 'super_admin') {
    // Platform admins must pick a customer org explicitly; never implicitly
    // operate on the platform org ('default').
    const q = typeof req.query.orgId === 'string' ? req.query.orgId : '';
    if (!q || q === 'default') return null;
    return q;
  }
  return req.user!.orgId ?? null;
}

const INVITE_TTL_DAYS = 30;

// POST /api/agency/invites - create an org-bound invite link
router.post('/invites', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = callerOrg(req);
    if (!orgId) return res.status(400).json({ error: 'Keine Organisation' });
    if (orgId === 'default') return res.status(403).json({ error: 'Für die Plattform-Organisation können keine Kunden-Invites erstellt werden.' });
    const token = nanoid(24);
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const invite = await createInvite({ id: nanoid(), token, orgId, createdBy: req.user!.id, expiresAt });
    res.status(201).json(invite);
  } catch (err) {
    console.error('Create invite error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// GET /api/agency/invites - list the org's invites
router.get('/invites', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = callerOrg(req);
    if (!orgId) return res.json([]);
    res.json(await getInvitesByOrg(orgId));
  } catch (err) {
    console.error('List invites error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// GET /api/agency/customers - users in the caller's org
router.get('/customers', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = callerOrg(req);
    if (!orgId) return res.json([]);
    res.json(await getUsersByOrg(orgId));
  } catch (err) {
    console.error('Agency customers error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/agency/customers/:id/password - reset a customer's password (own org only)
router.post('/customers/:id/password', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const orgId = callerOrg(req);
    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    // Strict org scope: an agency admin may only touch members of their own org.
    if (req.user!.role !== 'super_admin' && (target.org_id as string) !== orgId) {
      return res.status(403).json({ error: 'Nutzer gehört zu einer anderen Organisation.' });
    }
    // An agency admin may only reset CUSTOMER passwords — never another admin's
    // (prevents peer-admin takeover / privilege escalation). super_admin is unrestricted.
    if (req.user!.role === 'agency_admin' && target.role !== 'customer') {
      return res.status(403).json({ error: 'Sie können nur Kunden-Passwörter zurücksetzen.' });
    }
    if (target.role === 'super_admin') return res.status(403).json({ error: 'Plattform-Administratoren können hier nicht geändert werden.' });
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 8) return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' });
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(newPassword);
    await setCredentialPassword(req.params.id, hash);
    res.json({ success: true });
  } catch (err) {
    console.error('Agency password reset error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
