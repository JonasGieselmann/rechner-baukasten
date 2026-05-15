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

test('super_admin can toggle between /admin and /dashboard via header buttons', async ({ page }: { page: Page }) => {
  // Register via UI to create a real better-auth account
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill(TEST_NAME);
  await page.getByPlaceholder('ihre@email.de').fill(TEST_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(TEST_PASSWORD);
  await page.getByPlaceholder('Passwort wiederholen').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });

  // Force super_admin role regardless of which branch the hook took
  await sql`
    UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${TEST_EMAIL}
  `;
  await page.goto('/');
  await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });

  // Step 1: admin landing shows BeautyFlow brand
  await expect(page.locator('header').getByText('Beauty').first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/1-admin.png`, fullPage: true });

  // Step 2: click Customer-Ansicht in header
  const customerViewBtn = page.getByRole('button', { name: /Customer-Ansicht/i });
  await expect(customerViewBtn).toBeVisible();
  await customerViewBtn.click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 5000 });
  await expect(page.locator('header').getByText('BeautyFlow').first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/2-customer.png`, fullPage: true });

  // Step 3: click ← Admin in customer header
  const adminBackLink = page.getByRole('link', { name: /Admin/ });
  await expect(adminBackLink).toBeVisible();
  await adminBackLink.click();
  await page.waitForURL(/\/admin\/?$/, { timeout: 5000 });
  await expect(page.locator('header').getByText('Beauty').first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/3-back-to-admin.png`, fullPage: true });
});
