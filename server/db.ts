import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// ============================================
// Database Configuration
// ============================================

// Database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

// ============================================
// Input Validation Helpers
// ============================================

// Validate UUID-like ID format (Better Auth uses nanoid-style IDs)
function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}

// Sanitize and validate user ID
function validateUserId(userId: string): string {
  if (!isValidId(userId)) {
    throw new Error('Invalid user ID format');
  }
  return userId;
}

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create PostgreSQL connection
const client = postgres(DATABASE_URL);

export const db = drizzle(client, { schema });
export { schema };

// Initialize auth schema tables
export async function initAuthSchema() {
  // Create user table
  await client`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      approved BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // Add role and approved columns if they don't exist (for existing databases)
  await client`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'role') THEN
        ALTER TABLE "user" ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'approved') THEN
        ALTER TABLE "user" ADD COLUMN approved BOOLEAN NOT NULL DEFAULT false;
      END IF;
    END $$
  `;

  // Add practice profile columns (idempotent, safe on existing databases)
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT`;
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS business_name TEXT`;
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS website_url TEXT`;
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS instagram_handle TEXT`;
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS gmb_url TEXT`;

  // Create session table
  await client`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS session_user_id_idx ON session(user_id)`;

  // Create account table
  await client`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at TIMESTAMP,
      refresh_token_expires_at TIMESTAMP,
      scope TEXT,
      password TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS account_user_id_idx ON account(user_id)`;

  // Create verification table
  await client`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier)`;

  // Create custom_calculator table for S3-backed custom calculators
  await client`
    CREATE TABLE IF NOT EXISTS custom_calculator (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      s3_prefix TEXT NOT NULL,
      width TEXT NOT NULL DEFAULT '100%',
      height TEXT NOT NULL DEFAULT '800px',
      active BOOLEAN NOT NULL DEFAULT true,
      file_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS custom_calculator_slug_idx ON custom_calculator(slug)`;

  console.log('Auth schema initialized (PostgreSQL)');
}

// Initialize funnel-builder tables
export async function initFunnelSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS funnel (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      config JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS funnel_owner_id_idx ON funnel(owner_id)`;
  await client`CREATE INDEX IF NOT EXISTS funnel_slug_idx ON funnel(slug)`;

  await client`
    CREATE TABLE IF NOT EXISTS lead (
      id TEXT PRIMARY KEY,
      funnel_id TEXT NOT NULL REFERENCES funnel(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      phone TEXT,
      business_name TEXT,
      website_url TEXT,
      instagram_handle TEXT,
      gmb_url TEXT,
      answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      recommendation TEXT,
      kalku_potential JSONB,
      scrape_data JSONB,
      scrape_status TEXT NOT NULL DEFAULT 'pending',
      pdf_url TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      utm JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS lead_funnel_id_idx ON lead(funnel_id)`;
  await client`CREATE INDEX IF NOT EXISTS lead_created_at_idx ON lead(created_at DESC)`;

  await client`ALTER TABLE lead ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL`;
  await client`CREATE INDEX IF NOT EXISTS lead_user_id_idx ON lead(user_id)`;

  await client`ALTER TABLE lead ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP`;
  await client`ALTER TABLE lead ADD COLUMN IF NOT EXISTS email_error TEXT`;

  console.log('Funnel schema initialized (PostgreSQL)');
}

// Initialize app_setting table
export async function initAppSettings() {
  await client`
    CREATE TABLE IF NOT EXISTS app_setting (
      key TEXT PRIMARY KEY,
      value TEXT,
      encrypted BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('App settings schema initialized (PostgreSQL)');
}

// Get raw postgres client for custom queries (used by custom-calculators S3 sync)
export function getRawClient() {
  return client;
}

// Verify database connection
export async function checkDb() {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Check if a super_admin already exists
export async function hasSuperAdmin(): Promise<boolean> {
  const result = await client`
    SELECT EXISTS(SELECT 1 FROM "user" WHERE role = 'super_admin') as exists
  `;
  return result[0].exists === true;
}

// Atomically promote user to super_admin if no super_admin exists
// Returns true if user was promoted, false if super_admin already exists
export async function trySetFirstUserAsSuperAdmin(userId: string): Promise<boolean> {
  const validatedId = validateUserId(userId);
  // Use a transaction to ensure atomicity
  const result = await client`
    UPDATE "user"
    SET role = 'super_admin', approved = true, updated_at = NOW()
    WHERE id = ${validatedId}
    AND NOT EXISTS (SELECT 1 FROM "user" WHERE role = 'super_admin' AND id != ${validatedId})
    RETURNING id
  `;
  return result.length > 0;
}

// Approve a user
export async function approveUser(userId: string): Promise<void> {
  const validatedId = validateUserId(userId);
  await client`
    UPDATE "user"
    SET approved = true, updated_at = NOW()
    WHERE id = ${validatedId}
  `;
}

// Set a user as customer (approved, role=customer) in one statement
export async function setUserAsCustomer(userId: string): Promise<void> {
  const validatedId = validateUserId(userId);
  // Self-registering end-customers belong to the BeautyFlow customer org (the
  // first white-label tenant), not the Layer One platform org. Fall back to
  // 'default' only if the beautyflow org has not been provisioned yet.
  await client`
    UPDATE "user"
    SET role = 'customer', approved = true,
        org_id = COALESCE((SELECT id FROM organization WHERE id = 'beautyflow'), 'default'),
        updated_at = NOW()
    WHERE id = ${validatedId}
  `;
}

// Reject (delete) a user
export async function deleteUser(userId: string): Promise<void> {
  const validatedId = validateUserId(userId);
  await client`DELETE FROM "user" WHERE id = ${validatedId}`;
}

// DSGVO Art. 17 self-service deletion: removes the user's own leads (PII) and
// then the user row (sessions/accounts/consents cascade via their FKs).
export async function deleteOwnAccount(userId: string): Promise<void> {
  const validatedId = validateUserId(userId);
  await client`DELETE FROM lead WHERE user_id = ${validatedId}`;
  await client`DELETE FROM "user" WHERE id = ${validatedId}`;
}

// Get all users (for admin panel) - with limit for safety
export async function getAllUsers(limit = 1000) {
  // Limit to prevent potential DoS from large datasets
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  return await client`
    SELECT id, name, email, role, approved, created_at
    FROM "user"
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;
}

// Get user by ID
export async function getUserById(userId: string) {
  const validatedId = validateUserId(userId);
  const result = await client`
    SELECT id, name, email, role, approved, org_id, dashboard_id, created_at,
           phone, business_name, website_url, instagram_handle, gmb_url
    FROM "user"
    WHERE id = ${validatedId}
  `;
  return result[0] || null;
}

// ============================================
// Multi-tenancy: organizations + org scoping
// ============================================

// Initialize the organization layer (idempotent, additive, no lockout):
// creates the org table, a 'default' platform org, adds org_id to user/funnel/lead,
// backfills existing rows to 'default', and sets that as the column default.
export async function initOrganizationSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_org_id TEXT,
      plan_id TEXT,
      brand_name TEXT,
      logo_url TEXT,
      primary_color TEXT,
      accent_color TEXT,
      background_color TEXT,
      text_color TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  // Hierarchy column for existing deployments.
  await client`ALTER TABLE organization ADD COLUMN IF NOT EXISTS parent_org_id TEXT`;
  // The 'default' org is the platform / operator org = Layer One (the über-org of
  // the software team). It is the root of the hierarchy (parent_org_id NULL) and
  // hosts the super_admins. Rename it from the old "BeautyFlow Platform" label so
  // BeautyFlow can become its own customer org (see initBeautyflowTenant).
  await client`
    INSERT INTO organization (id, name, slug, parent_org_id)
    VALUES ('default', 'Layer One', 'default', NULL)
    ON CONFLICT (id) DO UPDATE SET name = 'Layer One', parent_org_id = NULL
    WHERE organization.name = 'BeautyFlow Platform' OR organization.name = 'Layer One'
  `;
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS org_id TEXT`;
  await client`UPDATE "user" SET org_id = 'default' WHERE org_id IS NULL`;
  await client`ALTER TABLE "user" ALTER COLUMN org_id SET DEFAULT 'default'`;
  await client`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS dashboard_id TEXT`;
  await client`ALTER TABLE funnel ADD COLUMN IF NOT EXISTS org_id TEXT`;
  await client`UPDATE funnel SET org_id = 'default' WHERE org_id IS NULL`;
  await client`ALTER TABLE funnel ALTER COLUMN org_id SET DEFAULT 'default'`;
  await client`ALTER TABLE lead ADD COLUMN IF NOT EXISTS org_id TEXT`;
  await client`UPDATE lead SET org_id = 'default' WHERE org_id IS NULL`;
  await client`ALTER TABLE lead ALTER COLUMN org_id SET DEFAULT 'default'`;
  await client`CREATE INDEX IF NOT EXISTS user_org_id_idx ON "user"(org_id)`;
  await client`CREATE INDEX IF NOT EXISTS funnel_org_id_idx ON funnel(org_id)`;
  await client`CREATE INDEX IF NOT EXISTS lead_org_id_idx ON lead(org_id)`;
  // Enforce NOT NULL now that every row is backfilled + the column has a default.
  await client`ALTER TABLE "user" ALTER COLUMN org_id SET NOT NULL`;
  await client`ALTER TABLE funnel ALTER COLUMN org_id SET NOT NULL`;
  await client`ALTER TABLE lead ALTER COLUMN org_id SET NOT NULL`;
  console.log('Organization schema initialized (PostgreSQL)');
}

export async function getAllOrganizations() {
  return await client`
    SELECT id, name, slug, parent_org_id, plan_id, brand_name, logo_url, created_at
    FROM organization ORDER BY created_at DESC LIMIT 1000
  `;
}

export async function getOrgById(orgId: string) {
  if (!isValidId(orgId)) return null;
  const r = await client`SELECT * FROM organization WHERE id = ${orgId}`;
  return r[0] || null;
}

export async function getOrgBySlug(slug: string) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const r = await client`SELECT * FROM organization WHERE slug = ${slug}`;
  return r[0] || null;
}

export async function createOrganization(params: { id: string; name: string; slug: string }) {
  await client`
    INSERT INTO organization (id, name, slug)
    VALUES (${params.id}, ${params.name}, ${params.slug})
  `;
  return getOrgById(params.id);
}

export async function updateOrgBranding(
  orgId: string,
  b: { brandName?: string | null; logoUrl?: string | null; primaryColor?: string | null; accentColor?: string | null; backgroundColor?: string | null; textColor?: string | null },
): Promise<void> {
  if (!isValidId(orgId)) throw new Error('Invalid org ID');
  await client`
    UPDATE organization SET
      brand_name = ${b.brandName ?? null},
      logo_url = ${b.logoUrl ?? null},
      primary_color = ${b.primaryColor ?? null},
      accent_color = ${b.accentColor ?? null},
      background_color = ${b.backgroundColor ?? null},
      text_color = ${b.textColor ?? null},
      updated_at = NOW()
    WHERE id = ${orgId}
  `;
}

// Promote a user to agency admin (Tier 2 white-label) within an org.
export async function setUserAsAgencyAdmin(userId: string, orgId: string): Promise<void> {
  const v = validateUserId(userId);
  if (!isValidId(orgId)) throw new Error('Invalid org ID');
  await client`
    UPDATE "user" SET role = 'agency_admin', approved = true, org_id = ${orgId}, updated_at = NOW()
    WHERE id = ${v}
  `;
}

// Set a user's role + org (platform_admin only operation).
export async function setUserRoleAndOrg(userId: string, role: string, orgId: string): Promise<void> {
  const v = validateUserId(userId);
  if (!['super_admin', 'agency_admin', 'customer', 'user'].includes(role)) throw new Error('Invalid role');
  if (!isValidId(orgId)) throw new Error('Invalid org ID');
  await client`
    UPDATE "user" SET role = ${role}, org_id = ${orgId}, approved = true, updated_at = NOW()
    WHERE id = ${v}
  `;
}

export async function assignDashboardToUser(userId: string, dashboardId: string | null): Promise<void> {
  const v = validateUserId(userId);
  await client`UPDATE "user" SET dashboard_id = ${dashboardId}, updated_at = NOW() WHERE id = ${v}`;
}

// ============================================
// Dashboards (customer workspaces) + dashboard<->funnel links
// ============================================

export async function initDashboardSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS dashboard (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS dashboard_funnel (
      id TEXT PRIMARY KEY,
      dashboard_id TEXT NOT NULL REFERENCES dashboard(id) ON DELETE CASCADE,
      funnel_id TEXT NOT NULL REFERENCES funnel(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS dashboard_org_idx ON dashboard(org_id)`;
  await client`CREATE INDEX IF NOT EXISTS dashboard_funnel_dashboard_idx ON dashboard_funnel(dashboard_id)`;
  await client`CREATE UNIQUE INDEX IF NOT EXISTS dashboard_funnel_uniq ON dashboard_funnel(dashboard_id, funnel_id)`;
  console.log('Dashboard schema initialized (PostgreSQL)');
}

export async function getDashboardById(id: string) {
  if (!isValidId(id)) return null;
  const r = await client`SELECT * FROM dashboard WHERE id = ${id}`;
  return r[0] || null;
}

export async function createDashboard(p: { id: string; orgId: string; name: string; description?: string }) {
  await client`
    INSERT INTO dashboard (id, org_id, name, description)
    VALUES (${p.id}, ${p.orgId}, ${p.name}, ${p.description ?? ''})
  `;
  return getDashboardById(p.id);
}

export async function getDashboardsByOrg(orgId: string) {
  return await client`
    SELECT id, org_id, name, description, created_at FROM dashboard
    WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT 1000
  `;
}

export async function getAllDashboards() {
  return await client`
    SELECT id, org_id, name, description, created_at FROM dashboard
    ORDER BY created_at DESC LIMIT 1000
  `;
}

export async function updateDashboard(id: string, name: string, description: string): Promise<void> {
  if (!isValidId(id)) throw new Error('Invalid dashboard ID');
  await client`UPDATE dashboard SET name = ${name}, description = ${description}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteDashboard(id: string): Promise<void> {
  if (!isValidId(id)) throw new Error('Invalid dashboard ID');
  await client`DELETE FROM dashboard WHERE id = ${id}`;
}

export async function addFunnelToDashboard(linkId: string, dashboardId: string, funnelId: string, position: number): Promise<void> {
  await client`
    INSERT INTO dashboard_funnel (id, dashboard_id, funnel_id, position)
    VALUES (${linkId}, ${dashboardId}, ${funnelId}, ${position})
    ON CONFLICT (dashboard_id, funnel_id) DO NOTHING
  `;
}

export async function removeFunnelFromDashboard(dashboardId: string, funnelId: string): Promise<void> {
  await client`DELETE FROM dashboard_funnel WHERE dashboard_id = ${dashboardId} AND funnel_id = ${funnelId}`;
}

export async function getDashboardFunnels(dashboardId: string) {
  if (!isValidId(dashboardId)) return [];
  return await client`
    SELECT f.id, f.slug, f.name, f.description, f.status, df.position
    FROM dashboard_funnel df JOIN funnel f ON f.id = df.funnel_id
    WHERE df.dashboard_id = ${dashboardId}
    ORDER BY df.position ASC, df.created_at ASC
  `;
}

// Resolve the dashboard + ordered funnels for an end-customer (null if none assigned).
export async function getUserDashboard(userId: string) {
  const u = await getUserById(userId);
  if (!u?.dashboard_id) return null;
  const d = await getDashboardById(u.dashboard_id);
  if (!d) return null;
  const funnels = await getDashboardFunnels(u.dashboard_id);
  return { dashboard: { id: d.id, name: d.name, description: d.description }, funnels };
}

// ============================================
// Plans (structure + limits; no payment integration)
// ============================================

export async function initPlanSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS plan (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price_label TEXT NOT NULL DEFAULT '',
      max_funnels INTEGER NOT NULL DEFAULT 0,
      max_end_customers INTEGER NOT NULL DEFAULT 0,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  // Tiers: Basic / Business / Enterprise. NO prices are shown anywhere (price_label
  // stays empty by design). DSGVO-Self-Service is a baseline legal entitlement for
  // every account, not a tier feature, so it is intentionally not listed.
  // ON CONFLICT DO UPDATE keeps name/features/limits in sync on every boot.
  await client`
    INSERT INTO plan (id, name, description, price_label, max_funnels, max_end_customers, features, sort_order)
    VALUES ('basic', 'Basic', 'Der Einstieg', '', 1, 10,
      ${JSON.stringify(['1 Funnel', 'Kunden-Dashboard', 'Potenzialanalyse'])}::jsonb, 0)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, price_label = EXCLUDED.price_label,
      max_funnels = EXCLUDED.max_funnels, max_end_customers = EXCLUDED.max_end_customers,
      features = EXCLUDED.features, sort_order = EXCLUDED.sort_order
  `;
  await client`
    INSERT INTO plan (id, name, description, price_label, max_funnels, max_end_customers, features, sort_order)
    VALUES ('business', 'Business', 'Für wachsende Praxen', '', 5, 100,
      ${JSON.stringify(['Bis zu 5 Funnels', 'Branding-Anpassung', 'Leitfaden', 'E-Mail-Reports'])}::jsonb, 1)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, price_label = EXCLUDED.price_label,
      max_funnels = EXCLUDED.max_funnels, max_end_customers = EXCLUDED.max_end_customers,
      features = EXCLUDED.features, sort_order = EXCLUDED.sort_order
  `;
  await client`
    INSERT INTO plan (id, name, description, price_label, max_funnels, max_end_customers, features, sort_order)
    VALUES ('enterprise', 'Enterprise', 'White-Label für Agenturen', '', 0, 0,
      ${JSON.stringify(['Unbegrenzte Funnels', 'White-Label-Branding', 'Mehrere Kunden-Dashboards', 'Prioritäts-Support'])}::jsonb, 2)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, price_label = EXCLUDED.price_label,
      max_funnels = EXCLUDED.max_funnels, max_end_customers = EXCLUDED.max_end_customers,
      features = EXCLUDED.features, sort_order = EXCLUDED.sort_order
  `;
  // Re-point any org still on the obsolete tiers (or unset) to the equivalent
  // new tier, preserving limits/semantics (NOT a blanket downgrade):
  //   free(1/10)->basic(1/10), pro(5/100)->business(5/100), agency(0/0)->enterprise(0/0).
  await client`
    UPDATE organization SET plan_id = CASE
      WHEN plan_id = 'pro' THEN 'business'
      WHEN plan_id = 'agency' THEN 'enterprise'
      ELSE 'basic'
    END
    WHERE plan_id IN ('free', 'pro', 'agency') OR plan_id IS NULL
  `;
  await client`DELETE FROM plan WHERE id IN ('free', 'pro', 'agency')`;
  console.log('Plan schema initialized (PostgreSQL)');
}

// Idempotent provisioning of the first white-label customer org. BeautyFlow
// becomes its own org (a child of the Layer One platform org); the
// potenzialanalyse funnel, its leads, all end-customers and their dashboards
// move into it. The platform org ('default' = Layer One) keeps only the
// operators (super_admins). Re-running is safe: every statement is conditional.
// Must run AFTER initOrganizationSchema / initFunnelSchema / initDashboardSchema /
// initPlanSchema so all tables, the org_id columns and the 'enterprise' plan exist.
export async function initBeautyflowTenant() {
  await client`
    INSERT INTO organization (id, name, slug, parent_org_id, plan_id, brand_name, primary_color, accent_color, background_color, text_color)
    VALUES ('beautyflow', 'BeautyFlow', 'beautyflow', 'default', 'enterprise', 'BeautyFlow', '#0F2F5B', '#7EC8F3', '#F7FAFF', '#0F2F5B')
    ON CONFLICT (id) DO UPDATE SET parent_org_id = 'default', plan_id = COALESCE(organization.plan_id, 'enterprise')
  `;
  // Move BeautyFlow's funnel(s) into the customer org (potenzialanalyse is the seed).
  await client`UPDATE funnel SET org_id = 'beautyflow' WHERE slug = 'potenzialanalyse'`;
  // Move the leads that belong to BeautyFlow's funnels.
  await client`UPDATE lead SET org_id = 'beautyflow' WHERE funnel_id IN (SELECT id FROM funnel WHERE org_id = 'beautyflow')`;
  // Move existing end-customers out of the platform org (super_admins stay).
  await client`UPDATE "user" SET org_id = 'beautyflow' WHERE role = 'customer' AND org_id = 'default'`;
  // Customer dashboards belong to the customer org, not the platform.
  await client`UPDATE dashboard SET org_id = 'beautyflow' WHERE org_id = 'default'`;
  console.log('BeautyFlow tenant provisioned (PostgreSQL)');
}

// Idempotent, conservative repair of the live potenzialanalyse funnel config so
// the deployed funnel matches the intended UX without needing direct prod DB
// access (the config is data, not code; this runs on boot). It ONLY fixes the
// known-broken state and never clobbers deliberate admin edits:
//  - sets the booking URL if it is still empty,
//  - drops a TRAILING cta-booking step that has no URL (a dead end), so the
//    result-spider becomes the terminal screen (which renders its own booking CTA).
// Once fixed it is a no-op on every subsequent boot.
const POTENZIAL_BOOKING_URL = 'https://calendly.com/beauty-flow/30min';
export async function repairPotenzialanalyseFunnel() {
  const rows = await client`SELECT id, config FROM funnel WHERE slug = 'potenzialanalyse' LIMIT 1`;
  const row = rows[0];
  if (!row) return;
  const config = row.config as {
    settings?: { ctaCalendarUrl?: string };
    steps?: Array<{ type?: string; calendarUrl?: string }>;
  };
  if (!config || !Array.isArray(config.steps)) return;
  let changed = false;

  config.settings = config.settings ?? {};
  if (!config.settings.ctaCalendarUrl || !config.settings.ctaCalendarUrl.trim()) {
    config.settings.ctaCalendarUrl = POTENZIAL_BOOKING_URL;
    changed = true;
  }

  const last = config.steps[config.steps.length - 1];
  const hasResult = config.steps.some((s) => s.type === 'result-spider');
  if (last && last.type === 'cta-booking' && hasResult && (!last.calendarUrl || !last.calendarUrl.trim())) {
    config.steps.pop();
    changed = true;
  }

  if (changed) {
    await client`UPDATE funnel SET config = ${JSON.stringify(config)}::jsonb, updated_at = NOW() WHERE id = ${row.id as string}`;
    console.log('Potenzialanalyse funnel config repaired (booking URL + terminal result)');
  }
}

export async function getPlans() {
  return await client`SELECT id, name, description, price_label, max_funnels, max_end_customers, features, sort_order FROM plan ORDER BY sort_order ASC`;
}

export async function setOrgPlan(orgId: string, planId: string): Promise<void> {
  if (!isValidId(orgId)) throw new Error('Invalid org ID');
  await client`UPDATE organization SET plan_id = ${planId}, updated_at = NOW() WHERE id = ${orgId}`;
}

export async function getOrgPlanWithUsage(orgId: string) {
  const org = await getOrgById(orgId);
  const planId = (org?.plan_id as string) || 'basic';
  const [planRow] = await client`SELECT * FROM plan WHERE id = ${planId}`;
  const [cnt] = await client`SELECT COUNT(*)::int AS count FROM funnel WHERE org_id = ${orgId}`;
  return { plan: planRow ?? null, usage: { funnels: Number(cnt?.count ?? 0) } };
}

// ============================================
// Compliance: consent log + email subscriptions
// ============================================

// Initialize compliance tables (idempotent)
export async function initComplianceSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS consent (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
      lead_id TEXT REFERENCES lead(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      text_version TEXT NOT NULL,
      granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      withdrawn_at TIMESTAMP,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS consent_user_id_idx ON consent(user_id)`;
  await client`CREATE INDEX IF NOT EXISTS consent_lead_id_idx ON consent(lead_id)`;

  await client`
    CREATE TABLE IF NOT EXISTS email_subscription (
      email TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      doi_token TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      confirmed_at TIMESTAMP,
      unsubscribed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('Compliance schema initialized (PostgreSQL)');
}

// Record a consent entry. type: 'privacy' | 'terms' | 'marketing'
export async function recordConsent(params: {
  id: string;
  userId?: string | null;
  leadId?: string | null;
  type: string;
  textVersion: string;
  ipAddress?: string | null;
}): Promise<void> {
  await client`
    INSERT INTO consent (id, user_id, lead_id, type, text_version, ip_address)
    VALUES (${params.id}, ${params.userId ?? null}, ${params.leadId ?? null}, ${params.type}, ${params.textVersion}, ${params.ipAddress ?? null})
  `;
}

// List consents (active + withdrawn) for a user
export async function getConsentsForUser(userId: string) {
  const validatedId = validateUserId(userId);
  return await client`
    SELECT id, type, text_version, granted_at, withdrawn_at
    FROM consent WHERE user_id = ${validatedId}
    ORDER BY granted_at DESC
  `;
}

// Withdraw a consent (scoped to the owning user)
export async function withdrawConsent(userId: string, consentId: string): Promise<boolean> {
  const validatedId = validateUserId(userId);
  if (!isValidId(consentId)) throw new Error('Invalid consent ID');
  const result = await client`
    UPDATE consent SET withdrawn_at = NOW()
    WHERE id = ${consentId} AND user_id = ${validatedId} AND withdrawn_at IS NULL
    RETURNING id
  `;
  return result.length > 0;
}

// Aggregate all personal data of a user for the DSGVO Art. 20 export
export async function getUserDataExport(userId: string) {
  const validatedId = validateUserId(userId);
  const [u] = await client`
    SELECT id, name, email, role, approved, phone, business_name, website_url,
           instagram_handle, gmb_url, created_at, updated_at
    FROM "user" WHERE id = ${validatedId}
  `;
  const leads = await client`
    SELECT id, funnel_id, name, email, phone, business_name, website_url, instagram_handle,
           gmb_url, answers, scores, recommendation, kalku_potential, scrape_data, scrape_status,
           source, status, created_at
    FROM lead WHERE user_id = ${validatedId} ORDER BY created_at DESC
  `;
  const consents = await client`
    SELECT id, type, text_version, granted_at, withdrawn_at
    FROM consent WHERE user_id = ${validatedId} ORDER BY granted_at DESC
  `;
  let subscription = null;
  if (u?.email) {
    const subs = await client`
      SELECT email, status, confirmed_at, unsubscribed_at
      FROM email_subscription WHERE email = ${u.email}
    `;
    subscription = subs[0] ?? null;
  }
  return { user: u ?? null, leads, consents, subscription };
}

// Upsert an email subscription, returning its current state
export async function getOrCreateSubscription(email: string, token: string, doiToken: string) {
  const normalized = email.toLowerCase().trim();
  const result = await client`
    INSERT INTO email_subscription (email, token, doi_token, status)
    VALUES (${normalized}, ${token}, ${doiToken}, 'pending')
    ON CONFLICT (email) DO UPDATE SET
      doi_token = EXCLUDED.doi_token,
      token = CASE WHEN email_subscription.status = 'unsubscribed' THEN EXCLUDED.token ELSE email_subscription.token END,
      status = CASE WHEN email_subscription.status = 'unsubscribed' THEN 'pending' ELSE email_subscription.status END,
      updated_at = NOW()
    RETURNING email, token, doi_token, status
  `;
  return result[0];
}

// Confirm double opt-in via the DOI token
export async function confirmSubscriptionByDoiToken(doiToken: string): Promise<boolean> {
  if (!isValidId(doiToken)) return false;
  const result = await client`
    UPDATE email_subscription
    SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    WHERE doi_token = ${doiToken} AND status <> 'unsubscribed'
    RETURNING email
  `;
  return result.length > 0;
}

// Unsubscribe via the stable unsubscribe token
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!isValidId(token)) return false;
  const result = await client`
    UPDATE email_subscription
    SET status = 'unsubscribed', unsubscribed_at = NOW(), updated_at = NOW()
    WHERE token = ${token}
    RETURNING email
  `;
  return result.length > 0;
}

// Unsubscribe by email (authenticated self-service, no token needed)
export async function unsubscribeByEmail(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const result = await client`
    UPDATE email_subscription
    SET status = 'unsubscribed', unsubscribed_at = NOW(), updated_at = NOW()
    WHERE email = ${normalized}
    RETURNING email
  `;
  return result.length > 0;
}

// Subscription state for a given email (for self-service display)
export async function getSubscriptionByEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  const subs = await client`
    SELECT email, status, confirmed_at, unsubscribed_at
    FROM email_subscription WHERE email = ${normalized}
  `;
  return subs[0] ?? null;
}
