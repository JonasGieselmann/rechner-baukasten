import { test, expect } from '@playwright/test';

const PROD = 'https://kalku.layer-one.io';
const OUT = 'test-results/prod-review';

test.use({ baseURL: PROD });

test('1. Funnel intro Spinnennetz desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD}/funnel/potenzialanalyse`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-intro-desktop.png`, fullPage: true });
});

test('2. Funnel intro Spinnennetz mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROD}/funnel/potenzialanalyse`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/02-intro-mobile.png`, fullPage: true });
});

test('3. Funnel full path desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD}/funnel/potenzialanalyse`);
  await page.getByRole('button', { name: 'Jetzt Potenzial erkunden' }).click();
  await page.getByTestId('lead-field-name').fill('Review Test');
  await page.getByTestId('lead-field-email').fill('review@test.local');
  await page.getByTestId('lead-field-businessName').fill('Test Praxis');
  await page.getByTestId('lead-field-websiteUrl').fill('https://test.com');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03-question-1.png`, fullPage: true });
  // First question auto-advances on selection
  await page.locator('button').filter({ hasText: /Plattform|Auf keiner/ }).first().click();
  await page.waitForTimeout(300);
  // Click through remaining questions quickly
  for (let i = 0; i < 12; i++) {
    const nextBtn = await page.getByRole('button', { name: 'Weiter' }).count();
    if (nextBtn > 0) {
      await page.getByRole('button', { name: 'Weiter' }).first().click();
      await page.waitForTimeout(300);
    } else {
      // Question: click first option
      const buttons = await page.locator('button[class*="rounded-xl"]').all();
      if (buttons.length > 0) {
        await buttons[0].click();
        await page.waitForTimeout(300);
      }
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/04-result.png`, fullPage: true });
});

test('4. Login page mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROD}/login`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/05-login-mobile.png`, fullPage: true });
});

test('5. Register page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD}/register`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/06-register.png`, fullPage: true });
});

test('6. Login as super_admin and screenshot admin surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD}/login`);
  await page.getByPlaceholder('ihre@email.de').fill('jonas@gieselmann.io');
  await page.getByPlaceholder(/Passwort|••/i).fill('bEdS^b*QzD2x8j74JxB0%dbgRyrbHpaR');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL(/\/admin/, { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/07-admin-home.png`, fullPage: true });

  await page.goto(`${PROD}/admin?tab=funnel`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/08-admin-funnels.png`, fullPage: true });

  await page.goto(`${PROD}/admin/customers`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/09-admin-customers.png`, fullPage: true });

  await page.goto(`${PROD}/admin/users`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/10-admin-users.png`, fullPage: true });

  await page.goto(`${PROD}/admin/settings`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/11-admin-settings.png`, fullPage: true });

  // Switch to customer dashboard
  await page.getByRole('button', { name: /Customer-Ansicht/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/12-customer-dashboard.png`, fullPage: true });
});
