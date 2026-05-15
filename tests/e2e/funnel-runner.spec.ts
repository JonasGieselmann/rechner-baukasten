import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

const SLUG = 'e2e-funnel-runner';
const USER_ID = 'e2e-user';
const FUNNEL_CONFIG = {
  theme: {
    mode: 'light',
    primaryColor: '#0a0a0a',
    accentColor: '#7EC8F3',
    backgroundColor: '#ffffff',
    cardColor: '#f7f7f8',
    textColor: '#0a0a0a',
    borderColor: '#e6e8eb',
  },
  settings: {
    progressBar: true,
    ctaCalendarUrl: 'https://cal.com/test',
    submitWebhookUrl: '',
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
      title: 'Dein Ergebnis',
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
  await sql`DELETE FROM "user" WHERE id = ${USER_ID}`;
  await sql.end();
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

  await expect(page.getByText('Dein Ergebnis')).toBeVisible();

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
