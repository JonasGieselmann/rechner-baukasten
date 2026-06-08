import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Wave 12 backend checkpoint: funnels/dashboards are org-scoped for BOTH roles.
// agency_admin -> own org only; super_admin -> the ?orgId they drill into, never
// global, and cannot reach another org by id. Fresh orgs (no stale data).
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ORG_A = `w12a-${TS}`;
const ORG_B = `w12b-${TS}`;
const SUPER = `w12super-${TS}@test.local`;
const AGENCY_A = `w12agencya-${TS}@test.local`;
const PW = 'Test1234!secure';

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  for (const id of [ORG_A, ORG_B]) {
    await sql`INSERT INTO organization (id, name, slug, parent_org_id, plan_id) VALUES (${id}, ${'W12 ' + id}, ${id}, 'default', 'basic') ON CONFLICT (id) DO NOTHING`;
  }
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM funnel WHERE org_id IN (${ORG_A}, ${ORG_B})`;
  await sql`DELETE FROM "user" WHERE email IN (${SUPER}, ${AGENCY_A})`;
  await sql`DELETE FROM organization WHERE id IN (${ORG_A}, ${ORG_B})`;
  await sql.end();
});

async function register(page: Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('W12');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard|agency)(\?|\/|$)/, { timeout: 15000 });
}

test('funnels: super_admin ?orgId isolation + create-into-target + no global', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await register(page, SUPER);
  await sql`UPDATE "user" SET role='super_admin', approved=true WHERE email=${SUPER}`;
  const req = page.request;

  // Create one funnel in each org via ?orgId (tests create-into-target-org).
  const ra = await req.post(`/api/funnels?orgId=${ORG_A}`, { data: { name: 'Funnel A' } });
  expect(ra.status()).toBe(201);
  const fa = await ra.json();
  const rb = await req.post(`/api/funnels?orgId=${ORG_B}`, { data: { name: 'Funnel B' } });
  expect(rb.status()).toBe(201);
  const fb = await rb.json();
  expect(fa.orgId ?? fa.org_id).toBe(ORG_A);
  expect(fb.orgId ?? fb.org_id).toBe(ORG_B);

  // List scoped to A shows A's funnel, not B's.
  const listA = await (await req.get(`/api/funnels?orgId=${ORG_A}`)).json();
  const idsA = listA.map((f: { id: string }) => f.id);
  expect(idsA).toContain(fa.id);
  expect(idsA).not.toContain(fb.id);

  // No ?orgId -> empty (no global super_admin leak).
  const listNone = await (await req.get('/api/funnels')).json();
  expect(Array.isArray(listNone) ? listNone.length : -1).toBe(0);

  // Operating org A cannot reach org B's funnel by id.
  expect((await req.get(`/api/funnels/${fb.id}?orgId=${ORG_A}`)).status()).toBe(404);
  // But CAN reach it when operating org B.
  expect((await req.get(`/api/funnels/${fb.id}?orgId=${ORG_B}`)).status()).toBe(200);
  await ctx.close();
});

test('funnels: agency_admin sees only own org, ignores ?orgId of another org', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await register(page, AGENCY_A);
  await sql`UPDATE "user" SET role='agency_admin', org_id=${ORG_A}, approved=true WHERE email=${AGENCY_A}`;
  const req = page.request;

  // agency_admin of A creates a funnel -> lands in A regardless of any ?orgId.
  const createRes = await req.post(`/api/funnels?orgId=${ORG_B}`, { data: { name: 'Agency A Funnel' } });
  const createBody = await createRes.text();
  expect(createRes.status(), createBody).toBe(201);
  const created = JSON.parse(createBody);
  expect(created.orgId ?? created.org_id).toBe(ORG_A); // ?orgId=B ignored for agency_admin

  // Listing with ?orgId=B is IGNORED for agency_admin — they still get their own
  // org's list, which contains the funnel they just created.
  const list = await (await req.get(`/api/funnels?orgId=${ORG_B}`)).json();
  expect(Array.isArray(list)).toBe(true);
  expect(list.map((f: { id: string }) => f.id)).toContain(created.id);
  await ctx.close();
});
