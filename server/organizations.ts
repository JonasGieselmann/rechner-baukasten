import { Router, Request } from 'express';
import { nanoid } from 'nanoid';
import { requireRole, type AuthenticatedRequest } from './middleware.js';
import {
  getAllOrganizations,
  getOrgById,
  getOrgBySlug,
  createOrganization,
  updateOrgBranding,
  setUserRoleAndOrg,
  setOrgPlan,
  getPlans,
  getUserById,
} from './db.js';

const router = Router();

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] || c)
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `org-${nanoid(6)}`
  );
}

// GET /api/organizations/branding?slug=... - public white-label branding lookup
router.get('/branding', async (req: Request, res) => {
  try {
    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    const org = slug ? await getOrgBySlug(slug) : null;
    if (!org) return res.json(null);
    res.json({
      brandName: org.brand_name ?? null,
      logoUrl: org.logo_url ?? null,
      primaryColor: org.primary_color ?? null,
      accentColor: org.accent_color ?? null,
      backgroundColor: org.background_color ?? null,
      textColor: org.text_color ?? null,
    });
  } catch (err) {
    console.error('Org branding error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// GET /api/organizations - platform admin only
router.get('/', requireRole('super_admin'), async (_req: AuthenticatedRequest, res) => {
  try {
    res.json(await getAllOrganizations());
  } catch (err) {
    console.error('List orgs error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/organizations - create a white-label org (platform admin)
router.post('/', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 120).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name erforderlich' });
    const slug = slugify(typeof req.body?.slug === 'string' && req.body.slug ? req.body.slug : name);
    if (await getOrgBySlug(slug)) return res.status(409).json({ error: 'Slug bereits vergeben' });
    const org = await createOrganization({ id: nanoid(), name, slug });
    res.status(201).json(org);
  } catch (err) {
    console.error('Create org error:', err);
    res.status(500).json({ error: 'Create failed' });
  }
});

// PATCH /api/organizations/:id/branding - agency admin (own org) or platform admin
router.patch('/:id/branding', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    if (req.user!.role !== 'super_admin' && req.user!.orgId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const b = req.body || {};
    const s = (v: unknown) => (typeof v === 'string' ? v.slice(0, 300).trim() || null : null);
    await updateOrgBranding(req.params.id, {
      brandName: s(b.brandName),
      logoUrl: s(b.logoUrl),
      primaryColor: s(b.primaryColor),
      accentColor: s(b.accentColor),
      backgroundColor: s(b.backgroundColor),
      textColor: s(b.textColor),
    });
    res.json(await getOrgById(req.params.id));
  } catch (err) {
    console.error('Branding update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/organizations/:id/members - assign a user into the org with a role (platform admin)
router.post('/:id/members', requireRole('super_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
    const role = req.body?.role === 'agency_admin' ? 'agency_admin' : 'customer';
    if (!userId) return res.status(400).json({ error: 'userId erforderlich' });
    // The platform org (Layer One) is operator-only; never assign customers or
    // agency-admins into it via this onboarding endpoint.
    if (req.params.id === 'default') return res.status(403).json({ error: 'In der Plattform-Organisation können hier keine Mitglieder zugewiesen werden.' });
    if (!(await getOrgById(req.params.id))) return res.status(404).json({ error: 'Org nicht gefunden' });
    if (!(await getUserById(userId))) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    await setUserRoleAndOrg(userId, role, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Member assign error:', err);
    res.status(400).json({ error: 'Request failed' });
  }
});

// PATCH /api/organizations/:id/plan { planId } - assign a plan tier (platform admin)
router.patch('/:id/plan', requireRole('super_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
    if (!planId) return res.status(400).json({ error: 'planId erforderlich' });
    // Validate against the real plan tiers so an org can't be set to a bogus plan.
    const plans = await getPlans();
    if (!plans.some((p) => p.id === planId)) return res.status(400).json({ error: 'Unbekannter Plan' });
    if (!(await getOrgById(req.params.id))) return res.status(404).json({ error: 'Org nicht gefunden' });
    await setOrgPlan(req.params.id, planId);
    res.json({ success: true });
  } catch (err) {
    console.error('Org plan assign error:', err);
    res.status(400).json({ error: 'Request failed' });
  }
});

export default router;
