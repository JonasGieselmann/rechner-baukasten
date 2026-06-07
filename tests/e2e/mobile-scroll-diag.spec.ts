import 'dotenv/config';
import { test, expect } from '@playwright/test';

// Mobile regression: on a phone viewport, the bottom of a long dashboard page is
// reachable above the fixed bottom nav (no content hidden underneath it).
test.use({ viewport: { width: 390, height: 844 } });

test('mobile: bottom of /dashboard/account is reachable above the bottom nav', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  const email = `mob-${Date.now()}@test.local`;
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Mobile User');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill('Test1234!secure');
  await page.getByPlaceholder('Passwort wiederholen').fill('Test1234!secure');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });

  await page.goto('/dashboard/account');
  await expect(page.getByRole('heading', { name: 'Konto' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  const btn = page.getByRole('button', { name: 'Konto löschen' });
  const box = await btn.boundingBox();
  const navBox = await page.locator('nav.md\\:hidden').boundingBox();
  expect(box).not.toBeNull();
  if (box && navBox) expect(box.y + box.height).toBeLessThanOrEqual(navBox.y + 1);
});
