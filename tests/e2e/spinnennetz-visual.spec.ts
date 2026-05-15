import { test } from '@playwright/test';
import postgres from 'postgres';

const SLUG = 'e2e-spinnennetz';

test.beforeAll(async () => {
  const sql = postgres(process.env.DATABASE_URL!);
  await sql`DELETE FROM funnel WHERE slug = ${SLUG}`;
  await sql`INSERT INTO "user" (id, name, email, role, approved) VALUES ('e2e-spider-user', 'Spider', 'spider@e2e.local', 'super_admin', true) ON CONFLICT (id) DO NOTHING`;
  await sql`
    INSERT INTO funnel (id, owner_id, name, slug, description, status, config)
    VALUES (
      gen_random_uuid()::text, 'e2e-spider-user', 'Spider', ${SLUG}, '', 'published',
      ${sql.json({
        theme: { mode: 'light', primaryColor: '#0F2F5B', accentColor: '#7EC8F3', backgroundColor: '#F7FAFF', cardColor: '#FFFFFF', textColor: '#0F2F5B', borderColor: '#E0E7F2' },
        settings: { progressBar: true, ctaCalendarUrl: '' },
        steps: [{ id: 'i1', type: 'intro', title: 'Sehen Sie Ihr Profil in 8 *Dimensionen*', body: 'Mit dem Spinnennetz.', ctaLabel: 'Los' }],
      })}
    )
  `;
  await sql.end();
});

test('spinnennetz hero', async ({ page }) => {
  await page.goto(`/funnel/${SLUG}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/spinnennetz-hero/intro.png', fullPage: true });
});
