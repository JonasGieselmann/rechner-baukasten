import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import path from 'path';

const SLUG = 'e2e-walkthrough';
const SUPERADMIN_EMAIL = `e2e-superadmin-${Date.now()}@test.local`;
const SUPERADMIN_NAME = 'E2E Super Admin';
const SUPERADMIN_PW = 'Test1234!secure';
const CUSTOMER_EMAIL = `e2e-customer-${Date.now()}@test.local`;
const CUSTOMER_NAME = 'E2E Customer';
const CUSTOMER_PW = 'Test1234!secure';

const SCREENSHOTS = path.resolve(process.cwd(), 'test-results', 'walkthrough');

let sql: ReturnType<typeof postgres>;
let funnelId: string;

test.beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');
  sql = postgres(dbUrl);

  // Seed owner user + funnel
  await sql`INSERT INTO "user" (id, name, email, role, approved) VALUES ('e2e-walk-owner', 'Walk Owner', 'walk-owner@e2e.local', 'super_admin', true) ON CONFLICT (id) DO NOTHING`;
  await sql`DELETE FROM funnel WHERE slug = ${SLUG}`;
  const rows = await sql`
    INSERT INTO funnel (id, owner_id, name, slug, description, status, config)
    VALUES (
      gen_random_uuid()::text,
      'e2e-walk-owner',
      'E2E Walkthrough',
      ${SLUG},
      '',
      'published',
      ${sql.json({
        theme: { mode: 'light', primaryColor: '#0F2F5B', accentColor: '#7EC8F3', backgroundColor: '#F7FAFF', cardColor: '#FFFFFF', textColor: '#0F2F5B', borderColor: '#E0E7F2' },
        settings: { progressBar: true, ctaCalendarUrl: '' },
        steps: [
          { id: 'intro', type: 'intro', title: 'Sehen Sie Ihr Profil in 8 *Dimensionen*', body: 'In 2 Minuten erkennen Sie Ihren größten Wachstumshebel.', ctaLabel: 'Jetzt Potenzial erkunden' },
          { id: 'lead', type: 'lead-capture', title: 'Damit wir parallel Ihre Sichtbarkeit prüfen können', body: '', fields: [
            { key: 'name', label: 'Ihr Name', required: true },
            { key: 'email', label: 'E-Mail', required: true },
            { key: 'businessName', label: 'Praxisname', required: true },
          ], ctaLabel: 'Weiter' },
          { id: 'q1', type: 'question', question: 'Wie viele Bewertungen haben Sie?', dimension: 'trust', options: [{ id: 'a', label: 'Keine', score: 0 }, { id: 'b', label: 'Über 50', score: 100 }], required: true },
          { id: 'r', type: 'result-spider', title: 'Ihr Ergebnis', showKalkuChart: false, cliffhanger: '' },
          { id: 'cta', type: 'cta-booking', title: 'Strategiegespräch', body: 'Lass uns reden.', ctaLabel: 'Termin buchen', calendarUrl: '' },
        ],
      })}
    )
    RETURNING id
  `;
  funnelId = rows[0].id as string;
});

test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM lead WHERE funnel_id = ${funnelId}`;
  await sql`DELETE FROM funnel WHERE id = ${funnelId}`;
  await sql`DELETE FROM "user" WHERE email IN (${SUPERADMIN_EMAIL}, ${CUSTOMER_EMAIL})`;
  await sql.end();
});

test('1. funnel intro with Spinnennetz', async ({ page }: { page: Page }) => {
  await page.goto(`/funnel/${SLUG}`);
  await page.waitForTimeout(1500);
  await expect(page.locator('em', { hasText: 'Dimensionen' })).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/01-intro-spinnennetz.png`, fullPage: true });
});

test('2. funnel result with weiter to cta-booking', async ({ page }: { page: Page }) => {
  await page.goto(`/funnel/${SLUG}`);
  await page.getByRole('button', { name: 'Jetzt Potenzial erkunden' }).click();
  await page.getByTestId('lead-field-name').fill('Test Person');
  await page.getByTestId('lead-field-email').fill('test@example.com');
  await page.getByTestId('lead-field-businessName').fill('Test Praxis');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Über 50' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Ihr Ergebnis')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/02-result-spider.png`, fullPage: true });
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Strategiegespräch')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/03-cta-booking.png`, fullPage: true });
});

test('3. customer dashboard with icons and sidebar', async ({ page }: { page: Page }) => {
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill(CUSTOMER_NAME);
  await page.getByPlaceholder('ihre@email.de').fill(CUSTOMER_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(CUSTOMER_PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(CUSTOMER_PW);
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });
  if (page.url().endsWith('/admin')) {
    // Was made super_admin (no prior super_admin). Force customer role for the test.
    await sql`UPDATE "user" SET role = 'customer' WHERE email = ${CUSTOMER_EMAIL}`;
    await page.goto('/dashboard');
  }
  await expect(page.locator('header').getByText('Beauty').first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/04-dashboard-overview.png`, fullPage: true });
  await page.getByRole('link', { name: /Leitfaden/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS}/05-dashboard-leitfaden.png`, fullPage: true });
  await page.getByRole('link', { name: /Account/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS}/06-dashboard-account.png`, fullPage: true });
});

test('4. admin settings page', async ({ page }: { page: Page }) => {
  // Register a new super_admin (or promote an existing user)
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill(SUPERADMIN_NAME);
  await page.getByPlaceholder('ihre@email.de').fill(SUPERADMIN_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(SUPERADMIN_PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(SUPERADMIN_PW);
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${SUPERADMIN_EMAIL}`;
  await page.goto('/admin/settings');
  await page.waitForTimeout(800);
  await expect(page.getByText(/SMTP/i).first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/07-admin-settings.png`, fullPage: true });
});
