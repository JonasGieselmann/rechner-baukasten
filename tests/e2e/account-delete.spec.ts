import 'dotenv/config';
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

// DSGVO Art. 17 self-service deletion: a customer can delete their own account,
// which removes the user row + their leads, then logs them out.
let sql: ReturnType<typeof postgres>;

test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => { if (sql) await sql.end(); });

test('customer can delete own account (Art. 17)', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  const email = `del-${Date.now()}@test.local`;

  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Del Kunde');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill('Test1234!secure');
  await page.getByPlaceholder('Passwort wiederholen').fill('Test1234!secure');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });

  // user exists
  const before = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  expect(before).toHaveLength(1);

  await page.goto('/dashboard/account');
  await page.getByRole('button', { name: 'Konto löschen' }).click();
  await page.getByRole('button', { name: 'Ja, Konto löschen' }).click();

  // redirected away from the dashboard (logged out)
  await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'), { timeout: 10000 });

  // user row is gone
  const after = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  expect(after).toHaveLength(0);
});
