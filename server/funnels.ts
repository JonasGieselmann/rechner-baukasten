import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import { fromNodeHeaders } from 'better-auth/node';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from './auth.js';
import { db, schema, getRawClient, recordConsent, getOrCreateSubscription } from './db.js';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';
import { isValidSlug, sanitizeString } from './utils.js';
import { renderLeadReportPdf } from './pdf/leadReport.js';
import { sendLeadReportEmail, sendDoiConfirmationEmail } from './mailer.js';
import { LEGAL_VERSIONS } from './legal.js';
import { enrichLead, scrapeSucceeded, type ScrapeData } from './scrape/index.js';

const router = Router();

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] || c)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50);
  return s || `funnel-${nanoid(6)}`;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await db.select({ id: schema.funnel.id }).from(schema.funnel).where(eq(schema.funnel.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
    slug = `${base}-${counter++}`;
    if (counter > 200) throw new Error('Unable to generate unique slug');
  }
}

function emptyFunnelConfig() {
  return {
    theme: {
      mode: 'light' as const,
      primaryColor: '#0a0a0a',
      accentColor: '#7EC8F3',
      backgroundColor: '#ffffff',
      cardColor: '#f7f7f8',
      textColor: '#0a0a0a',
      borderColor: '#e6e8eb',
    },
    settings: {
      progressBar: true,
      ctaCalendarUrl: '',
    },
    steps: [
      {
        id: nanoid(),
        type: 'intro',
        title: 'Willkommen',
        body: 'In 2 Minuten weißt du, wo dein Potenzial wirklich liegt.',
        ctaLabel: 'Los gehts',
      },
    ],
  };
}

// Public routes are registered BEFORE /:id so Express does not match
// "by-slug" as an id value and trip the auth middleware.

// GET /api/funnels/by-slug/:slug
router.get('/by-slug/:slug', async (req: Request<{ slug: string }>, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug' });
    const [row] = await db
      .select({
        id: schema.funnel.id,
        slug: schema.funnel.slug,
        name: schema.funnel.name,
        description: schema.funnel.description,
        status: schema.funnel.status,
        config: schema.funnel.config,
      })
      .from(schema.funnel)
      .where(eq(schema.funnel.slug, slug))
      .limit(1);
    if (!row || row.status === 'archived') return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('Public funnel error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many submissions, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/funnels/by-slug/:slug/submit - anonymous lead submit
router.post('/by-slug/:slug/submit', submitLimiter, async (req: Request<{ slug: string }>, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug' });

    const [funnelRow] = await db
      .select({ id: schema.funnel.id, status: schema.funnel.status })
      .from(schema.funnel)
      .where(eq(schema.funnel.slug, slug))
      .limit(1);
    if (!funnelRow) return res.status(404).json({ error: 'Not found' });
    if (funnelRow.status === 'archived') return res.status(410).json({ error: 'Funnel archived' });

    const body = req.body || {};

    // DSGVO: privacy consent is mandatory whenever personal data is submitted.
    // Custom funnels without lead capture (no personal data) stay unaffected.
    const consentInput = body.consent && typeof body.consent === 'object' ? body.consent : {};
    const hasPersonalData = Boolean(
      body.email || body.name || body.phone || body.businessName ||
        body.websiteUrl || body.instagramHandle || body.gmbUrl,
    );
    if (hasPersonalData && consentInput.privacy !== true) {
      return res.status(400).json({ error: 'Einwilligung zur Datenschutzerklärung erforderlich' });
    }
    const privacyConsent = consentInput.privacy === true;
    const marketingConsent = consentInput.marketing === true;

    const websiteUrl = sanitizeString(body.websiteUrl, 500) || null;
    const instagramHandle = sanitizeString(body.instagramHandle, 100) || null;
    const gmbUrl = sanitizeString(body.gmbUrl, 500) || null;
    // GMB is not scraped (no enrichment implemented); only website/Instagram trigger enrichment.
    const hasScrapableInput = Boolean(websiteUrl || instagramHandle);

    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
    const userId = session?.user?.id ?? null;

    const id = nanoid();
    const [inserted] = await db
      .insert(schema.lead)
      .values({
        id,
        funnelId: funnelRow.id,
        userId,
        name: sanitizeString(body.name, 200) || null,
        email: sanitizeString(body.email, 200) || null,
        phone: sanitizeString(body.phone, 50) || null,
        businessName: sanitizeString(body.businessName, 200) || null,
        websiteUrl,
        instagramHandle,
        gmbUrl,
        answers: body.answers && typeof body.answers === 'object' ? body.answers : {},
        scores: body.scores && typeof body.scores === 'object' ? body.scores : {},
        recommendation: sanitizeString(body.recommendation, 100) || null,
        kalkuPotential: body.kalkuPotential && typeof body.kalkuPotential === 'object' ? body.kalkuPotential : null,
        scrapeStatus: hasScrapableInput ? 'queued' : 'skipped',
        source: sanitizeString(body.source, 100) || 'funnel',
        status: 'new',
        utm: body.utm && typeof body.utm === 'object' ? body.utm : null,
      })
      .returning({ id: schema.lead.id });

    console.log(`[FUNNEL] New lead ${inserted.id} for funnel ${funnelRow.id}`);

    // Retrieve the full lead row so the PDF renderer has all fields
    const [leadRow] = await db
      .select()
      .from(schema.lead)
      .where(eq(schema.lead.id, inserted.id))
      .limit(1);

    const leadEmail = leadRow?.email;

    // Enrichment: scrape the provided website (branding signals) + best-effort
    // Instagram. Only data the user supplied is used. Bounded by internal timeouts.
    let scrapeData: ScrapeData | null = null;
    if (hasScrapableInput) {
      const rc = getRawClient();
      try {
        scrapeData = await enrichLead({ websiteUrl, instagramHandle });
        await rc`
          UPDATE lead
          SET scrape_data = ${JSON.stringify(scrapeData)}::jsonb,
              scrape_status = ${scrapeSucceeded(scrapeData) ? 'done' : 'error'}
          WHERE id = ${inserted.id}
        `;
      } catch (e) {
        console.error('[FUNNEL] enrichment failed:', e);
        await rc`UPDATE lead SET scrape_status = 'error' WHERE id = ${inserted.id}`.catch(() => undefined);
      }
    }

    // Persist consent for audit (DSGVO Art. 7). Non-fatal on failure.
    const consentIp = req.ip ?? null;
    if (privacyConsent) {
      await recordConsent({
        id: nanoid(),
        userId, // link to the user when logged in, so self-service can show/withdraw it
        leadId: inserted.id,
        type: 'privacy',
        textVersion: LEGAL_VERSIONS.privacy,
        ipAddress: consentIp,
      }).catch((e) => console.error('[FUNNEL] consent record failed:', e));
    }
    if (marketingConsent) {
      await recordConsent({
        id: nanoid(),
        userId,
        leadId: inserted.id,
        type: 'marketing',
        textVersion: LEGAL_VERSIONS.marketing,
        ipAddress: consentIp,
      }).catch((e) => console.error('[FUNNEL] marketing consent record failed:', e));
      if (leadEmail) {
        try {
          const sub = await getOrCreateSubscription(leadEmail, nanoid(), nanoid());
          // Double-opt-in: send confirmation mail only while pending (not already confirmed).
          if (sub?.status === 'pending' && sub.doi_token) {
            await sendDoiConfirmationEmail({ to: leadEmail, doiToken: sub.doi_token as string });
          }
        } catch (e) {
          console.error('[FUNNEL] DOI subscription/email failed:', e);
        }
      }
    }

    // Send PDF report email when the lead provided an email address
    if (leadEmail) {
      const rawClient = getRawClient();
      // Fetch funnel name for the PDF header
      const [funnelMeta] = await rawClient<{ name: string }[]>`
        SELECT name FROM funnel WHERE id = ${funnelRow.id} LIMIT 1
      `;
      const funnelName = funnelMeta?.name ?? 'BeautyFlow';

      try {
        const pdf = await renderLeadReportPdf({ funnelName, lead: { ...leadRow, scrapeData } as Parameters<typeof renderLeadReportPdf>[0]['lead'] });
        await sendLeadReportEmail({
          to: leadEmail,
          leadName: leadRow.name ?? '',
          funnelName,
          pdf,
        });
        await rawClient`
          UPDATE lead SET email_sent_at = NOW(), email_error = NULL WHERE id = ${inserted.id}
        `;
        console.log(`[FUNNEL] PDF email sent to ${leadEmail} for lead ${inserted.id}`);
      } catch (emailErr) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error(`[FUNNEL] Email failed for lead ${inserted.id}:`, msg);
        await rawClient`
          UPDATE lead SET email_error = ${msg} WHERE id = ${inserted.id}
        `.catch(() => undefined);
      }
    }

    res.status(201).json({ leadId: inserted.id });
  } catch (err) {
    console.error('Lead submit error:', err);
    res.status(500).json({ error: 'Submit failed' });
  }
});

// ============================================
// Authenticated CRUD
// ============================================

// GET /api/funnels - list mine, with on-demand leads count
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await db
      .select({
        id: schema.funnel.id,
        ownerId: schema.funnel.ownerId,
        name: schema.funnel.name,
        slug: schema.funnel.slug,
        description: schema.funnel.description,
        status: schema.funnel.status,
        config: schema.funnel.config,
        createdAt: schema.funnel.createdAt,
        updatedAt: schema.funnel.updatedAt,
        leadsCount: sql<number>`(SELECT COUNT(*)::int FROM ${schema.lead} WHERE ${schema.lead.funnelId} = ${schema.funnel.id})`.as('leadsCount'),
      })
      .from(schema.funnel)
      .where(eq(schema.funnel.ownerId, req.user!.id))
      .orderBy(desc(schema.funnel.updatedAt));
    res.json(rows);
  } catch (err) {
    console.error('List funnels error:', err);
    res.status(500).json({ error: 'List failed' });
  }
});

// POST /api/funnels - create
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const name = sanitizeString(req.body?.name, 100);
    const description = sanitizeString(req.body?.description, 500);
    const requestedSlug = sanitizeString(req.body?.slug, 100);
    const incomingConfig = req.body?.config;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const baseSlug = requestedSlug && isValidSlug(requestedSlug) ? requestedSlug : slugify(name);
    const slug = await ensureUniqueSlug(baseSlug);

    const id = nanoid();
    const config = incomingConfig && typeof incomingConfig === 'object' ? incomingConfig : emptyFunnelConfig();

    const [inserted] = await db
      .insert(schema.funnel)
      .values({
        id,
        ownerId: req.user!.id,
        name,
        slug,
        description,
        status: 'draft',
        config,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    console.error('Create funnel error:', err);
    res.status(500).json({ error: 'Create failed' });
  }
});

// GET /api/funnels/:id - one (mine)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const [row] = await db
      .select()
      .from(schema.funnel)
      .where(and(eq(schema.funnel.id, req.params.id), eq(schema.funnel.ownerId, req.user!.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('Get funnel error:', err);
    res.status(500).json({ error: 'Get failed' });
  }
});

// PATCH /api/funnels/:id - update
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const [existing] = await db
      .select()
      .from(schema.funnel)
      .where(and(eq(schema.funnel.id, req.params.id), eq(schema.funnel.ownerId, req.user!.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const updates: Partial<typeof schema.funnel.$inferInsert> = { updatedAt: new Date() };

    if (typeof req.body?.name === 'string') {
      const name = sanitizeString(req.body.name, 100);
      if (!name) return res.status(400).json({ error: 'Name cannot be empty' });
      updates.name = name;
    }
    if (typeof req.body?.description === 'string') {
      updates.description = sanitizeString(req.body.description, 500);
    }
    if (typeof req.body?.status === 'string' && ['draft', 'published', 'archived'].includes(req.body.status)) {
      updates.status = req.body.status;
    }
    if (typeof req.body?.slug === 'string') {
      const requestedSlug = sanitizeString(req.body.slug, 100);
      if (requestedSlug && requestedSlug !== existing.slug) {
        if (!isValidSlug(requestedSlug)) return res.status(400).json({ error: 'Invalid slug format' });
        updates.slug = await ensureUniqueSlug(requestedSlug);
      }
    }
    if (req.body?.config && typeof req.body.config === 'object') {
      updates.config = req.body.config;
    }

    const [row] = await db
      .update(schema.funnel)
      .set(updates)
      .where(eq(schema.funnel.id, existing.id))
      .returning();

    res.json(row);
  } catch (err) {
    console.error('Update funnel error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/funnels/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const result = await db
      .delete(schema.funnel)
      .where(and(eq(schema.funnel.id, req.params.id), eq(schema.funnel.ownerId, req.user!.id)))
      .returning({ id: schema.funnel.id });
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete funnel error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// GET /api/funnels/:id/leads - list leads of one of my funnels
router.get('/:id/leads', requireAuth, async (req: AuthenticatedRequest<{ id: string }>, res) => {
  try {
    const [own] = await db
      .select({ id: schema.funnel.id })
      .from(schema.funnel)
      .where(and(eq(schema.funnel.id, req.params.id), eq(schema.funnel.ownerId, req.user!.id)))
      .limit(1);
    if (!own) return res.status(404).json({ error: 'Not found' });

    const rows = await db
      .select()
      .from(schema.lead)
      .where(eq(schema.lead.funnelId, own.id))
      .orderBy(desc(schema.lead.createdAt))
      .limit(500);
    res.json(rows);
  } catch (err) {
    console.error('List leads error:', err);
    res.status(500).json({ error: 'List failed' });
  }
});

export default router;
