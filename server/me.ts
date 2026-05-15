import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { db, schema, getUserById } from './db.js';
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

router.patch('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 200).trim() : undefined;
    if (name === undefined) return res.status(400).json({ error: 'name is required' });
    if (name.length === 0) return res.status(400).json({ error: 'name cannot be empty' });

    const [updated] = await db
      .update(schema.user)
      .set({ name, updatedAt: new Date() })
      .where(eq(schema.user.id, req.user!.id))
      .returning({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        approved: schema.user.approved,
      });
    res.json(updated);
  } catch (err) {
    console.error('Me patch error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
