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

  console.log('Auth schema initialized (PostgreSQL)');
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
    SELECT id, name, email, role, approved, created_at
    FROM "user"
    WHERE id = ${validatedId}
  `;
  return result[0] || null;
}
