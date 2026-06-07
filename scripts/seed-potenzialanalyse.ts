import 'dotenv/config';
import postgres from 'postgres';
import { nanoid } from 'nanoid';
import { buildPotenzialanalyseConfig, POTENZIALANALYSE_SLUG as SLUG } from '../server/funnel-seed.js';

// Canonical funnel config lives in server/funnel-seed.ts (shared with the
// boot-time sync). This script seeds/updates the funnel against any DATABASE_URL.
async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const sql = postgres(DATABASE_URL);
  try {
    const config = buildPotenzialanalyseConfig();
    const existing = await sql`SELECT id FROM funnel WHERE slug = ${SLUG} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`Funnel "${SLUG}" exists (id=${existing[0].id}). Updating config + steps in place.`);
      await sql`UPDATE funnel SET config = ${sql.json(config)}, updated_at = NOW() WHERE slug = ${SLUG}`;
      console.log('Updated.');
      return;
    }

    const owner = await sql`SELECT id FROM "user" WHERE role = 'super_admin' AND approved = true ORDER BY created_at ASC LIMIT 1`;
    if (owner.length === 0) {
      console.error('No super_admin user found. Create and approve one first, then re-run.');
      process.exit(1);
    }
    const ownerId = owner[0].id;
    const id = nanoid();
    await sql`
      INSERT INTO funnel (id, owner_id, name, slug, description, status, config)
      VALUES (${id}, ${ownerId}, ${'BeautyFlow Potenzialanalyse'}, ${SLUG}, ${'Kurz-Funnel: Mehrumsatz-Rechner + Profil'}, ${'published'}, ${sql.json(config)})
    `;
    console.log(`Seeded funnel id=${id} slug=${SLUG} owner=${ownerId}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
