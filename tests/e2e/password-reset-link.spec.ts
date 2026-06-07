import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

const STAMP = Date.now();
const ADMIN_EMAIL = `e2e-pwadmin-${STAMP}@test.local`;
const CUST_EMAIL = `e2e-pwcust-${STAMP}@test.local`;
const PW = 'Test1234!secure';
const NEW_PW = 'BrandNew9!pass';

let sql: ReturnType<typeof postgres>;
test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email IN (${ADMIN_EMAIL}, ${CUST_EMAIL})`;
  await sql.end();
});

async function register(page: Page, name: string, email: string, pw: string) {
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill(name);
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(pw);
  await page.getByPlaceholder('Passwort wiederholen').fill(pw);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });
}

test('admin generates a reset link → customer resets → logs in with new password', async ({ page }) => {
  // 1. Create the customer, capture their id
  await register(page, 'PW Customer', CUST_EMAIL, PW);
  const [{ id: custId }] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE email = ${CUST_EMAIL}`;
  await page.context().clearCookies();

  // 2. Create + promote the super_admin
  await register(page, 'PW Admin', ADMIN_EMAIL, PW);
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${ADMIN_EMAIL}`;

  // 3. Admin generates a reset link for the customer
  await page.goto('/admin/users');
  await page.getByTestId(`set-pw-${custId}`).click();
  await page.getByTestId(`gen-reset-link-${custId}`).click();
  const linkText = await page.getByTestId('reset-link-value').innerText();
  expect(linkText).toContain('/passwort-zuruecksetzen/');
  const resetPath = new URL(linkText).pathname; // strip origin so we hit the test server
  await page.context().clearCookies();

  // 4. Customer opens the link and sets a new password
  await page.goto(resetPath);
  await expect(page.getByRole('button', { name: 'Passwort setzen' })).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(NEW_PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(NEW_PW);
  await page.getByRole('button', { name: 'Passwort setzen' }).click();
  await expect(page.getByText(/erfolgreich gesetzt/i)).toBeVisible({ timeout: 10000 });

  // 5. Old password must FAIL, new password must work
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByPlaceholder('ihre@email.de').fill(CUST_EMAIL);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  // Old password must be rejected: an error alert shows and we stay on /login.
  await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[type="password"]').fill(NEW_PW);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });
});

test('forgot-password page responds generically', async ({ page }) => {
  await page.goto('/passwort-vergessen');
  await page.getByPlaceholder('ihre@email.de').fill(`nobody-${STAMP}@nowhere.local`);
  await page.getByRole('button', { name: 'Link anfordern' }).click();
  await expect(page.getByText(/Falls ein Konto/i)).toBeVisible({ timeout: 10000 });
});
