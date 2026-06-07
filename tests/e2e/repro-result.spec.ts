import 'dotenv/config';
import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// TEMPORARY repro for the "Ergebnis erscheint am Ende nicht" bug.
// Drives the REAL potenzialanalyse funnel (a) directly and (b) inside a
// min-h-[80vh] iframe that mimics the dashboard embed (FunnelEmbed.tsx), then
// measures whether the result/growth-chart is reachable or clipped.
const SLUG = 'potenzialanalyse';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('bf-cookie-notice-ack', '1'); } catch { /* noop */ }
  });
});

async function completeFunnel(scope: Page | FrameLocator) {
  // intro
  await scope.getByRole('button', { name: 'Jetzt Potenzial erkunden' }).click();
  // lead-capture (all required: name, email, businessName, websiteUrl + consent)
  await scope.getByTestId('lead-field-name').fill('Repro Tester');
  await scope.getByTestId('lead-field-email').fill('repro@test.local');
  await scope.getByTestId('lead-field-businessName').fill('Repro Praxis');
  await scope.getByTestId('lead-field-websiteUrl').fill('https://example.com');
  await scope.getByTestId('consent-privacy').check();
  await scope.getByRole('button', { name: 'Weiter' }).click();
  // 8 single-select questions -> auto-advance; click first option each time
  for (let i = 0; i < 8; i++) {
    await scope.locator('button.text-left').first().click();
    await (scope as Page).waitForTimeout?.(250).catch(() => undefined);
  }
  // 3 calc-inputs -> Weiter
  for (let i = 0; i < 3; i++) {
    await scope.getByRole('button', { name: 'Weiter' }).click();
  }
}

test('REPRO direct: result visible in full window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/funnel/${SLUG}`);
  await completeFunnel(page);

  const hero = page.getByText('Ihr Wachstumspotenzial');
  await expect(hero).toBeVisible({ timeout: 8000 });
  const box = await hero.boundingBox();
  const metrics = await page.evaluate(() => ({
    scrollH: document.scrollingElement?.scrollHeight,
    clientH: document.scrollingElement?.clientHeight,
    bodyTop: document.body.getBoundingClientRect().top,
  }));
  console.log('[REPRO direct] heroBox=', JSON.stringify(box), 'metrics=', JSON.stringify(metrics));
  await page.screenshot({ path: 'test-results/repro/direct-result.png', fullPage: true });
  await page.screenshot({ path: 'test-results/repro/direct-result-viewport.png' });
});

test('REPRO real dashboard: result inside /dashboard/potenzialanalyse embed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // Register a fresh end-customer (super_admins already exist -> customer path,
  // which now lands in the beautyflow org). Auto-logged-in -> /dashboard.
  const email = `repro-${Date.now()}@test.local`;
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Repro Kunde');
  await page.getByPlaceholder('ihre@email.de').fill(email);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill('Test1234!secure');
  await page.getByPlaceholder('Passwort wiederholen').fill('Test1234!secure');
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 15000 });

  // Real same-origin embed route (PotenzialanalyseEmbed -> iframe /funnel/potenzialanalyse)
  await page.goto('/dashboard/potenzialanalyse');
  const frame = page.frameLocator('iframe');
  await completeFunnel(frame);

  const hero = frame.getByText('Ihr Wachstumspotenzial');
  await expect(hero).toBeVisible({ timeout: 10000 });

  // GATE: result is terminal -> the booking CTA must render ON the result and
  // point at the real Calendly URL (else removing the step left a dead end).
  const cta = frame.getByTestId('result-booking-cta');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', 'https://calendly.com/beauty-flow/30min');

  // Same-origin now -> we CAN read the iframe document to detect clipping.
  const frameMetrics = await page.evaluate(() => {
    const ifr = document.querySelector('iframe') as HTMLIFrameElement;
    const doc = ifr.contentDocument!;
    const se = doc.scrollingElement as HTMLElement;
    const heroEl = Array.from(doc.querySelectorAll('p')).find((p) => p.textContent?.includes('Ihr Wachstumspotenzial'));
    const heroRect = heroEl?.getBoundingClientRect();
    return {
      iframeClientH: ifr.clientHeight,
      docScrollH: se?.scrollHeight,
      docClientH: se?.clientHeight,
      scrollableInsideIframe: (se?.scrollHeight ?? 0) > (ifr.clientHeight ?? 0) + 2,
      heroTopRelToIframeViewport: heroRect?.top,
      heroReachable: heroRect ? heroRect.top >= -2 : null,
    };
  });
  console.log('[REPRO dashboard] metrics=', JSON.stringify(frameMetrics, null, 2));
  // Clean up the throwaway customer.
  await page.evaluate(async () => { /* lead persists in e2e db; harmless */ });
  await page.screenshot({ path: 'test-results/repro/dashboard-result.png', fullPage: true });
});
