import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Wave 12: Funnels live in the agency/org UI, org-scoped. Cross-tenant isolation
// on FRESH orgs: agency_admin sees only their org; super_admin ?orgId drill-in is
// scoped to the targeted org and cannot reach another org's funnels.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ORG_A = `w12a-${TS}`;
const ORG_B = `w12b-${TS}`;
const FUNNEL_A = `Funnel-A-${TS}`;
const FUNNEL_B = `Funnel-B-${TS}`;
const SUPER_EMAIL = `w12-super-${TS}@test.local`;
const AGENCY_EMAIL = `w12-agency-${TS}@test.local`;
const PW = 'Test1234!secure';

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  for (const [id, name] of [[ORG_A, 'Org A ' + TS], [ORG_B, 'Org B ' + TS]] as const) {
    await sql`INSERT INTO organization (id, name, slug, parent_org_id, plan_id) VALUES (${id}, ${name}, ${id}, 'default', 'basic') ON CONFLICT (id) DO NOTHING`;
  }
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM funnel WHERE org_id IN (${ORG_A}, ${ORG_B})`;
  await sql`DELETE FROM "user" WHERE email IN (${SUPER_EMAIL}, ${AGENCY_EMAIL})`;
  await sql`DELETE FROM organization WHERE id IN (${ORG_A}, ${ORG_B})`;
  await sql.end();
});

async function register(page: Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('W12 Tester');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard|agency)(\?|\/|$)/, { timeout: 15000 });
}

test('agency funnels are org-scoped; super_admin ?orgId drill-in is isolated', async ({ browser }) => {
  // super_admin + a funnel in each org (owned by them, minimal config).
  const sctx = await browser.newContext();
  const sp = await sctx.newPage();
  await register(sp, SUPER_EMAIL);
  const [{ id: superId }] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${SUPER_EMAIL}`;
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${SUPER_EMAIL}`;
  const cfg = JSON.stringify({ theme: {}, settings: {}, steps: [] });
  await sql`INSERT INTO funnel (id, owner_id, org_id, name, slug, description, status, config) VALUES (${'fa' + TS}, ${superId}, ${ORG_A}, ${FUNNEL_A}, ${'fa-' + TS}, '', 'draft', ${cfg}::jsonb)`;
  await sql`INSERT INTO funnel (id, owner_id, org_id, name, slug, description, status, config) VALUES (${'fb' + TS}, ${superId}, ${ORG_B}, ${FUNNEL_B}, ${'fb-' + TS}, '', 'draft', ${cfg}::jsonb)`;

  // super_admin drills into ORG_A → sees A's funnel, NOT B's.
  await sp.goto(`/agency/funnels?orgId=${ORG_A}`);
  await expect(sp.getByText(FUNNEL_A)).toBeVisible({ timeout: 10000 });
  await expect(sp.getByText(FUNNEL_B)).toHaveCount(0);
  // Switch the drill-in to ORG_B → sees B's funnel, NOT A's (param-scoped).
  await sp.goto(`/agency/funnels?orgId=${ORG_B}`);
  await expect(sp.getByText(FUNNEL_B)).toBeVisible({ timeout: 10000 });
  await expect(sp.getByText(FUNNEL_A)).toHaveCount(0);
  await sctx.close();

  // agency_admin of ORG_A sees only A's funnel (no ?orgId needed, own org).
  const actx = await browser.newContext();
  const ap = await actx.newPage();
  await register(ap, AGENCY_EMAIL);
  await sql`UPDATE "user" SET role = 'agency_admin', org_id = ${ORG_A}, approved = true WHERE email = ${AGENCY_EMAIL}`;
  await ap.goto('/agency/funnels');
  await expect(ap.getByText(FUNNEL_A)).toBeVisible({ timeout: 10000 });
  await expect(ap.getByText(FUNNEL_B)).toHaveCount(0);
  // The agency nav (Funnels/Dashboards) is reachable from the console.
  await ap.goto('/agency');
  await expect(ap.locator('header').getByRole('link', { name: 'Funnels' })).toBeVisible();
  await actx.close();
});
