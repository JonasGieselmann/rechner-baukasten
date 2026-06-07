import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Admin creates a user directly (email+password+role+org); the created
// agency_admin can then log in and lands on the Agency Console.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ADMIN_EMAIL = `crt-admin-${TS}@test.local`;
const NEW_EMAIL = `crt-alen-${TS}@test.local`;
const NEW_PW = 'AlenPass9!secure';

test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email IN (${ADMIN_EMAIL}, ${NEW_EMAIL})`;
  await sql.end();
});

async function register(page: Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Crt Admin');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill('Test1234!secure');
  await page.getByPlaceholder('Passwort wiederholen').fill('Test1234!secure');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });
}

test('super_admin creates an agency_admin who can log in and reach /agency', async ({ browser }) => {
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await register(ap, ADMIN_EMAIL);
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${ADMIN_EMAIL}`;

  await ap.goto('/admin/users');
  await ap.getByRole('button', { name: '+ Nutzer anlegen' }).click();
  await ap.getByPlaceholder('Name').fill('Alen Test');
  await ap.getByPlaceholder('E-Mail').fill(NEW_EMAIL);
  await ap.getByPlaceholder('Passwort (min. 8 Zeichen)').fill(NEW_PW);
  await ap.getByTestId('create-role').selectOption('agency_admin');
  await ap.getByTestId('create-org').selectOption('beautyflow').catch(() => undefined);
  await ap.getByRole('button', { name: 'Nutzer anlegen', exact: true }).click();

  await expect.poll(async () => {
    const r = await sql`SELECT role, org_id FROM "user" WHERE email = ${NEW_EMAIL}`;
    return r[0] ? `${r[0].role}|${r[0].org_id}` : null;
  }, { timeout: 10000 }).toMatch(/^agency_admin\|/);
  await actx.close();

  // The created agency_admin logs in -> lands on /agency.
  const lctx = await browser.newContext();
  const lp = await lctx.newPage();
  await lp.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await lp.goto('/login');
  await lp.getByPlaceholder('ihre@email.de').fill(NEW_EMAIL);
  await lp.getByPlaceholder('••••••••').fill(NEW_PW);
  await lp.getByRole('button', { name: 'Anmelden' }).click();
  await lp.waitForURL(/\/agency\/?$/, { timeout: 15000 });
  await expect(lp.getByRole('heading', { name: 'Agentur-Konsole' })).toBeVisible();
  await lctx.close();
});
