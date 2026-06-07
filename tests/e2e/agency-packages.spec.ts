import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Per-agency packages: an agency_admin creates a package; a customer of that org
// sees it on /dashboard/plan. Other orgs don't see it (org-scoped).
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ORG = `pkg-org-${TS}`;
const AGENCY_EMAIL = `pkg-agency-${TS}@test.local`;
const CUST_EMAIL = `pkg-cust-${TS}@test.local`;
const PKG = `PkgTest-${TS}`;

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  await sql`INSERT INTO organization (id, name, slug, parent_org_id) VALUES (${ORG}, 'Pkg Org', ${ORG}, 'default') ON CONFLICT (id) DO NOTHING`;
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM org_package WHERE org_id = ${ORG}`;
  await sql`DELETE FROM "user" WHERE email IN (${AGENCY_EMAIL}, ${CUST_EMAIL})`;
  await sql`DELETE FROM organization WHERE id = ${ORG}`;
  await sql.end();
});

async function register(page: Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Pkg Tester');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill('Test1234!secure');
  await page.getByPlaceholder('Passwort wiederholen').fill('Test1234!secure');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });
}

test('agency creates a package; its customer sees it under Pakete', async ({ browser }) => {
  // Agency admin creates a package via the console.
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await register(ap, AGENCY_EMAIL);
  await sql`UPDATE "user" SET role = 'agency_admin', org_id = ${ORG}, approved = true WHERE email = ${AGENCY_EMAIL}`;
  await ap.goto('/agency');
  await ap.getByRole('button', { name: '+ Paket' }).click();
  await ap.getByPlaceholder('Name (z.B. Basic)').fill(PKG);
  await ap.getByPlaceholder('Features — eine pro Zeile').fill('Feature A\nFeature B');
  await ap.getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(async () => (await sql`SELECT COUNT(*)::int AS c FROM org_package WHERE org_id = ${ORG} AND name = ${PKG}`)[0].c, { timeout: 10000 }).toBe(1);
  await actx.close();

  // A customer of that org sees the package on /dashboard/plan.
  const cctx = await browser.newContext();
  const cp = await cctx.newPage();
  await register(cp, CUST_EMAIL);
  await sql`UPDATE "user" SET org_id = ${ORG} WHERE email = ${CUST_EMAIL}`;
  await cp.goto('/dashboard/plan');
  await expect(cp.getByRole('heading', { name: 'Pakete' })).toBeVisible();
  await expect(cp.getByText(PKG)).toBeVisible({ timeout: 10000 });
  await expect(cp.getByText('Feature A')).toBeVisible();
  await cctx.close();
});
