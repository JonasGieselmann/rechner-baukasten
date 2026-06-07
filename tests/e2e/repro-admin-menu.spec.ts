import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import path from 'path';

// Repro for "bei dashboards fehlt oben die menüleiste" — verify in a RENDERED
// view at mobile AND desktop width whether the admin nav links are reachable.
const TEST_EMAIL = `e2e-menu-${Date.now()}@test.local`;
const TEST_PASSWORD = 'Test1234!secure';
const SHOTS = path.resolve(process.cwd(), 'test-results', 'repro-admin-menu');

let sql: ReturnType<typeof postgres>;
test.beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL!);
});
test.afterAll(async () => {
  if (!sql) return;
  await sql`DELETE FROM "user" WHERE email = ${TEST_EMAIL}`;
  await sql.end();
});

async function loginSuperAdmin(page: Page) {
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('E2E Menu');
  await page.getByPlaceholder('ihre@email.de').fill(TEST_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(TEST_PASSWORD);
  await page.getByPlaceholder('Passwort wiederholen').fill(TEST_PASSWORD);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${TEST_EMAIL}`;
}

// Can the user reach "Dashboards" / "Organisationen" nav from the header, at this width?
async function navLinkVisible(page: Page, label: string): Promise<boolean> {
  const link = page.locator('header').getByRole('button', { name: label });
  return (await link.count()) > 0 && (await link.first().isVisible());
}

test('admin nav is reachable at mobile (via menu) and desktop', async ({ page }: { page: Page }) => {
  await loginSuperAdmin(page);

  const report: Record<string, boolean> = {};
  for (const [w, h, tag] of [[390, 844, 'mobile'], [1280, 800, 'desktop']] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const route of ['/admin', '/admin/dashboards', '/admin/users']) {
      await page.goto(route);
      await page.waitForTimeout(300);
      // On mobile the nav lives behind a hamburger — open it first.
      if (tag === 'mobile') {
        const burger = page.locator('header').getByRole('button', { name: 'Menü' });
        await expect(burger).toBeVisible();
        await burger.click();
        await page.waitForTimeout(200);
      }
      const slug = route.replace(/\//g, '_') || '_root';
      await page.screenshot({ path: `${SHOTS}/${tag}${slug}.png`, fullPage: true });
      report[`${tag} ${route} Dashboards`] = await navLinkVisible(page, 'Dashboards');
      report[`${tag} ${route} Organisationen`] = await navLinkVisible(page, 'Organisationen');
    }
  }
  console.log('NAV REACHABILITY REPORT:\n' + JSON.stringify(report, null, 2));
  // Hard gate: every admin nav target reachable at BOTH widths.
  for (const [k, v] of Object.entries(report)) expect(v, k).toBe(true);
});
