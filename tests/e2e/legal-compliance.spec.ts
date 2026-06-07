import { test, expect, type Page } from '@playwright/test';

// Public legal pages + cookie notice. No DB or auth required.

test('Impressum renders with the registered legal entity', async ({ page }: { page: Page }) => {
  await page.goto('/impressum');
  await expect(page.getByRole('heading', { name: 'Impressum', exact: true })).toBeVisible();
  await expect(page.getByText('Alen Media Solutions GmbH').first()).toBeVisible();
  await expect(page.getByText('HRB 226207')).toBeVisible();
  await expect(page.getByText('DE364512982')).toBeVisible();
});

test('Datenschutz describes the actual portal processing', async ({ page }: { page: Page }) => {
  await page.goto('/datenschutz');
  await expect(page.getByRole('heading', { name: 'Datenschutzerklärung', exact: true })).toBeVisible();
  await expect(page.getByText(/better-auth/).first()).toBeVisible();
  await expect(page.getByText(/PostgreSQL/).first()).toBeVisible();
  await expect(page.getByText(/Art\. 20/).first()).toBeVisible();
});

test('AGB renders with sections', async ({ page }: { page: Page }) => {
  await page.goto('/agb');
  await expect(page.getByRole('heading', { name: 'Allgemeine Geschäftsbedingungen', exact: true })).toBeVisible();
  await expect(page.getByText(/§ 1 Anbieter und Geltungsbereich/).first()).toBeVisible();
  await expect(page.getByText(/§ 8 Haftungsbeschränkung/).first()).toBeVisible();
});

test('Footer links to all legal pages', async ({ page }: { page: Page }) => {
  await page.goto('/impressum');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Impressum' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Datenschutzerklärung' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Allgemeine Geschäftsbedingungen' })).toBeVisible();
});

test('Cookie notice appears and stays dismissed', async ({ page }: { page: Page }) => {
  await page.goto('/impressum');
  const notice = page.getByRole('region', { name: 'Cookie-Hinweis' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Verstanden' }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Cookie-Hinweis' })).toBeHidden();
});
