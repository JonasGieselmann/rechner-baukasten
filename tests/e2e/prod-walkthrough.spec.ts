import { test, expect, type Page } from '@playwright/test';

// Prod verification of wave-3: the live potenzialanalyse funnel must end on the
// result (growth chart) with a WORKING Calendly booking CTA — no dead-end step.
const PROD = 'https://kalku.layer-one.io';
const CALENDLY = 'https://calendly.com/beauty-flow/30min';

test.use({ baseURL: PROD });

test('prod: funnel ends on result with working Calendly CTA', async ({ page }: { page: Page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ } });
  await page.goto(`${PROD}/funnel/potenzialanalyse`, { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Jetzt Potenzial erkunden' }).click();
  await page.getByTestId('lead-field-name').fill('Prod Verify');
  await page.getByTestId('lead-field-email').fill('prod-verify@test.local');
  await page.getByTestId('lead-field-businessName').fill('Verify Praxis');
  await page.getByTestId('lead-field-websiteUrl').fill('https://example.com');
  await page.getByTestId('consent-privacy').check();
  await page.getByRole('button', { name: 'Weiter' }).click();

  // 5 single-select questions -> auto-advance; pick the last (highest) option.
  for (let i = 0; i < 5; i++) {
    await page.locator('button.text-left').last().click();
    await page.waitForTimeout(300);
  }

  // Terminal result: growth chart + recommendation visible
  await expect(page.getByText('Ihr Wachstumspotenzial')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Mehrumsatz pro Monat')).toBeVisible();

  // Sliders are pre-filled from the funnel answers ("zum Rumspielen").
  await expect(page.getByRole('slider').first()).toBeVisible();

  // Booking works: the terminal CTA points at the real Calendly URL.
  const cta = page.getByTestId('result-booking-cta');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', CALENDLY);

  // No trailing booking dead-end: progress shows the result as the LAST step.
  await expect(page.getByText(/Schritt \d+ von \d+/)).toContainText('von 8');

  await page.screenshot({ path: 'test-results/prod-walkthrough/result.png', fullPage: true });
});
