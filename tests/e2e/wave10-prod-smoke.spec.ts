import { test, expect } from '@playwright/test';

// Read-only rendered smoke of the Wave-10 PUBLIC surfaces on live prod (no creds,
// no form submits, no leads). The admin-only surfaces (platform overview, mobile
// admin menu) are proven by the LOCAL rendered specs — they need a super_admin
// login we don't have on prod.
const PROD = 'https://kalku.layer-one.io';
test.use({ baseURL: PROD });

test('prod public Wave-10 surfaces render on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${PROD}/passwort-vergessen`);
  await expect(page.getByRole('heading', { name: 'Passwort vergessen' })).toBeVisible({ timeout: 15000 });

  await page.goto(`${PROD}/passwort-zuruecksetzen/invalidtoken123`);
  await expect(page.getByText(/ungültig oder abgelaufen/i)).toBeVisible({ timeout: 15000 });

  await page.goto(`${PROD}/login`);
  await expect(page.getByRole('link', { name: 'Passwort vergessen?' })).toBeVisible({ timeout: 15000 });

  await page.goto(`${PROD}/funnel/potenzialanalyse`);
  await expect(page.getByRole('button', { name: 'Jetzt Potenzial erkunden' })).toBeVisible({ timeout: 15000 });
});
