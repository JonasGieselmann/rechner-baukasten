import 'dotenv/config';
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

// White-label onboarding: a super_admin creates a customer org (child of the
// platform org 'default'), sets its branding, and assigns an agency-admin.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ADMIN_EMAIL = `org-admin-${TS}@test.local`;
const AGENCY_EMAIL = `org-agency-${TS}@test.local`;
const ORG_NAME = `E2E WL Kunde ${TS}`;
const PW = 'Test1234!secure';

test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email IN (${ADMIN_EMAIL}, ${AGENCY_EMAIL})`;
  await sql`DELETE FROM organization WHERE name = ${ORG_NAME}`;
  await sql.end();
});

async function register(page: import('@playwright/test').Page, email: string) {
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Org Tester');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });
}

test('super_admin onboards a white-label org (create + branding + agency-admin)', async ({ page, browser }) => {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });

  // A candidate agency-admin user (registers as customer first).
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await register(page2, AGENCY_EMAIL);
  await ctx2.close();

  // The platform admin.
  await register(page, ADMIN_EMAIL);
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${ADMIN_EMAIL}`;

  await page.goto('/admin/organizations');
  await expect(page.getByRole('heading', { name: 'Organisationen' })).toBeVisible();
  // Layer One platform org is shown (as an org card heading).
  await expect(page.getByRole('heading', { name: 'Layer One' })).toBeVisible();

  // Create the white-label org.
  await page.getByPlaceholder('z.B. Praxis Müller Marketing').fill(ORG_NAME);
  await page.getByRole('button', { name: 'Organisation anlegen' }).click();

  // It is created as a child of 'default' with the basic plan.
  await expect.poll(async () => {
    const rows = await sql`SELECT parent_org_id, plan_id FROM organization WHERE name = ${ORG_NAME}`;
    return rows[0] ? `${rows[0].parent_org_id}|${rows[0].plan_id}` : null;
  }, { timeout: 10000 }).toBe('default|basic');

  const [{ slug }] = await sql`SELECT slug FROM organization WHERE name = ${ORG_NAME}` as unknown as { slug: string }[];
  const card = page.getByTestId(`org-card-${slug}`);
  await expect(card).toBeVisible();
  await expect(card.getByText('White-Label-Kunde')).toBeVisible();

  // Set branding.
  await card.getByRole('button', { name: 'Verwalten' }).click();
  await card.getByPlaceholder('z.B. BeautyFlow').fill('Praxis Müller');
  await card.getByRole('button', { name: 'Branding speichern' }).click();
  await expect.poll(async () => {
    const rows = await sql`SELECT brand_name FROM organization WHERE name = ${ORG_NAME}`;
    return rows[0]?.brand_name ?? null;
  }, { timeout: 10000 }).toBe('Praxis Müller');

  // Assign the candidate as agency-admin of this org (select by value=userId,
  // robust against the option label format / many users in the list).
  const [{ id: agencyId }] = (await sql`SELECT id FROM "user" WHERE email = ${AGENCY_EMAIL}`) as unknown as { id: string }[];
  await card.getByRole('combobox').last().selectOption(agencyId);
  const assignBtn = card.getByRole('button', { name: 'Als Agency-Admin zuweisen' });
  await expect(assignBtn).toBeEnabled();
  await assignBtn.click();
  await expect.poll(async () => {
    const rows = await sql`SELECT role, org_id FROM "user" WHERE email = ${AGENCY_EMAIL}`;
    return rows[0] ? `${rows[0].role}|${rows[0].org_id}` : null;
  }, { timeout: 10000 }).toMatch(/^agency_admin\|/);
});
