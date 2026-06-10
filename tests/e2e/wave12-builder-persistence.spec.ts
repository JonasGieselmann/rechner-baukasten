import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Wave 12: builder calculators move from browser localStorage to server
// persistence (org-scoped). The proof that matters: create + edit in the UI,
// then a FRESH browser context (no localStorage, no cookies) still sees the
// calculator — list after re-login, and the public /embed/:id render.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ORG_A = `w12bp-a-${TS}`;
const ORG_B = `w12bp-b-${TS}`;
const AGENCY = `w12bp-agency-${TS}@test.local`;
const SUPER = `w12bp-super-${TS}@test.local`;
const PW = 'Test1234!secure';
const CALC_NAME = `Persistenz-Rechner ${TS}`;
const EDITED_HEADLINE = `Server statt localStorage ${TS}`;

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  for (const [id, name] of [[ORG_A, 'BP Org A ' + TS], [ORG_B, 'BP Org B ' + TS]] as const) {
    await sql`INSERT INTO organization (id, name, slug, parent_org_id, plan_id) VALUES (${id}, ${name}, ${id}, 'default', 'basic') ON CONFLICT (id) DO NOTHING`;
  }
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM builder_calculator WHERE org_id IN (${ORG_A}, ${ORG_B})`;
  await sql`DELETE FROM "user" WHERE email IN (${AGENCY}, ${SUPER})`;
  await sql`DELETE FROM organization WHERE id IN (${ORG_A}, ${ORG_B})`;
  await sql.end();
});

async function register(page: Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('W12 BP');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard|agency)(\?|\/|$)/, { timeout: 15000 });
}

async function login(page: Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/login');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('••••••••').fill(PW);
  await page.getByRole('button', { name: /Anmelden/i }).click();
  await page.waitForURL(/\/(admin|dashboard|agency)(\?|\/|$)/, { timeout: 15000 });
}

test('builder calc survives a fresh browser context and renders on /embed/:id', async ({ browser }) => {
  // --- Context 1: create + edit via the UI ---
  const ctx1 = await browser.newContext();
  const page = await ctx1.newPage();
  await register(page, AGENCY);
  await sql`UPDATE "user" SET role='agency_admin', org_id=${ORG_A}, approved=true WHERE email=${AGENCY}`;

  await page.goto('/agency/rechner');
  await page.getByRole('button', { name: 'Neuer Rechner' }).click();
  await page.getByPlaceholder('z.B. ROI Rechner').fill(CALC_NAME);
  const createRes = page.waitForResponse(r => r.url().includes('/api/builder-calculators') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
  expect((await createRes).status()).toBe(201);
  await page.waitForURL(/\/editor\//, { timeout: 15000 });
  const calcId = page.url().match(/\/editor\/([^/?]+)/)![1];

  // Edit the default headline block; the debounced autosave must PATCH it.
  const patchRes = page.waitForResponse(
    r => r.url().includes(`/api/builder-calculators/${calcId}`) && r.request().method() === 'PATCH',
    { timeout: 20000 },
  );
  const headline = page.getByPlaceholder('Überschrift eingeben...');
  await expect(headline).toHaveValue('Mein Rechner');
  await headline.fill(EDITED_HEADLINE);
  expect((await patchRes).status()).toBe(200);
  await expect(page.getByText('Gespeichert')).toBeVisible({ timeout: 10000 });
  await ctx1.close();

  // --- Context 2: FRESH (no localStorage, no cookies). Public embed first. ---
  const ctx2 = await browser.newContext();
  const embed = await ctx2.newPage();
  await embed.goto(`/embed/${calcId}`);
  await expect(embed.getByText(EDITED_HEADLINE)).toBeVisible({ timeout: 10000 });

  // Screenshots (desktop + mobile 390px) for the rendered-output review.
  await embed.setViewportSize({ width: 1280, height: 800 });
  await embed.screenshot({ path: 'test-results/builder-persistence/embed-desktop.png', fullPage: true });
  await embed.setViewportSize({ width: 390, height: 844 });
  await embed.screenshot({ path: 'test-results/builder-persistence/embed-mobile.png', fullPage: true });

  // Re-login in the fresh context: the calculator is in the org list, and the
  // editor loads it from the server with the edited content.
  const page2 = await ctx2.newPage();
  await login(page2, AGENCY);
  await page2.goto('/agency/rechner');
  await expect(page2.getByText(CALC_NAME)).toBeVisible({ timeout: 10000 });
  await page2.getByText(CALC_NAME).click();
  await page2.waitForURL(/\/editor\//, { timeout: 15000 });
  await expect(page2.getByPlaceholder('Überschrift eingeben...')).toHaveValue(EDITED_HEADLINE, { timeout: 10000 });
  await ctx2.close();
});

test('builder calcs are org-scoped: super_admin drill-in, cross-org block, unauth 401, public read', async ({ browser, request }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await register(page, SUPER);
  await sql`UPDATE "user" SET role='super_admin', approved=true WHERE email=${SUPER}`;
  const req = page.request;

  // Create one calc per org via ?orgId (create-into-target-org).
  const ra = await req.post(`/api/builder-calculators?orgId=${ORG_A}`, { data: { name: 'BP Calc A', config: { blocks: [] } } });
  expect(ra.status()).toBe(201);
  const ca = await ra.json();
  const rb = await req.post(`/api/builder-calculators?orgId=${ORG_B}`, { data: { name: 'BP Calc B', config: { blocks: [] } } });
  expect(rb.status()).toBe(201);
  const cb = await rb.json();

  // List scoped to A shows A's calc, not B's; no ?orgId -> empty (no global leak).
  const listA = await (await req.get(`/api/builder-calculators?orgId=${ORG_A}`)).json();
  const idsA = listA.map((c: { id: string }) => c.id);
  expect(idsA).toContain(ca.id);
  expect(idsA).not.toContain(cb.id);
  const listNone = await (await req.get('/api/builder-calculators')).json();
  expect(Array.isArray(listNone) ? listNone.length : -1).toBe(0);

  // Operating org A cannot modify or delete org B's calc.
  expect((await req.patch(`/api/builder-calculators/${cb.id}?orgId=${ORG_A}`, { data: { name: 'X', config: {} } })).status()).toBe(403);
  expect((await req.delete(`/api/builder-calculators/${cb.id}?orgId=${ORG_A}`)).status()).toBe(403);
  // But CAN delete it when operating org B.
  expect((await req.delete(`/api/builder-calculators/${cb.id}?orgId=${ORG_B}`)).status()).toBe(200);

  // Unauthenticated: management list is 401, the public by-id read is 200.
  expect((await request.get('/api/builder-calculators')).status()).toBe(401);
  const pub = await request.get(`/api/builder-calculators/public/${ca.id}`);
  expect(pub.status()).toBe(200);
  expect((await pub.json()).id).toBe(ca.id);
  await ctx.close();
});

test('agency_admin builder calcs land in own org, ?orgId of another org is ignored', async ({ browser }) => {
  // Reuses the agency user from the persistence test if present; registers otherwise.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, AGENCY).catch(async () => {
    await register(page, AGENCY);
    await sql`UPDATE "user" SET role='agency_admin', org_id=${ORG_A}, approved=true WHERE email=${AGENCY}`;
  });
  const req = page.request;

  const res = await req.post(`/api/builder-calculators?orgId=${ORG_B}`, { data: { name: 'BP Agency Calc', config: {} } });
  const body = await res.text();
  expect(res.status(), body).toBe(201);
  const created = JSON.parse(body);
  const [row] = await sql<{ org_id: string }[]>`SELECT org_id FROM builder_calculator WHERE id = ${created.id}`;
  expect(row.org_id).toBe(ORG_A); // ?orgId=B ignored for agency_admin

  const list = await (await req.get(`/api/builder-calculators?orgId=${ORG_B}`)).json();
  expect(list.map((c: { id: string }) => c.id)).toContain(created.id);
  await ctx.close();
});
