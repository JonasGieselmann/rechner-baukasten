import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

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
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
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
