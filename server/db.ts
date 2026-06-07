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
  await client`
    UPDATE "user"
    SET role = 'customer', approved = true, updated_at = NOW()
    WHERE id = ${validatedId}
  `;
}

// Reject (delete) a user
export async function deleteUser(userId: string): Promise<void> {
  const validatedId = validateUserId(userId);
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
    SELECT id, name, email, role, approved, created_at,
           phone, business_name, website_url, instagram_handle, gmb_url
    FROM "user"
    WHERE id = ${validatedId}
  `;
  return result[0] || null;
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
