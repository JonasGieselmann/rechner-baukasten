import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { getRawClient } from './db.js';

const SECRET = process.env.BETTER_AUTH_SECRET;
if (!SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required');
}

// Derive a stable 32-byte key from the app secret. Salt is a fixed constant
// so the key is deterministic across restarts (same secret = same key).
const KEY = scryptSync(SECRET, 'kalku-app-settings-v1', 32);

const ALGO = 'aes-256-gcm';

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join(':');
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }
  const [ivB64, ciphertextB64, authTagB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  try {
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    throw new Error('Decryption failed: data may have been tampered with');
  }
}

// ============================================
// App Setting helpers
// ============================================

interface SettingRow {
  value: string | null;
  encrypted: boolean;
}

/** Read one setting by key, decrypting if marked encrypted. */
export async function getSetting(key: string): Promise<string | null> {
  const client = getRawClient();
  const rows = await client<SettingRow[]>`
    SELECT value, encrypted FROM app_setting WHERE key = ${key} LIMIT 1
  `;
  if (rows.length === 0 || rows[0].value == null) return null;
  const { value, encrypted } = rows[0];
  if (encrypted) return decryptSecret(value);
  return value;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Load all SMTP settings from app_setting.
 * Throws a descriptive error when required fields are missing.
 */
export async function loadSmtpConfig(): Promise<SmtpConfig> {
  const [host, portRaw, secureRaw, user, password, fromEmail, fromName] = await Promise.all([
    getSetting('smtp.host'),
    getSetting('smtp.port'),
    getSetting('smtp.secure'),
    getSetting('smtp.user'),
    getSetting('smtp.password'),
    getSetting('smtp.fromEmail'),
    getSetting('smtp.fromName'),
  ]);

  const missing: string[] = [];
  if (!host) missing.push('smtp.host');
  if (!portRaw) missing.push('smtp.port');
  if (!user) missing.push('smtp.user');
  if (!password) missing.push('smtp.password');
  if (!fromEmail) missing.push('smtp.fromEmail');

  if (missing.length > 0) {
    throw new Error(`SMTP-Konfiguration unvollstaendig. Fehlende Felder: ${missing.join(', ')}`);
  }

  return {
    host: host!,
    port: parseInt(portRaw!, 10) || 587,
    secure: secureRaw === 'true',
    user: user!,
    password: password!,
    fromEmail: fromEmail!,
    fromName: fromName ?? 'BeautyFlow',
  };
}
