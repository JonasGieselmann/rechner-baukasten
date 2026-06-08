import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import path from 'path';

const TEST_EMAIL = `e2e-admin-switch-${Date.now()}@test.local`;
const TEST_NAME = 'E2E Admin Switch';
const TEST_PASSWORD = 'Test1234!secure';

const SCREENSHOTS = path.resolve(process.cwd(), 'test-results', 'admin-view-switch');

let sql: ReturnType<typeof postgres>;

test.beforeAll(() => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');
  sql = postgres(dbUrl);
});

test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email = ${TEST_EMAIL}`;
  await sql.end();
});

test('brand separation: Kalku on the platform header, BeautyFlow on the customer dashboard', async ({ page }: { page: Page }) => {
  // Register via UI to create a real better-auth account
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill(TEST_NAME);
  await page.getByPlaceholder('ihre@email.de').fill(TEST_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(TEST_PASSWORD);
  await page.getByPlaceholder('Passwort wiederholen').fill(TEST_PASSWORD);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });

  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${TEST_EMAIL}`;
  await page.goto('/');
  await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });

  // The platform header is KALKU, not BeautyFlow.
  const header = page.locator('header');
  await expect(header.getByText('Kal', { exact: false }).first()).toBeVisible();
  await expect(header.getByText('Plattform').first()).toBeVisible();
  await expect(header.getByText('BeautyFlow')).toHaveCount(0);
  await page.screenshot({ path: `${SCREENSHOTS}/1-platform-kalku.png`, fullPage: true });

  // The customer dashboard is BeautyFlow-branded.
  await page.goto('/dashboard');
  await expect(page.locator('header').getByText('BeautyFlow').first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/2-customer-beautyflow.png`, fullPage: true });

  // super_admin can return to the platform from the customer view.
  const adminBackLink = page.getByRole('link', { name: /Admin/ });
  await expect(adminBackLink).toBeVisible();
  await adminBackLink.click();
  await page.waitForURL(/\/admin\/?$/, { timeout: 5000 });
});
