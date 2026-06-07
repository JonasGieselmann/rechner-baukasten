import { test, type Page } from '@playwright/test';
import path from 'path';

const SCREENSHOTS = path.resolve(process.cwd(), 'test-results', 'funnel-visual');

test('visual walk-through of prod funnel', async ({ page }: { page: Page }) => {
  await page.goto('https://kalku.layer-one.io/funnel/potenzialanalyse', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SCREENSHOTS}/1-intro.png`, fullPage: true });

  await page.getByRole('button', { name: 'Jetzt Potenzial erkunden' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS}/2-lead.png`, fullPage: true });

  // fill bare-minimum to advance
  await page.getByTestId('lead-field-name').fill('Visual Test');
  await page.getByTestId('lead-field-email').fill('vt@example.com');
  await page.getByTestId('lead-field-businessName').fill('Test Praxis');
  await page.getByTestId('lead-field-websiteUrl').fill('https://example.com');
  // Privacy consent is required before the lead step can advance.
  await page.getByTestId('consent-privacy').check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS}/3-q1.png`, fullPage: true });

  // 8 questions - click first option in each
  for (let i = 0; i < 8; i++) {
    const buttons = await page.locator('button').all();
    for (const b of buttons) {
      const t = await b.textContent();
      if (t && (t.includes('Auf keiner') || t.includes('Habe keine') || t.includes('Nein, gar nichts') || t.includes('Keine') || t.includes('Gar nicht') || t.includes('Unter 50') || t.includes('Nur ich') || t.includes('Dorf'))) {
        await b.click();
        break;
      }
    }
    await page.waitForTimeout(400);
  }

  // 3 calc inputs - just press Weiter to use defaults
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.waitForTimeout(400);
  }

  // result-spider step
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOTS}/4-result.png`, fullPage: true });

  // try to advance to cta-booking (PrimaryButton 'Termin buchen' or Weiter)
  const next = page.getByRole('button', { name: /Weiter|Termin/ }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/5-cta.png`, fullPage: true });
  }
});
