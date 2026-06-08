import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, resolveContentOrg, type AuthenticatedRequest } from './middleware.js';
import { db, schema } from './db.js';
import {
  getDashboardById,
  createDashboard,
  getDashboardsByOrg,
  updateDashboard,
  deleteDashboard,
  addFunnelToDashboard,
  removeFunnelFromDashboard,
  getDashboardFunnels,
  getUserDashboard,
} from './db.js';

const router = Router();

// The caller may manage a dashboard only if it belongs to the org they are
// operating on: agency_admin -> own org; super_admin -> the ?orgId they drilled
// into. A super_admin operating org A therefore cannot touch org B's dashboard.
function canManageOrg(req: AuthenticatedRequest, orgId: string): boolean {
  const scope = resolveContentOrg(req);
  return scope !== null && scope === orgId;
}

// Load a dashboard and authorize the caller. Returns 'forbidden' | null | row.
async function loadAuthorized(req: AuthenticatedRequest, id: string): Promise<'forbidden' | null | Record<string, unknown>> {
  const d = await getDashboardById(id);
  if (!d) return null;
  if (!canManageOrg(req, d.org_id as string)) return 'forbidden';
  return d;
}

// GET /api/dashboards/me - the calling user's assigned dashboard + ordered funnels
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await getUserDashboard(req.user!.id));
  } catch (err) {
    console.error('My dashboard error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// GET /api/dashboards - the org the caller operates on (agency: own; super_admin: ?orgId)
router.get('/', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await getDashboardsByOrg(resolveContentOrg(req) ?? '__none__'));
  } catch (err) {
    console.error('List dashboards error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/dashboards
router.post('/', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = resolveContentOrg(req);
    if (!orgId) {
      return res.status(400).json({
        error: req.user!.role === 'super_admin' ? 'Bitte eine Organisation wählen (orgId fehlt).' : 'Kein Org-Kontext. Bitte neu anmelden.',
      });
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 120).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name erforderlich' });
    const description = typeof req.body?.description === 'string' ? req.body.description.slice(0, 500) : '';
    const d = await createDashboard({ id: nanoid(), orgId, name, description });
    res.status(201).json(d);
  } catch (err) {
    console.error('Create dashboard error:', err);
    res.status(500).json({ error: 'Create failed' });
  }
});

// PATCH /api/dashboards/:id
router.patch('/:id', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const d = await loadAuthorized(req, req.params.id);
    if (d === null) return res.status(404).json({ error: 'Not found' });
    if (d === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 120).trim() : (d.name as string);
    const description = typeof req.body?.description === 'string' ? req.body.description.slice(0, 500) : (d.description as string);
    await updateDashboard(req.params.id, name, description);
    res.json(await getDashboardById(req.params.id));
  } catch (err) {
    console.error('Update dashboard error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/dashboards/:id
router.delete('/:id', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const d = await loadAuthorized(req, req.params.id);
    if (d === null) return res.status(404).json({ error: 'Not found' });
    if (d === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    await deleteDashboard(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete dashboard error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /api/dashboards/:id/funnels
router.get('/:id/funnels', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const d = await loadAuthorized(req, req.params.id);
    if (d === null) return res.status(404).json({ error: 'Not found' });
    if (d === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    res.json(await getDashboardFunnels(req.params.id));
  } catch (err) {
    console.error('Dashboard funnels error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/dashboards/:id/funnels { funnelId } - link a funnel (same org)
router.post('/:id/funnels', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const d = await loadAuthorized(req, req.params.id);
    if (d === null) return res.status(404).json({ error: 'Not found' });
    if (d === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    const funnelId = typeof req.body?.funnelId === 'string' ? req.body.funnelId : '';
    if (!funnelId) return res.status(400).json({ error: 'funnelId erforderlich' });
    const [f] = await db
      .select({ id: schema.funnel.id, orgId: schema.funnel.orgId })
      .from(schema.funnel)
      .where(eq(schema.funnel.id, funnelId))
      .limit(1);
    if (!f) return res.status(404).json({ error: 'Funnel nicht gefunden' });
    // A dashboard may only bundle funnels from its OWN org — enforced for every
    // role now (super_admin operates one org, so cross-org linking is invalid too).
    if (f.orgId !== (d.org_id as string)) {
      return res.status(403).json({ error: 'Funnel gehoert zu anderer Organisation' });
    }
    const existing = await getDashboardFunnels(req.params.id);
    await addFunnelToDashboard(nanoid(), req.params.id, funnelId, existing.length);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Link funnel error:', err);
    res.status(500).json({ error: 'Link failed' });
  }
});

// DELETE /api/dashboards/:id/funnels/:funnelId
router.delete('/:id/funnels/:funnelId', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string; funnelId: string }>, res) => {
  try {
    const d = await loadAuthorized(req, req.params.id);
    if (d === null) return res.status(404).json({ error: 'Not found' });
    if (d === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
    await removeFunnelFromDashboard(req.params.id, req.params.funnelId);
    res.json({ success: true });
  } catch (err) {
    console.error('Unlink funnel error:', err);
    res.status(500).json({ error: 'Unlink failed' });
  }
});

export default router;
