import 'dotenv/config';
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

// Admin user management: a super_admin sets/resets another user's password, and
// that user can then log in with the new password.
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const ADMIN_EMAIL = `pw-admin-${TS}@test.local`;
const TARGET_EMAIL = `pw-target-${TS}@test.local`;
const OLD_PW = 'Test1234!secure';
const NEW_PW = 'BrandNew9!pass';

test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email IN (${ADMIN_EMAIL}, ${TARGET_EMAIL})`;
  await sql.end();
});

async function register(page: import('@playwright/test').Page, email: string) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('PW Tester');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(OLD_PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(OLD_PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });
}

test('super_admin sets a user password; user logs in with the new password', async ({ browser }) => {
  // Target user registers (will get its password reset by the admin).
  const tctx = await browser.newContext();
  const tpage = await tctx.newPage();
  await register(tpage, TARGET_EMAIL);
  await tctx.close();
  const [{ id: targetId }] = (await sql`SELECT id FROM "user" WHERE email = ${TARGET_EMAIL}`) as unknown as { id: string }[];

  // Admin registers + is promoted to super_admin.
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  await register(apage, ADMIN_EMAIL);
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${ADMIN_EMAIL}`;

  await apage.goto('/admin/users');
  await apage.getByTestId(`set-pw-${targetId}`).click();
  await apage.getByPlaceholder('Neues Passwort (min. 8 Zeichen)').fill(NEW_PW);
  await apage.getByRole('button', { name: 'Passwort setzen' }).click();
  await expect(apage.getByText('Passwort gesetzt.')).toBeVisible({ timeout: 10000 });
  await actx.close();

  // Target logs in with the NEW password.
  const lctx = await browser.newContext();
  const lpage = await lctx.newPage();
  await lpage.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await lpage.goto('/login');
  await lpage.getByPlaceholder('ihre@email.de').fill(TARGET_EMAIL);
  await lpage.getByPlaceholder('••••••••').fill(NEW_PW);
  await lpage.getByRole('button', { name: 'Anmelden' }).click();
  await lpage.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });
  await expect(lpage).toHaveURL(/\/dashboard/);
  await lctx.close();
});
