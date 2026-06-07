import 'dotenv/config';
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

// Security regression (audit #2): when a user is moved to another org, their
// stale dashboard_id must NOT resolve a dashboard from the old org.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const EMAIL = `move-${TS}@test.local`;
const DASH = `move-dash-${TS}`;
const OTHER_ORG = `move-org-${TS}`;

test.beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!);
  await sql`INSERT INTO organization (id, name, slug, parent_org_id, plan_id) VALUES (${OTHER_ORG}, 'Move Org', ${OTHER_ORG}, 'default', 'basic') ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO dashboard (id, org_id, name, description) VALUES (${DASH}, 'beautyflow', 'Move Dash', '') ON CONFLICT (id) DO NOTHING`;
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email = ${EMAIL}`;
  await sql`DELETE FROM dashboard WHERE id = ${DASH}`;
  await sql`DELETE FROM organization WHERE id = ${OTHER_ORG}`;
  await sql.end();
});

test('moving a user to another org clears stale dashboard access', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Move User');
  await page.getByPlaceholder('ihre@email.de').fill(EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill('Test1234!secure');
  await page.getByPlaceholder('Passwort wiederholen').fill('Test1234!secure');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });

  // Customer lands in beautyflow; assign them the beautyflow dashboard.
  await sql`UPDATE "user" SET dashboard_id = ${DASH} WHERE email = ${EMAIL}`;
  // They can see it now.
  let me = await page.evaluate(async () => (await fetch('/api/dashboards/me', { credentials: 'include' }).then((r) => r.json())));
  expect(me?.dashboard?.id).toBe(DASH);

  // Move the user to another org WITHOUT touching dashboard_id directly (simulate
  // the DB-layer move via setUserRoleAndOrg, which must clear dashboard_id).
  const [{ id }] = (await sql`SELECT id FROM "user" WHERE email = ${EMAIL}`) as unknown as { id: string }[];
  // Worst case: move org but DELIBERATELY leave the stale dashboard_id pointing
  // at the old org's dashboard. getUserDashboard's org-validation must still block it.
  await sql`UPDATE "user" SET org_id = ${OTHER_ORG} WHERE id = ${id}`;

  // /me must NOT return the old beautyflow dashboard (org mismatch).
  await page.reload();
  me = await page.evaluate(async () => (await fetch('/api/dashboards/me', { credentials: 'include' }).then((r) => r.json())));
  expect(me).toBeNull();
});
