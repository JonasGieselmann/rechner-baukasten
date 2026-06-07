import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// B1: Kalku platform overview (super_admin lands above the orgs) + drill-in.
// B2: an agency invites its own TEAM (agency_admin) — not just customers.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ORG = `pt-org-${TS}`;
const SUPER_EMAIL = `pt-super-${TS}@test.local`;
const AGENCY_EMAIL = `pt-agency-${TS}@test.local`;
const CUST_EMAIL = `pt-cust-${TS}@test.local`;
const TEAM_EMAIL = `pt-team-${TS}@test.local`;
const PW = 'Test1234!secure';

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  await sql`INSERT INTO organization (id, name, slug, parent_org_id, plan_id) VALUES (${ORG}, ${'Platform Test Org ' + TS}, ${ORG}, 'default', 'basic') ON CONFLICT (id) DO NOTHING`;
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM org_invite WHERE org_id = ${ORG}`;
  await sql`DELETE FROM "user" WHERE email IN (${SUPER_EMAIL}, ${AGENCY_EMAIL}, ${CUST_EMAIL}, ${TEAM_EMAIL})`;
  await sql`DELETE FROM organization WHERE id = ${ORG}`;
  await sql.end();
});

async function register(page: Page, email: string, suffix = '') {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto(`/register${suffix}`);
  await page.getByPlaceholder('Ihr Name').fill('PT Tester');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  // After a team invite the new account is an agency_admin → lands on /agency;
  // otherwise /dashboard (customer) or /admin (super_admin).
  await page.waitForURL(/\/(admin|dashboard|agency)(\?|\/|$)/, { timeout: 15000 });
}

test('super_admin lands on the platform overview and drills into an org console', async ({ browser }) => {
  // Seed a customer in the test org.
  const cctx = await browser.newContext();
  const cp = await cctx.newPage();
  await register(cp, CUST_EMAIL);
  await sql`UPDATE "user" SET role = 'customer', org_id = ${ORG} WHERE email = ${CUST_EMAIL}`;
  await cctx.close();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await register(page, SUPER_EMAIL);
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${SUPER_EMAIL}`;

  // Lands on the platform overview (NOT the calculator builder).
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Plattform-Übersicht' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Plattform-Ebene')).toBeVisible();
  await expect(page.getByText(`Platform Test Org ${TS}`)).toBeVisible();

  // Drill into the org's console.
  await page.getByText(`Platform Test Org ${TS}`).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
    .getByRole('button', { name: 'Konsole öffnen' }).click();
  await page.waitForURL(/\/agency\?orgId=/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Agentur-Konsole' })).toBeVisible();
  // The org's customer is visible in the scoped console.
  await expect(page.getByText(CUST_EMAIL)).toBeVisible({ timeout: 10000 });
  await ctx.close();
});

test('agency invites a TEAM member who becomes an agency_admin of the org', async ({ browser }) => {
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await register(ap, AGENCY_EMAIL);
  await sql`UPDATE "user" SET role = 'agency_admin', org_id = ${ORG}, approved = true WHERE email = ${AGENCY_EMAIL}`;

  await ap.goto('/agency');
  await ap.getByTestId('invite-role').selectOption('agency_admin');
  await ap.getByRole('button', { name: 'Link erstellen' }).click();
  await expect.poll(async () => (await sql`SELECT COUNT(*)::int AS c FROM org_invite WHERE org_id = ${ORG} AND role = 'agency_admin'`)[0].c, { timeout: 10000 }).toBeGreaterThan(0);
  const [{ token }] = (await sql`SELECT token FROM org_invite WHERE org_id = ${ORG} AND role = 'agency_admin' ORDER BY created_at DESC LIMIT 1`) as unknown as { token: string }[];

  // New user registers via the team invite link.
  const tctx = await browser.newContext();
  const tp = await tctx.newPage();
  await register(tp, TEAM_EMAIL, `?invite=${token}`);
  // They become an agency_admin of the org (the team, not a customer).
  await expect.poll(async () => (await sql`SELECT role, org_id FROM "user" WHERE email = ${TEAM_EMAIL}`)[0], { timeout: 10000 })
    .toMatchObject({ role: 'agency_admin', org_id: ORG });
  // Team invites are SINGLE-USE: the consumed token must now be invalid.
  const reval = await tp.request.get(`/api/invites/${token}`);
  expect((await reval.json()).valid).toBe(false);
  await tctx.close();

  // The agency now sees them under "Ihr Team".
  await ap.goto('/agency');
  await expect(ap.getByText(TEAM_EMAIL)).toBeVisible({ timeout: 10000 });
  await actx.close();
});
