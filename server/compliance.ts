import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';
import {
  getUserById,
  getUserDataExport,
  getConsentsForUser,
  withdrawConsent,
  getSubscriptionByEmail,
  unsubscribeByToken,
  unsubscribeByEmail,
  confirmSubscriptionByDoiToken,
} from './db.js';

const router = Router();

// Public endpoints (email links) get a light rate limit.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/compliance/export - DSGVO Art. 20 Datenexport als JSON-Download
router.get('/export', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const data = await getUserDataExport(req.user!.id);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="beautyflow-datenexport.json"');
    res.send(JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/compliance/consents - erteilte/widerrufene Einwilligungen des Nutzers
router.get('/consents', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await getConsentsForUser(req.user!.id);
    res.json(rows);
  } catch (err) {
    console.error('Consents list error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/compliance/consents/:id/withdraw - Einwilligung widerrufen
router.post('/consents/:id/withdraw', requireAuth, async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const ok = await withdrawConsent(req.user!.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Consent withdraw error:', err);
    res.status(400).json({ error: 'Request failed' });
  }
});

// GET /api/compliance/subscription - Mail-Opt-in-Status des aktuellen Nutzers
router.get('/subscription', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const u = await getUserById(req.user!.id);
    if (!u?.email) return res.json(null);
    const sub = await getSubscriptionByEmail(u.email);
    res.json(sub);
  } catch (err) {
    console.error('Subscription status error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/compliance/subscription/unsubscribe - authentifizierte Selbst-Abmeldung
router.post('/subscription/unsubscribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const u = await getUserById(req.user!.id);
    if (!u?.email) return res.status(400).json({ error: 'Keine E-Mail hinterlegt' });
    await unsubscribeByEmail(u.email);
    // Also withdraw active marketing consents for a clean audit trail
    const consents = await getConsentsForUser(req.user!.id);
    for (const c of consents) {
      if (c.type === 'marketing' && !c.withdrawn_at) {
        await withdrawConsent(req.user!.id, c.id).catch(() => undefined);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Self unsubscribe error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/compliance/unsubscribe { token } - oeffentlich, aus dem Mail-Abmeldelink
router.post('/unsubscribe', publicLimiter, async (req: Request, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const ok = await unsubscribeByToken(token);
    res.json({ success: ok });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/compliance/confirm { token } - oeffentlich, Double-Opt-in-Bestaetigung
router.post('/confirm', publicLimiter, async (req: Request, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const ok = await confirmSubscriptionByDoiToken(token);
    res.json({ success: ok });
  } catch (err) {
    console.error('Confirm error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
