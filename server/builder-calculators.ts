import { Router, Request } from 'express';
import { nanoid } from 'nanoid';
import { requireRole, resolveContentOrg, type AuthenticatedRequest } from './middleware.js';
import {
  getBuilderCalculatorsByOrg,
  getBuilderCalculatorById,
  createBuilderCalculator,
  updateBuilderCalculator,
  deleteBuilderCalculator,
} from './db.js';

const router = Router();

function cleanName(v: unknown): string {
  return typeof v === 'string' ? v.slice(0, 120).trim() : '';
}

// GET /api/builder-calculators - list the caller's org builder calcs (management).
router.get('/', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = resolveContentOrg(req);
    if (!orgId) return res.json([]);
    res.json(await getBuilderCalculatorsByOrg(orgId));
  } catch (err) {
    console.error('List builder calcs error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/builder-calculators - create (org-scoped). Server assigns the id.
router.post('/', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = resolveContentOrg(req);
    if (!orgId) return res.status(400).json({ error: 'Bitte eine Organisation wählen (orgId fehlt).' });
    const name = cleanName(req.body?.name) || 'Neuer Rechner';
    const config = req.body?.config && typeof req.body.config === 'object' ? req.body.config : {};
    const row = await createBuilderCalculator({ id: nanoid(), orgId, ownerId: req.user!.id, name, config });
    res.status(201).json(row);
  } catch (err) {
    console.error('Create builder calc error:', err);
    res.status(500).json({ error: 'Create failed' });
  }
});

// PATCH /api/builder-calculators/:id - update (org ownership).
router.patch('/:id', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const row = await getBuilderCalculatorById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if ((row.org_id as string) !== resolveContentOrg(req)) return res.status(403).json({ error: 'Forbidden' });
    const name = cleanName(req.body?.name) || (row.name as string);
    const config = req.body?.config && typeof req.body.config === 'object' ? req.body.config : {};
    res.json(await updateBuilderCalculator(req.params.id, name, config));
  } catch (err) {
    console.error('Update builder calc error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/builder-calculators/:id - delete (org ownership).
router.delete('/:id', requireRole('super_admin', 'agency_admin'), async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const row = await getBuilderCalculatorById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if ((row.org_id as string) !== resolveContentOrg(req)) return res.status(403).json({ error: 'Forbidden' });
    await deleteBuilderCalculator(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete builder calc error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /api/builder-calculators/public/:id - PUBLIC read for embeds (/embed/:id) and
// the editor load. The id is an unguessable nanoid (capability), like a funnel slug;
// configs are not sensitive. Registered AFTER the gated routes above.
router.get('/public/:id', async (req: Request<{ id: string }>, res) => {
  try {
    const row = await getBuilderCalculatorById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ id: row.id, name: row.name, config: row.config });
  } catch (err) {
    console.error('Public builder calc error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
