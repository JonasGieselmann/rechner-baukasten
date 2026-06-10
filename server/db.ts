import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { nanoid } from 'nanoid';
import * as schema from './schema.js';
import { buildPotenzialanalyseConfig, POTENZIALANALYSE_SLUG, POTENZIALANALYSE_VERSION } from './funnel-seed.js';

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
  // Multi-tenancy: custom calculators belong to an org. Additive + idempotent.
  // The only pre-existing seeded calc is BeautyFlow's ROI rechner → backfill it to
  // the beautyflow org; anything else defaults to the platform org.
  await client`ALTER TABLE custom_calculator ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT 'default'`;
  await client`UPDATE custom_calculator SET org_id = 'beautyflow' WHERE slug = 'beautyflow' AND org_id = 'default'`;
  await client`CREATE INDEX IF NOT EXISTS custom_calculator_org_idx ON custom_calculator(org_id)`;

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

// Admin password reset: set the credential password hash for a user, creating
// the credential account row if the user has none yet (e.g. seeded admins).
// The hash must be produced by Better Auth's hasher (auth.$context.password.hash).
export async function setCredentialPassword(userId: string, passwordHash: string): Promise<void> {
  const validatedId = validateUserId(userId);
  const updated = await client`
    UPDATE account SET password = ${passwordHash}, updated_at = NOW()
    WHERE user_id = ${validatedId} AND provider_id = 'credential'
    RETURNING id
  `;
  if (updated.length === 0) {
    await client`
      INSERT INTO account (id, account_id, provider_id, user_id, password)
      VALUES (${nanoid()}, ${validatedId}, 'credential', ${validatedId}, ${passwordHash})
    `;
  }
  // Revoke the user's existing sessions so any compromised/old session cannot
  // outlive the reset; the user must log in again with the new password.
  await client`DELETE FROM session WHERE user_id = ${validatedId}`;
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

// Admin-create a user directly (no self-signup). Inserts the user row; the
// caller then sets a password via setCredentialPassword. Email is normalized to
// lower-case to match Better Auth's login lookup. Throws on duplicate email.
export async function adminCreateUser(p: { id: string; name: string; email: string; role: string; orgId: string }) {
  if (!['super_admin', 'agency_admin', 'customer'].includes(p.role)) throw new Error('Invalid role');
  if (!isValidId(p.orgId)) throw new Error('Invalid org ID');
  const email = p.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ungültige E-Mail');
  const existing = await client`SELECT id FROM "user" WHERE lower(email) = ${email}`;
  if (existing.length > 0) throw new Error('E-Mail bereits vergeben');
  await client`
    INSERT INTO "user" (id, name, email, email_verified, role, approved, org_id)
    VALUES (${p.id}, ${p.name.trim().slice(0, 200)}, ${email}, true, ${p.role}, true, ${p.orgId})
  `;
  return { id: p.id, name: p.name, email, role: p.role, org_id: p.orgId };
}

// Users within one organization (for the agency console — org-scoped).
export async function getUsersByOrg(orgId: string, limit = 1000) {
  if (!isValidId(orgId)) return [];
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  return await client`
    SELECT id, name, email, role, approved, created_at
    FROM "user"
    WHERE org_id = ${orgId}
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

// Platform overview: every org plus REAL counts (no invented metrics). Platform
// org (parent_org_id IS NULL = Layer One) sorts first, then customer orgs.
export async function getOrganizationsWithCounts() {
  return await client`
    SELECT
      o.id, o.name, o.slug, o.parent_org_id, o.brand_name, o.logo_url, o.created_at,
      (SELECT COUNT(*)::int FROM "user" u WHERE u.org_id = o.id) AS user_count,
      (SELECT COUNT(*)::int FROM "user" u WHERE u.org_id = o.id AND u.role = 'customer') AS customer_count,
      (SELECT COUNT(*)::int FROM "user" u WHERE u.org_id = o.id AND u.role = 'agency_admin') AS admin_count,
      (SELECT COUNT(*)::int FROM funnel f WHERE f.org_id = o.id) AS funnel_count,
      (SELECT COUNT(*)::int FROM dashboard d WHERE d.org_id = o.id) AS dashboard_count
    FROM organization o
    ORDER BY (o.parent_org_id IS NULL) DESC, o.created_at ASC
    LIMIT 1000
  `;
}

export async function getOrgBySlug(slug: string) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const r = await client`SELECT * FROM organization WHERE slug = ${slug}`;
  return r[0] || null;
}

export async function createOrganization(params: { id: string; name: string; slug: string; parentOrgId?: string }) {
  // White-label customer orgs are children of the platform org (Layer One,
  // id 'default') by default, so they appear under it in the hierarchy.
  const parentOrgId = params.parentOrgId ?? 'default';
  await client`
    INSERT INTO organization (id, name, slug, parent_org_id, plan_id)
    VALUES (${params.id}, ${params.name}, ${params.slug}, ${parentOrgId}, 'basic')
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
  // Clear a stale dashboard assignment when the org changes, so a moved user can
  // never resolve a dashboard belonging to their previous org.
  await client`
    UPDATE "user"
    SET role = 'agency_admin', approved = true, org_id = ${orgId},
        dashboard_id = CASE WHEN org_id IS DISTINCT FROM ${orgId} THEN NULL ELSE dashboard_id END,
        updated_at = NOW()
    WHERE id = ${v}
  `;
}

// Set a user's role + org (platform_admin only operation).
export async function setUserRoleAndOrg(userId: string, role: string, orgId: string): Promise<void> {
  const v = validateUserId(userId);
  if (!['super_admin', 'agency_admin', 'customer'].includes(role)) throw new Error('Invalid role');
  if (!isValidId(orgId)) throw new Error('Invalid org ID');
  await client`
    UPDATE "user"
    SET role = ${role}, org_id = ${orgId}, approved = true,
        dashboard_id = CASE WHEN org_id IS DISTINCT FROM ${orgId} THEN NULL ELSE dashboard_id END,
        updated_at = NOW()
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
  // Defense-in-depth: never surface a dashboard from a different org than the
  // user currently belongs to (guards against any stale dashboard_id).
  if ((d.org_id as string) !== (u.org_id as string)) return null;
  const funnels = await getDashboardFunnels(u.dashboard_id);
  return { dashboard: { id: d.id, name: d.name, description: d.description }, funnels };
}

// ============================================
// Org invites (agency self-service onboarding via link)
// ============================================

export async function initInviteSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS org_invite (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      org_id TEXT NOT NULL,
      created_by TEXT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  // Invites carry the role the invitee receives on claim: 'customer' (end client)
  // or 'agency_admin' (the agency's own team). Added idempotently for existing DBs.
  await client`ALTER TABLE org_invite ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'`;
  // Team (agency_admin) invites are single-use — they grant admin, so a leaked
  // multi-use link must not let multiple strangers become admins. used_at marks
  // a consumed team invite. Customer invites stay multi-use (bulk onboarding).
  await client`ALTER TABLE org_invite ADD COLUMN IF NOT EXISTS used_at TIMESTAMP`;
  await client`CREATE INDEX IF NOT EXISTS org_invite_token_idx ON org_invite(token)`;
  await client`CREATE INDEX IF NOT EXISTS org_invite_org_idx ON org_invite(org_id)`;
  console.log('Invite schema initialized (PostgreSQL)');
}

// Invite role is restricted to customer or agency_admin — NEVER super_admin
// (platform operators are never minted through a tenant invite).
const INVITE_ROLES = ['customer', 'agency_admin'] as const;
export async function createInvite(p: { id: string; token: string; orgId: string; createdBy: string; expiresAt: string; role?: string }) {
  if (!isValidId(p.orgId)) throw new Error('Invalid org ID');
  const role: string = INVITE_ROLES.includes(p.role as typeof INVITE_ROLES[number]) ? (p.role as string) : 'customer';
  await client`
    INSERT INTO org_invite (id, token, org_id, created_by, expires_at, role)
    VALUES (${p.id}, ${p.token}, ${p.orgId}, ${p.createdBy}, ${p.expiresAt}::timestamp, ${role})
  `;
  const [row] = await client`SELECT id, token, org_id, role, expires_at, created_at FROM org_invite WHERE id = ${p.id}`;
  return row ?? null;
}

export async function getInviteByToken(token: string) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [row] = await client`SELECT id, token, org_id, role, used_at, expires_at, created_at FROM org_invite WHERE token = ${token}`;
  return row ?? null;
}

// Atomically consume a single-use (team) invite: marks used_at only if still
// unused, returning the row iff this caller won the race. Used for agency_admin
// invites so a leaked link cannot mint more than one admin.
export async function markInviteUsed(id: string) {
  if (typeof id !== 'string') return null;
  const [row] = await client`
    UPDATE org_invite SET used_at = NOW() WHERE id = ${id} AND used_at IS NULL RETURNING id
  `;
  return row ?? null;
}

export async function getInvitesByOrg(orgId: string) {
  if (!isValidId(orgId)) return [];
  return await client`
    SELECT id, token, org_id, role, expires_at, created_at FROM org_invite
    WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT 200
  `;
}

// ============================================
// Password reset tokens. SMTP-independent: an admin/agency can generate a link
// and hand it to the user directly; when SMTP is configured the user can also
// request one via "Passwort vergessen". Mirrors the org_invite token pattern.
// ============================================
export async function initPasswordResetSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS password_reset (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      created_by TEXT,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS password_reset_token_idx ON password_reset(token)`;
  await client`CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset(user_id)`;
  console.log('Password-reset schema initialized (PostgreSQL)');
}

// Create a reset token for a user. Invalidates any prior unused tokens so only
// one reset link is ever live per user. expiresAt is an ISO string (postgres-js
// rejects JS Date objects — same gotcha as createInvite).
export async function createPasswordReset(p: { id: string; token: string; userId: string; createdBy: string | null; expiresAt: string }) {
  const validatedId = validateUserId(p.userId);
  await client`UPDATE password_reset SET used_at = NOW() WHERE user_id = ${validatedId} AND used_at IS NULL`;
  await client`
    INSERT INTO password_reset (id, token, user_id, created_by, expires_at)
    VALUES (${p.id}, ${p.token}, ${validatedId}, ${p.createdBy}, ${p.expiresAt}::timestamp)
  `;
  return { token: p.token };
}

// Returns the reset row + target user iff the token is valid (exists, unused,
// not expired). Null otherwise. Token format guarded against pathological input.
export async function getValidPasswordReset(token: string) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [row] = await client`
    SELECT pr.id, pr.token, pr.user_id, pr.expires_at, pr.used_at, u.email, u.name
    FROM password_reset pr
    JOIN "user" u ON u.id = pr.user_id
    WHERE pr.token = ${token} AND pr.used_at IS NULL AND pr.expires_at > NOW()
  `;
  return row ?? null;
}

// Atomically consume a reset token: marks used_at only if still valid+unused and
// returns the bound user_id iff this caller won the race. Prevents the TOCTOU
// double-use window of a separate read-then-mark.
export async function consumePasswordReset(token: string) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [row] = await client`
    UPDATE password_reset SET used_at = NOW()
    WHERE token = ${token} AND used_at IS NULL AND expires_at > NOW()
    RETURNING id, user_id
  `;
  return row ?? null;
}

// Lookup a user by email for the public "forgot password" flow. Returns null on
// invalid/unknown email (the route still responds generically — no enumeration).
export async function getUserByEmailForReset(email: string) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  const [row] = await client`SELECT id, name, email FROM "user" WHERE lower(email) = ${normalized}`;
  return row ?? null;
}

// ============================================
// Org packages (each agency configures the packages its own customers see).
// NOTE: these are the AGENCY's product packages (e.g. BeautyFlow's), NOT a Kalku
// platform tier — Kalku itself has no pricing. No prices are displayed.
// ============================================

// ============================================
// Builder calculators (the no-code block builder). Previously localStorage-only
// (browser-bound, unshareable); now server-persisted + org-scoped so embeds work
// across browsers and calcs belong to an org. The full CalculatorConfig (blocks,
// theme, variables, description) lives in the `config` jsonb; name is a column.
// ============================================
export async function initBuilderCalculatorSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS builder_calculator (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      owner_id TEXT,
      name TEXT NOT NULL,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS builder_calculator_org_idx ON builder_calculator(org_id)`;
  console.log('Builder-calculator schema initialized (PostgreSQL)');
}

export async function getBuilderCalculatorsByOrg(orgId: string) {
  if (!isValidId(orgId)) return [];
  return await client`
    SELECT id, name, config, created_at, updated_at FROM builder_calculator
    WHERE org_id = ${orgId} ORDER BY updated_at DESC LIMIT 500
  `;
}

export async function getBuilderCalculatorById(id: string) {
  if (!isValidId(id)) return null;
  const [row] = await client`SELECT id, name, config, org_id, created_at, updated_at FROM builder_calculator WHERE id = ${id}`;
  return row ?? null;
}

export async function createBuilderCalculator(p: { id: string; orgId: string; ownerId: string; name: string; config: unknown }) {
  if (!isValidId(p.orgId)) throw new Error('Invalid org ID');
  await client`
    INSERT INTO builder_calculator (id, org_id, owner_id, name, config)
    VALUES (${p.id}, ${p.orgId}, ${p.ownerId}, ${p.name}, ${JSON.stringify(p.config ?? {})}::jsonb)
  `;
  return getBuilderCalculatorById(p.id);
}

export async function updateBuilderCalculator(id: string, name: string, config: unknown) {
  await client`
    UPDATE builder_calculator SET name = ${name}, config = ${JSON.stringify(config ?? {})}::jsonb, updated_at = NOW()
    WHERE id = ${id}
  `;
  return getBuilderCalculatorById(id);
}

export async function deleteBuilderCalculator(id: string) {
  if (!isValidId(id)) return;
  await client`DELETE FROM builder_calculator WHERE id = ${id}`;
}

export async function initPackageSchema() {
  await client`
    CREATE TABLE IF NOT EXISTS org_package (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS org_package_org_idx ON org_package(org_id)`;
  // Seed BeautyFlow's three package NAMES (Basic/Business/Enterprise) exactly ONCE,
  // with empty features — the agency admin fills in the real details. A one-time
  // flag (not a count check) so deleting all packages does NOT resurrect them on
  // the next restart. We do NOT invent feature content here.
  const [flag] = await client`SELECT value FROM app_setting WHERE key = 'pkg_seed_beautyflow'`;
  if (!flag) {
    const names = ['Basic', 'Business', 'Enterprise'];
    for (let i = 0; i < names.length; i++) {
      await client`
        INSERT INTO org_package (id, org_id, name, description, features, sort_order)
        VALUES (${nanoid()}, 'beautyflow', ${names[i]}, '', '[]'::jsonb, ${i})
      `;
    }
    await client`INSERT INTO app_setting (key, value) VALUES ('pkg_seed_beautyflow', '1') ON CONFLICT (key) DO NOTHING`;
  }
  console.log('Package schema initialized (PostgreSQL)');
}

export async function getPackagesByOrg(orgId: string) {
  if (!isValidId(orgId)) return [];
  return await client`
    SELECT id, org_id, name, description, features, sort_order
    FROM org_package WHERE org_id = ${orgId} ORDER BY sort_order ASC, created_at ASC LIMIT 100
  `;
}

export async function getPackageById(id: string) {
  if (!isValidId(id)) return null;
  const [row] = await client`SELECT id, org_id, name, description, features, sort_order FROM org_package WHERE id = ${id}`;
  return row ?? null;
}

export async function createPackage(p: { id: string; orgId: string; name: string; description: string; features: string[]; sortOrder: number }) {
  if (!isValidId(p.orgId)) throw new Error('Invalid org ID');
  await client`
    INSERT INTO org_package (id, org_id, name, description, features, sort_order)
    VALUES (${p.id}, ${p.orgId}, ${p.name}, ${p.description}, ${JSON.stringify(p.features)}::jsonb, ${p.sortOrder})
  `;
  return getPackageById(p.id);
}

export async function updatePackage(id: string, p: { name: string; description: string; features: string[]; sortOrder: number }) {
  if (!isValidId(id)) throw new Error('Invalid package ID');
  await client`
    UPDATE org_package SET name = ${p.name}, description = ${p.description},
      features = ${JSON.stringify(p.features)}::jsonb, sort_order = ${p.sortOrder}
    WHERE id = ${id}
  `;
  return getPackageById(id);
}

export async function deletePackage(id: string): Promise<void> {
  if (!isValidId(id)) throw new Error('Invalid package ID');
  await client`DELETE FROM org_package WHERE id = ${id}`;
}

// ============================================
// Plans (legacy global tier table — retained for compatibility, no longer
// surfaced as a Kalku org tier; superseded by org_package above)
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
  // Give BeautyFlow a dashboard that bundles its funnel(s), so it shows up under
  // "Dashboards" (1 Dashboard : N Funnels) instead of only as a loose funnel.
  const bfFunnel = await client`SELECT id FROM funnel WHERE slug = 'potenzialanalyse' LIMIT 1`;
  if (bfFunnel[0]) {
    await client`
      INSERT INTO dashboard (id, org_id, name, description)
      VALUES ('beautyflow-dashboard', 'beautyflow', 'BeautyFlow Dashboard', 'Kundenportal mit Potenzialanalyse')
      ON CONFLICT (id) DO NOTHING
    `;
    await client`
      INSERT INTO dashboard_funnel (id, dashboard_id, funnel_id, position)
      VALUES ('bf-dash-potenzial', 'beautyflow-dashboard', ${bfFunnel[0].id as string}, 0)
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log('BeautyFlow tenant provisioned (PostgreSQL)');
}

// Keep the live potenzialanalyse funnel in sync with the canonical config
// (server/funnel-seed.ts) without needing direct prod DB access — the config is
// data, not code, so it ships via this boot step. Version-guarded: it only
// rewrites the funnel when the stored config version is older than the canonical
// one, so structural changes deploy in place while admin edits persist between
// versions. Creates the funnel if it does not exist yet and a platform admin
// is available to own it.
export async function syncPotenzialanalyseFunnel() {
  const canonical = buildPotenzialanalyseConfig();
  const rows = await client`SELECT id, config FROM funnel WHERE slug = ${POTENZIALANALYSE_SLUG} LIMIT 1`;
  const row = rows[0];
  if (!row) {
    const owner = await client`SELECT id FROM "user" WHERE role = 'super_admin' AND approved = true ORDER BY created_at ASC LIMIT 1`;
    if (!owner[0]) return; // no one to own it yet (fresh DB) -> seed script handles creation
    // Create in the always-present platform org ('default'); initBeautyflowTenant
    // (runs right after) moves it into 'beautyflow' and links the dashboard. This
    // avoids referencing 'beautyflow' before that org exists.
    await client`
      INSERT INTO funnel (id, owner_id, org_id, name, slug, description, status, config)
      VALUES (${nanoid()}, ${owner[0].id as string}, 'default', 'BeautyFlow Potenzialanalyse', ${POTENZIALANALYSE_SLUG}, 'Kurz-Funnel: Mehrumsatz-Rechner + Profil', 'published', ${JSON.stringify(canonical)}::jsonb)
    `;
    console.log('Potenzialanalyse funnel created (PostgreSQL)');
    return;
  }
  const stored = row.config as { version?: number } | null;
  const storedVersion = typeof stored?.version === 'number' ? stored.version : 0;
  if (storedVersion < POTENZIALANALYSE_VERSION) {
    await client`UPDATE funnel SET config = ${JSON.stringify(canonical)}::jsonb, updated_at = NOW() WHERE id = ${row.id as string}`;
    console.log(`Potenzialanalyse funnel upgraded to v${POTENZIALANALYSE_VERSION} (PostgreSQL)`);
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
