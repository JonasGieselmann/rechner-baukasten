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
  getPackagesByOrg,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  createPasswordReset,
} from './db.js';

// Normalize a package payload: name required, features = up to 20 short strings.
function parsePackage(body: unknown): { name: string; description: string; features: string[]; sortOrder: number } | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : '';
  if (!name) return null;
  const description = typeof b.description === 'string' ? b.description.trim().slice(0, 1000) : '';
  const features = Array.isArray(b.features)
    ? [...new Set(b.features.filter((f): f is string => typeof f === 'string').map((f) => f.trim().slice(0, 200)).filter(Boolean))].slice(0, 20)
    : [];
  const sortOrder = typeof b.sortOrder === 'number' && Number.isFinite(b.sortOrder) ? Math.trunc(b.sortOrder) : 0;
  return { name, description, features, sortOrder };
}

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
const TEAM_INVITE_TTL_DAYS = 7;

// POST /api/agency/invites { role? } - create an org-bound invite link.
// role: 'customer' (default, end client) or 'agency_admin' (the agency's own
// team). super_admin can never be minted via an invite (enforced in createInvite).
router.post('/invites', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = callerOrg(req);
    if (!orgId) return res.status(400).json({ error: 'Keine Organisation' });
    if (orgId === 'default') return res.status(403).json({ error: 'Für die Plattform-Organisation können keine Kunden-Invites erstellt werden.' });
    const role = req.body?.role === 'agency_admin' ? 'agency_admin' : 'customer';
    const token = nanoid(24);
    // Team (admin-granting) invites are short-lived + single-use; customer invites
    // are longer-lived + multi-use (a shareable bulk-onboarding link).
    const ttlDays = role === 'agency_admin' ? TEAM_INVITE_TTL_DAYS : INVITE_TTL_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    const invite = await createInvite({ id: nanoid(), token, orgId, createdBy: req.user!.id, expiresAt, role });
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

// POST /api/agency/customers/:id/reset-link - generate a password-reset link for
// a customer (own org only). Same scope rules as the password reset above: an
// agency_admin may only reset CUSTOMER accounts, never a peer admin. Returns a
// token the agency hands to the customer (works without SMTP).
const AGENCY_RESET_TTL_DAYS = 7;
router.post('/customers/:id/reset-link', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const orgId = callerOrg(req);
    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    if (req.user!.role !== 'super_admin' && (target.org_id as string) !== orgId) {
      return res.status(403).json({ error: 'Nutzer gehört zu einer anderen Organisation.' });
    }
    if (req.user!.role === 'agency_admin' && target.role !== 'customer') {
      return res.status(403).json({ error: 'Sie können nur Kunden-Zugänge zurücksetzen.' });
    }
    if (target.role === 'super_admin') return res.status(403).json({ error: 'Plattform-Administratoren können hier nicht geändert werden.' });
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + AGENCY_RESET_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await createPasswordReset({ id: nanoid(), token, userId: target.id as string, createdBy: req.user!.id, expiresAt });
    res.status(201).json({ token, expiresAt });
  } catch (err) {
    console.error('Agency reset link error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// ---- Packages (the agency's own product packages shown to its customers) ----

router.get('/packages', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = callerOrg(req);
    if (!orgId) return res.json([]);
    res.json(await getPackagesByOrg(orgId));
  } catch (err) {
    console.error('List packages error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/packages', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = callerOrg(req);
    if (!orgId) return res.status(400).json({ error: 'Keine Organisation' });
    if (orgId === 'default') return res.status(403).json({ error: 'Die Plattform-Organisation hat keine Pakete.' });
    const p = parsePackage(req.body);
    if (!p) return res.status(400).json({ error: 'Name erforderlich' });
    const created = await createPackage({ id: nanoid(), orgId, ...p });
    res.status(201).json(created);
  } catch (err) {
    console.error('Create package error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.patch('/packages/:id', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const orgId = callerOrg(req);
    const pkg = await getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Paket nicht gefunden' });
    if (req.user!.role !== 'super_admin' && (pkg.org_id as string) !== orgId) return res.status(403).json({ error: 'Forbidden' });
    const p = parsePackage(req.body);
    if (!p) return res.status(400).json({ error: 'Name erforderlich' });
    res.json(await updatePackage(req.params.id, p));
  } catch (err) {
    console.error('Update package error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.delete('/packages/:id', requireRole('agency_admin', 'super_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const orgId = callerOrg(req);
    const pkg = await getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Paket nicht gefunden' });
    if (req.user!.role !== 'super_admin' && (pkg.org_id as string) !== orgId) return res.status(403).json({ error: 'Forbidden' });
    await deletePackage(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete package error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
