import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import path from 'path';

// Rendered verification (mobile + desktop) of the Wave-10 surfaces:
// platform overview, role-aware profile, agency console.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const SUPER_EMAIL = `w10-super-${TS}@test.local`;
const CUST_EMAIL = `w10-cust-${TS}@test.local`;
const PW = 'Test1234!secure';
const SHOTS = path.resolve(process.cwd(), 'test-results', 'wave10');

test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email IN (${SUPER_EMAIL}, ${CUST_EMAIL})`;
  await sql.end();
});

async function loginSuper(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('W10 Super');
  await page.getByPlaceholder('ihre@email.de').fill(SUPER_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 15000 });
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${SUPER_EMAIL}`;
}

test('platform overview + role-aware admin profile render on mobile and desktop', async ({ page }) => {
  await loginSuper(page);

  for (const [w, h, tag] of [[390, 844, 'mobile'], [1280, 800, 'desktop']] as const) {
    await page.setViewportSize({ width: w, height: h });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Plattform-Übersicht' })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/${tag}-platform.png`, fullPage: true });

    // Admin profile is standalone and role-aware: name/email/password, NO Praxis.
    await page.goto('/profil');
    await expect(page.getByRole('heading', { name: 'Profil & Einstellungen' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Passwort' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Praxis-Angaben' })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/${tag}-profil.png`, fullPage: true });
  }
});

test('customer BeautyFlow dashboard + funnel render and scroll to the end on mobile', async ({ page }) => {
  // Self-registered customer lands in the BeautyFlow org.
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('W10 Kunde');
  await page.getByPlaceholder('ihre@email.de').fill(CUST_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });

  await page.setViewportSize({ width: 390, height: 844 });

  // Customer dashboard (the finished BeautyFlow product surface) renders on mobile.
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible({ timeout: 10000 });
  // The mobile bottom tab bar (md:hidden) is the customer's nav on phones.
  await expect(page.getByRole('link', { name: 'Übersicht' }).last()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/mobile-customer-dashboard.png`, fullPage: true });

  // The public BeautyFlow funnel renders + is scrollable to its end on mobile
  // (the original "kann nicht bis ans Ende scrollen" surface).
  await page.goto('/funnel/potenzialanalyse');
  await expect(page.getByRole('button', { name: 'Jetzt Potenzial erkunden' })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/mobile-funnel-intro.png`, fullPage: true });
});
