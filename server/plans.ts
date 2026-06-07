import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';
import { getPlans, getOrgPlanWithUsage } from './db.js';

const router = Router();

// GET /api/plans - public list of plan tiers
router.get('/', async (_req, res) => {
  try {
    res.json(await getPlans());
  } catch (err) {
    console.error('Plans error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// GET /api/plans/me - current org plan + usage (funnel count vs limit)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await getOrgPlanWithUsage(req.user!.orgId ?? 'default'));
  } catch (err) {
    console.error('My plan error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
