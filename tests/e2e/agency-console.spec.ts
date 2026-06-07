import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Agency self-service: an agency_admin creates an invite link; a new user who
// registers via that link lands in the agency's org; the agency sees them and
// can reset their password (org-scoped).
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ORG = `inv-org-${TS}`;
const AGENCY_EMAIL = `agency-${TS}@test.local`;
const CUST_EMAIL = `invcust-${TS}@test.local`;
const PW = 'Test1234!secure';

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  await sql`INSERT INTO organization (id, name, slug, parent_org_id, plan_id) VALUES (${ORG}, 'Invite Org', ${ORG}, 'default', 'basic') ON CONFLICT (id) DO NOTHING`;
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM org_invite WHERE org_id = ${ORG}`;
  await sql`DELETE FROM "user" WHERE email IN (${AGENCY_EMAIL}, ${CUST_EMAIL})`;
  await sql`DELETE FROM organization WHERE id = ${ORG}`;
  await sql.end();
});

async function register(page: Page, email: string, inviteSuffix = '') {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto(`/register${inviteSuffix}`);
  await page.getByPlaceholder('Ihr Name').fill('Agency Tester');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });
}

test('agency invite link onboards a customer into the agency org + scoped pw reset', async ({ browser }) => {
  // Agency admin: register, then promote to agency_admin of the test org.
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await register(ap, AGENCY_EMAIL);
  await sql`UPDATE "user" SET role = 'agency_admin', org_id = ${ORG}, approved = true WHERE email = ${AGENCY_EMAIL}`;

  await ap.goto('/agency');
  await expect(ap.getByRole('heading', { name: 'Agentur-Konsole' })).toBeVisible();
  await ap.getByRole('button', { name: 'Einladungslink erstellen' }).click();
  await expect.poll(async () => (await sql`SELECT COUNT(*)::int AS c FROM org_invite WHERE org_id = ${ORG}`)[0].c, { timeout: 10000 }).toBeGreaterThan(0);
  const [{ token }] = (await sql`SELECT token FROM org_invite WHERE org_id = ${ORG} ORDER BY created_at DESC LIMIT 1`) as unknown as { token: string }[];

  // New customer registers via the invite link.
  const cctx = await browser.newContext();
  const cp = await cctx.newPage();
  await cp.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await cp.goto(`/invite/${token}`);
  await expect(cp.getByRole('heading', { name: /Willkommen/ })).toBeVisible({ timeout: 10000 });
  await cp.getByRole('link', { name: 'Konto erstellen' }).click();
  await cp.waitForURL(/\/register/);
  await register(cp, CUST_EMAIL, `?invite=${token}`);

  // The new customer landed in the agency org (not 'beautyflow').
  await expect.poll(async () => (await sql`SELECT org_id FROM "user" WHERE email = ${CUST_EMAIL}`)[0]?.org_id, { timeout: 10000 }).toBe(ORG);
  await cctx.close();

  // The agency sees the new customer + can reset their password (scoped).
  await ap.goto('/agency');
  await expect(ap.getByText(CUST_EMAIL)).toBeVisible({ timeout: 10000 });
  await ap.getByText(CUST_EMAIL).locator('xpath=ancestor::li').getByRole('button', { name: 'Passwort' }).click();
  await ap.getByPlaceholder('Neues Passwort (min. 8 Zeichen)').fill('AgencyReset9!');
  await ap.getByRole('button', { name: 'Passwort setzen' }).click();
  await expect(ap.getByText('Passwort gesetzt.')).toBeVisible({ timeout: 10000 });
  await actx.close();
});
