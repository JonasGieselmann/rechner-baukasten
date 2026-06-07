import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Wave 2: dashboard<->funnel separation, plans tab, legal relocation.
const TS = Date.now();
const EMAIL = `e2e-wl-${TS}@test.local`;
const PW = 'Test1234!secure';
const ADMIN = 'e2e-wl-admin';
const FUNNEL = 'e2e-wl-funnel';
const DASH = 'e2e-wl-dash';

let sql: ReturnType<typeof postgres>;

const CONFIG = {
  theme: { mode: 'light', primaryColor: '#0F2F5B', accentColor: '#7EC8F3', backgroundColor: '#F7FAFF', cardColor: '#FFFFFF', textColor: '#0F2F5B', borderColor: '#E0E7F2' },
  settings: { progressBar: true, ctaCalendarUrl: '' },
  steps: [{ id: 'i', type: 'intro', title: 'Hallo', ctaLabel: 'Los' }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('bf-cookie-notice-ack', '1');
    } catch {
      /* noop */
    }
  });
});

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  // ADMIN stays in the platform org (Layer One = 'default'); the white-label
  // funnel + dashboard live in the BeautyFlow customer org, where self-registered
  // customers now land (initBeautyflowTenant).
  await sql`INSERT INTO "user" (id, name, email, email_verified, role, approved, org_id) VALUES (${ADMIN}, 'WL Admin', 'wl-admin@e2e.local', true, 'super_admin', true, 'default') ON CONFLICT (id) DO NOTHING`;
  await sql`DELETE FROM dashboard_funnel WHERE dashboard_id = ${DASH}`;
  await sql`DELETE FROM dashboard WHERE id = ${DASH}`;
  await sql`DELETE FROM funnel WHERE id = ${FUNNEL}`;
  await sql`INSERT INTO funnel (id, owner_id, org_id, name, slug, status, config) VALUES (${FUNNEL}, ${ADMIN}, 'beautyflow', 'WL Test Funnel', 'wl-test-funnel', 'published', ${sql.json(CONFIG)})`;
  await sql`INSERT INTO dashboard (id, org_id, name, description) VALUES (${DASH}, 'beautyflow', 'WL Dashboard', '')`;
  await sql`INSERT INTO dashboard_funnel (id, dashboard_id, funnel_id, position) VALUES (${'e2e-wl-link'}, ${DASH}, ${FUNNEL}, 0)`;
});

test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM dashboard_funnel WHERE dashboard_id = ${DASH}`;
  await sql`DELETE FROM dashboard WHERE id = ${DASH}`;
  await sql`DELETE FROM funnel WHERE id = ${FUNNEL}`;
  await sql`DELETE FROM "user" WHERE email = ${EMAIL}`;
  await sql`DELETE FROM "user" WHERE id = ${ADMIN}`;
  await sql.end();
});

test('white-label: dashboard shows multiple funnels, plans tab, legal relocation', async ({ page }: { page: Page }) => {
  // Register an end-customer (sentinel admin exists -> customer path)
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('WL Kunde');
  await page.getByPlaceholder('ihre@email.de').fill(EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });

  // Assign the seeded dashboard to this customer (and pin to the BeautyFlow org,
  // matching where self-registered customers land), then reload.
  await sql`UPDATE "user" SET dashboard_id = ${DASH}, org_id = 'beautyflow' WHERE email = ${EMAIL}`;
  await page.goto('/dashboard');

  // Dashboard <-> Funnel separation: the assigned dashboard's funnel shows up
  await expect(page.getByText('Ihre Analyse-Tools')).toBeVisible();
  await expect(page.getByText('WL Test Funnel')).toBeVisible();

  // Packages tab (org-bound agency packages — no Kalku pricing tier)
  await page.goto('/dashboard/plan');
  await expect(page.getByRole('heading', { name: 'Pakete' })).toBeVisible();
  // No prices are shown anywhere.
  await expect(page.getByText('/ Monat')).toHaveCount(0);
  await expect(page.getByText('€')).toHaveCount(0);

  // Legal relocation: Rechtliches lives under Account now (not a top nav tab)
  await page.goto('/dashboard/account');
  await expect(page.getByText('Rechtliches & Datenschutz')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Plan', exact: true })).toBeVisible();
});
