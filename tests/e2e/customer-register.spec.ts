import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';

// Test that registration auto-approves new users as customers and the
// index redirect sends them to the customer dashboard.
//
// Requires the same local dev stack as funnel-runner.spec.ts (Postgres
// reachable via DATABASE_URL plus Vite + Express running via webServer).

const TEST_EMAIL = `e2e-customer-${Date.now()}@test.local`;
const TEST_NAME = 'E2E Customer';
const TEST_PASSWORD = 'Test1234!secure';

const SENTINEL_ADMIN_ID = 'e2e-sentinel-admin';
let sql: ReturnType<typeof postgres>;

test.beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set');
  sql = postgres(dbUrl);

  // The auto-promote-to-customer hook only fires when a super_admin already
  // exists. Insert a sentinel admin so registration becomes the customer path.
  await sql`
    INSERT INTO "user" (id, name, email, email_verified, role, approved)
    VALUES (${SENTINEL_ADMIN_ID}, 'Sentinel Admin', 'sentinel@e2e.local', true, 'super_admin', true)
    ON CONFLICT (id) DO NOTHING
  `;
});

test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email = ${TEST_EMAIL}`;
  await sql`DELETE FROM "user" WHERE id = ${SENTINEL_ADMIN_ID}`;
  await sql.end();
});

test('registration auto-approves as customer and redirects to /dashboard', async ({ page }: { page: Page }) => {
  await page.goto('/register');

  await page.getByPlaceholder('Ihr Name').fill(TEST_NAME);
  await page.getByPlaceholder('ihre@email.de').fill(TEST_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(TEST_PASSWORD);
  await page.getByPlaceholder('Passwort wiederholen').fill(TEST_PASSWORD);

  await page.getByRole('button', { name: 'Konto erstellen' }).click();

  await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });
  await expect(page.getByText('BeautyFlow')).toBeVisible();

  const rows = await sql`
    SELECT role, approved FROM "user" WHERE email = ${TEST_EMAIL} LIMIT 1
  `;
  expect(rows).toHaveLength(1);
  expect(rows[0].role).toBe('customer');
  expect(rows[0].approved).toBe(true);
});
