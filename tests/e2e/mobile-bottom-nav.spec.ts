import 'dotenv/config';
import { test } from '@playwright/test';
import postgres from 'postgres';

const TS = Date.now();
const EMAIL = `e2e-bottomnav-${TS}@test.local`;
const PW = 'Test1234!secure';

// Pre-acknowledge the cookie notice so its fixed bottom bar never overlays
// the submit controls on the small mobile viewport.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('bf-cookie-notice-ack', '1');
    } catch {
      /* noop */
    }
  });
});

test('mobile dashboard with bottom nav', async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await page.getByPlaceholder('Ihr Name').fill('Mobile Test');
  await page.getByPlaceholder('ihre@email.de').fill(EMAIL);
  await page.getByPlaceholder('Mindestens 8 Zeichen').fill(PW);
  await page.getByPlaceholder('Passwort wiederholen').fill(PW);
  await page.getByTestId('accept-terms').check();
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await page.waitForURL(/\/(admin|dashboard)\/?$/, { timeout: 10000 });
  await sql`UPDATE "user" SET role = 'customer' WHERE email = ${EMAIL}`;
  await page.goto('/dashboard');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/mobile-bottomnav/dashboard.png', fullPage: true });
  // Result-step apple-redesign mobile
  await sql`DELETE FROM "user" WHERE email = ${EMAIL}`;
  await sql.end();
});

test('result step apple redesign mobile', async ({ page }) => {
  const sql = postgres(process.env.DATABASE_URL!);
  await sql`INSERT INTO "user" (id, name, email, role, approved) VALUES ('e2e-apple-owner', 'Owner', 'apple-owner@e2e.local', 'super_admin', true) ON CONFLICT (id) DO NOTHING`;
  await sql`DELETE FROM funnel WHERE slug = 'e2e-apple-result'`;
  await sql`
    INSERT INTO funnel (id, owner_id, name, slug, status, config)
    VALUES (gen_random_uuid()::text, 'e2e-apple-owner', 'Apple Result', 'e2e-apple-result', 'published',
      ${sql.json({
        theme: { mode: 'light', primaryColor: '#0F2F5B', accentColor: '#7EC8F3', backgroundColor: '#F7FAFF', cardColor: '#FFFFFF', textColor: '#0F2F5B', borderColor: '#E0E7F2' },
        settings: { progressBar: true, ctaCalendarUrl: 'https://cal.com/test' },
        steps: [
          { id: 'i', type: 'intro', title: 'Hi', ctaLabel: 'Los' },
          { id: 'l', type: 'lead-capture', title: 'Daten', fields: [{key:'name',label:'Name',required:true},{key:'email',label:'Mail',required:true}], ctaLabel: 'Weiter' },
          { id: 'q', type: 'question', question: 'Q', dimension: 'trust', options: [{id:'a',label:'A',score:80}], required: true },
          { id: 'c1', type: 'calc-input', title: 'Termine', label: 'Termine', variableName: 'terminePerWeek', inputType: 'number', defaultValue: 20, min: 0, max: 200 },
          { id: 'c2', type: 'calc-input', title: 'Umsatz', label: 'Umsatz', variableName: 'umsatzProTermin', inputType: 'number', defaultValue: 100, min: 0, max: 1000, suffix: '€' },
          { id: 'c3', type: 'calc-input', title: 'Kapazität', label: 'Kapazität', variableName: 'kapazitaetPerWeek', inputType: 'number', defaultValue: 50, min: 0, max: 200 },
          { id: 'r', type: 'result-spider', title: 'Ihre Potenzialanalyse', body: 'Hier ist Ihre Auswertung.', showKalkuChart: true, cliffhanger: 'Ihre schwächste Säule ist der größte Hebel.' },
        ],
      })}
    )
  `;
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/funnel/e2e-apple-result');
  await page.getByRole('button', { name: 'Los' }).click();
  await page.getByTestId('lead-field-name').fill('Anna');
  await page.getByTestId('lead-field-email').fill('anna@test.local');
  await page.getByTestId('consent-privacy').check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'A' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/mobile-bottomnav/result-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/mobile-bottomnav/result-mobile.png', fullPage: true });

  await sql`DELETE FROM funnel WHERE slug = 'e2e-apple-result'`;
  await sql.end();
});
