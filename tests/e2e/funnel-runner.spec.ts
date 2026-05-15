import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

const SLUG = 'e2e-funnel-runner';
const USER_ID = 'e2e-user';
const BRAND_THEME = {
  mode: 'light',
  primaryColor: '#0F2F5B',
  accentColor: '#7EC8F3',
  backgroundColor: '#F7FAFF',
  cardColor: '#FFFFFF',
  textColor: '#0F2F5B',
  borderColor: '#E0E7F2',
};

const FUNNEL_CONFIG = {
  theme: BRAND_THEME,
  settings: {
    progressBar: true,
    ctaCalendarUrl: 'https://cal.com/test',
  },
  steps: [
    {
      id: 's1',
      type: 'intro',
      title: 'Hi',
      body: 'Test funnel',
      ctaLabel: 'Los',
    },
    {
      id: 's2',
      type: 'lead-capture',
      title: 'Daten',
      body: '',
      fields: [
        { key: 'name', label: 'Name', required: true },
        { key: 'email', label: 'Mail', required: true },
      ],
      ctaLabel: 'Weiter',
    },
    {
      id: 's3',
      type: 'question',
      question: 'Frage 1',
      dimension: 'website',
      options: [
        { id: 'o1', label: 'Antwort A', score: 80 },
        { id: 'o2', label: 'Antwort B', score: 20 },
      ],
      required: true,
    },
    {
      id: 's4',
      type: 'result-spider',
      title: 'Ihr Ergebnis',
      body: '',
      showKalkuChart: false,
      cliffhanger: '',
    },
  ],
};

let sql: ReturnType<typeof postgres>;
let funnelId: string;

test.beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');
  sql = postgres(dbUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      approved BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS funnel (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      config JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS lead (
      id TEXT PRIMARY KEY,
      funnel_id TEXT NOT NULL REFERENCES funnel(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      phone TEXT,
      business_name TEXT,
      website_url TEXT,
      instagram_handle TEXT,
      gmb_url TEXT,
      answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      recommendation TEXT,
      kalku_potential JSONB,
      scrape_data JSONB,
      scrape_status TEXT NOT NULL DEFAULT 'pending',
      pdf_url TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      utm JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    INSERT INTO "user" (id, name, email, email_verified, role, approved)
    VALUES (${USER_ID}, 'E2E User', 'e2e@test.local', true, 'user', true)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    DELETE FROM funnel WHERE slug = ${SLUG}
  `;

  const rows = await sql`
    INSERT INTO funnel (id, owner_id, name, slug, description, status, config)
    VALUES (
      gen_random_uuid()::text,
      ${USER_ID},
      'E2E Funnel Runner',
      ${SLUG},
      '',
      'published',
      ${sql.json(FUNNEL_CONFIG)}
    )
    RETURNING id
  `;
  if (!rows[0]) throw new Error('Funnel insert returned no rows');
  funnelId = rows[0].id as string;
  console.log('[e2e] setup complete, funnelId:', funnelId);
});

test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM lead WHERE funnel_id = ${funnelId}`;
  await sql`DELETE FROM funnel WHERE id = ${funnelId}`;
  // user and sql connection cleaned up in the second afterAll
});

test('should complete funnel flow and persist lead in database', async ({ page }: { page: Page }) => {
  await page.goto(`/funnel/${SLUG}`);

  await expect(page.getByText('Hi')).toBeVisible();
  await page.getByRole('button', { name: 'Los' }).click();

  await expect(page.getByText('Daten')).toBeVisible();
  const nameInput = page.getByTestId('lead-field-name');
  const emailInput = page.getByTestId('lead-field-email');
  await nameInput.fill('Max Mustermann');
  await emailInput.fill('max@example.com');
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Frage 1')).toBeVisible();
  await page.getByRole('button', { name: 'Antwort A' }).click();

  await expect(page.getByText('Ihr Ergebnis')).toBeVisible();

  await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 });

  await page.waitForTimeout(1500);

  const leads = await sql`
    SELECT name, email FROM lead
    WHERE funnel_id = ${funnelId}
    LIMIT 10
  `;

  expect(leads).toHaveLength(1);
  expect(leads[0].name).toBe('Max Mustermann');
  expect(leads[0].email).toBe('max@example.com');
});

// Second slug + funnel for the full path: hero with italic accent, calc-input,
// Kalku block in result-spider, CTA-booking step. Verifies the brand hero markup,
// that calc-input data lands in kalkuPotential, and the CTA appears at the end.
const FULL_SLUG = 'e2e-funnel-full';
let fullFunnelId: string;

const FULL_CONFIG = {
  theme: BRAND_THEME,
  settings: { progressBar: true, ctaCalendarUrl: 'https://cal.com/test-full' },
  steps: [
    { id: 'i1', type: 'intro', title: 'Sehen Sie Ihr Profil in 8 *Dimensionen*', body: 'Mini Analyse.', ctaLabel: 'Jetzt Potenzial erkunden' },
    { id: 'l1', type: 'lead-capture', title: 'Daten', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Mail', required: true }], ctaLabel: 'Weiter' },
    { id: 'q1', type: 'question', question: 'Wie viele Bewertungen haben Sie?', dimension: 'trust', options: [{ id: 't0', label: 'Keine', score: 0 }, { id: 't1', label: 'Viele', score: 100 }], required: true },
    { id: 'c1', type: 'calc-input', title: 'Termine pro Woche', label: 'Termine pro Woche', variableName: 'terminePerWeek', inputType: 'number', defaultValue: 20, min: 0, max: 200 },
    { id: 'c2', type: 'calc-input', title: 'Umsatz pro Termin', label: 'Umsatz pro Termin', variableName: 'umsatzProTermin', inputType: 'number', defaultValue: 100, min: 0, max: 1000, suffix: '€' },
    { id: 'c3', type: 'calc-input', title: 'Kapazität pro Woche', label: 'Kapazität pro Woche', variableName: 'kapazitaetPerWeek', inputType: 'number', defaultValue: 40, min: 0, max: 200 },
    { id: 'r1', type: 'result-spider', title: 'Ihr Ergebnis', showKalkuChart: true, cliffhanger: '' },
    { id: 'cta1', type: 'cta-booking', title: 'Termin buchen', body: 'Lass uns reden.', ctaLabel: 'Strategiegespraech buchen', calendarUrl: 'https://cal.com/test-full' },
  ],
};

test.beforeAll(async () => {
  await sql`DELETE FROM funnel WHERE slug = ${FULL_SLUG}`;
  const rows = await sql`
    INSERT INTO funnel (id, owner_id, name, slug, description, status, config)
    VALUES (gen_random_uuid()::text, ${USER_ID}, 'E2E Full', ${FULL_SLUG}, '', 'published', ${sql.json(FULL_CONFIG)})
    RETURNING id
  `;
  if (!rows[0]) throw new Error('Full funnel insert returned no rows');
  fullFunnelId = rows[0].id as string;
});

test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM lead WHERE funnel_id = ${fullFunnelId}`;
  await sql`DELETE FROM funnel WHERE id = ${fullFunnelId}`;
  await sql`DELETE FROM "user" WHERE id = ${USER_ID}`;
  await sql.end();
});

test('full path: hero with italic accent, calc-input, Kalku block, CTA, kalkuPotential in DB', async ({ page }: { page: Page }) => {
  await page.goto(`/funnel/${FULL_SLUG}`);

  // Hero renders the italicized accent word
  const italicAccent = page.locator('em', { hasText: 'Dimensionen' });
  await expect(italicAccent).toBeVisible();
  await page.screenshot({ path: 'test-results/funnel-runner-full/1-hero.png', fullPage: true });

  // CTA on the hero is the Navy pill with the brand label
  await page.getByRole('button', { name: 'Jetzt Potenzial erkunden' }).click();

  // Lead-capture
  await page.getByTestId('lead-field-name').fill('Anna Test');
  await page.getByTestId('lead-field-email').fill('anna@example.com');
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Question (single-select, auto-advances)
  await page.getByRole('button', { name: 'Viele' }).click();

  // Three calc-inputs
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Weiter' }).click();
  }

  // Result step: Kalku block and recommendation present
  await expect(page.getByText('Ihr Umsatz-Potenzial')).toBeVisible();
  await expect(page.getByText('Mehrumsatz pro Monat')).toBeVisible();
  await expect(page.getByText(/Skalierungsliga|Fundament|automatische Buchungen|qualifizierte Leads/)).toBeVisible();
  await page.screenshot({ path: 'test-results/funnel-runner-full/2-result.png', fullPage: true });

  // Submit fired, lead in DB with kalkuPotential
  await page.waitForTimeout(1500);
  const leads = await sql`
    SELECT name, email, recommendation, kalku_potential FROM lead
    WHERE funnel_id = ${fullFunnelId}
    LIMIT 10
  `;
  expect(leads).toHaveLength(1);
  expect(leads[0].name).toBe('Anna Test');
  expect(leads[0].email).toBe('anna@example.com');
  expect(leads[0].kalku_potential).not.toBeNull();
  expect((leads[0].kalku_potential as { delta: number }).delta).toBeGreaterThan(0);
  expect(leads[0].recommendation).toBeTruthy();
});
