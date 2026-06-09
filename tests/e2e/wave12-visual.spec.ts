import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import path from 'path';

// Rendered check of the moved agency UI (Funnels in the BeautyFlow/agency UI),
// desktop + mobile. Uses the real 'beautyflow' org (has the Potenzialanalyse funnel).
let sql: ReturnType<typeof postgres>;
const TS = Date.now();
const SUPER_EMAIL = `w12v-super-${TS}@test.local`;
const PW = 'Test1234!secure';
const SHOTS = path.resolve(process.cwd(), 'test-results', 'wave12');

test.beforeAll(() => { sql = postgres(process.env.DATABASE_URL!); });
test.afterAll(async () => { if (sql) { await sql`DELETE FROM "user" WHERE email = ${SUPER_EMAIL}`; await sql.end(); } });

async function loginSuper(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('W12 Visual');
  await page.getByPlaceholder('ihre@email.de').fill(SUPER_EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard|agency)(\?|\/|$)/, { timeout: 15000 });
  await sql`UPDATE "user" SET role = 'super_admin', approved = true WHERE email = ${SUPER_EMAIL}`;
}

test('agency Funnels + console render (BeautyFlow org), desktop + mobile', async ({ page }) => {
  await loginSuper(page);
  for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'mobile']] as const) {
    await page.setViewportSize({ width: w, height: h });

    await page.goto('/agency/funnels?orgId=beautyflow');
    // The agency header identifies the org + carries the Funnels nav.
    await expect(page.locator('header').getByText('BeautyFlow').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/${tag}-agency-funnels.png`, fullPage: true });

    await page.goto('/agency?orgId=beautyflow');
    await expect(page.getByRole('heading', { name: 'Agentur-Konsole' })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/${tag}-agency-console.png`, fullPage: true });
  }
});
