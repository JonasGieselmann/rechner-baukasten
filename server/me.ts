import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { db, schema, getUserById, deleteOwnAccount } from './db.js';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: 'Not authenticated' });
    const extendedUser = await getUserById(session.user.id);
    res.json({
      session: { id: session.session.id, expiresAt: session.session.expiresAt },
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: extendedUser?.role || 'user',
        approved: extendedUser?.approved ?? false,
        orgId: extendedUser?.org_id ?? null,
        dashboardId: extendedUser?.dashboard_id ?? null,
        phone: extendedUser?.phone ?? null,
        businessName: extendedUser?.business_name ?? null,
        websiteUrl: extendedUser?.website_url ?? null,
        instagramHandle: extendedUser?.instagram_handle ?? null,
        gmbUrl: extendedUser?.gmb_url ?? null,
      },
    });
  } catch (err) {
    console.error('Me get error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.get('/leads', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.lead)
      .where(eq(schema.lead.userId, req.user!.id))
      .orderBy(desc(schema.lead.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err) {
    console.error('Me leads error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

function parseOptionalString(val: unknown): string | undefined {
  if (val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  return val.slice(0, 200).trim();
}

router.patch('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 200).trim() : undefined;
    if (name !== undefined && name.length === 0) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }

    const phone = parseOptionalString(req.body?.phone);
    const businessName = parseOptionalString(req.body?.businessName);
    const websiteUrl = parseOptionalString(req.body?.websiteUrl);
    const instagramHandle = parseOptionalString(req.body?.instagramHandle);
    const gmbUrl = parseOptionalString(req.body?.gmbUrl);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) patch.name = name;
    if (phone !== undefined) patch.phone = phone;
    if (businessName !== undefined) patch.businessName = businessName;
    if (websiteUrl !== undefined) patch.websiteUrl = websiteUrl;
    if (instagramHandle !== undefined) patch.instagramHandle = instagramHandle;
    if (gmbUrl !== undefined) patch.gmbUrl = gmbUrl;

    const [updated] = await db
      .update(schema.user)
      .set(patch)
      .where(eq(schema.user.id, req.user!.id))
      .returning({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        approved: schema.user.approved,
        phone: schema.user.phone,
        businessName: schema.user.businessName,
        websiteUrl: schema.user.websiteUrl,
        instagramHandle: schema.user.instagramHandle,
        gmbUrl: schema.user.gmbUrl,
      });
    res.json(updated);
  } catch (err) {
    console.error('Me patch error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// DSGVO Art. 17: self-service account deletion. Platform operators (super_admin)
// cannot self-delete here, to avoid locking the platform out of its own admin.
router.delete('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user!.role === 'super_admin') {
      return res.status(403).json({ error: 'Plattform-Administratoren können sich hier nicht selbst löschen.' });
    }
    await deleteOwnAccount(req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Me delete error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
