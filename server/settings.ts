import express from 'express';
import nodemailer from 'nodemailer';
import { getRawClient } from './db.js';
import { requireRole, type AuthenticatedRequest } from './middleware.js';
import { encryptSecret, decryptSecret } from './secrets.js';
import { sanitizeString } from './utils.js';
import { sendTestEmail } from './mailer.js';

// ============================================
// Types
// ============================================

interface SmtpRow {
  key: string;
  value: string | null;
  encrypted: boolean;
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  hasPassword: boolean;
}

// ============================================
// Helpers
// ============================================

const SMTP_KEYS = ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'smtp.fromEmail', 'smtp.fromName', 'smtp.secure'] as const;

async function getSmtpRows(): Promise<SmtpRow[]> {
  const client = getRawClient();
  const rows = await client<SmtpRow[]>`
    SELECT key, value, encrypted FROM app_setting
    WHERE key = ANY(${client.array(SMTP_KEYS as unknown as string[])})
  `;
  return rows;
}

function rowsToMap(rows: SmtpRow[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const row of rows) {
    if (row.encrypted && row.value) {
      try {
        map.set(row.key, decryptSecret(row.value));
      } catch {
        map.set(row.key, null);
      }
    } else {
      map.set(row.key, row.value);
    }
  }
  return map;
}

function validatePort(port: unknown): number {
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error('Port muss zwischen 1 und 65535 liegen');
  }
  return n;
}

function validateEmail(email: string): void {
  if (!email.includes('@')) {
    throw new Error('Ungueltige E-Mail-Adresse');
  }
}

function validateMaxLen(value: string, field: string, max = 255): void {
  if (value.length > max) {
    throw new Error(`${field} darf maximal ${max} Zeichen lang sein`);
  }
}

async function upsertSetting(key: string, value: string, encrypted: boolean): Promise<void> {
  const client = getRawClient();
  await client`
    INSERT INTO app_setting (key, value, encrypted, updated_at)
    VALUES (${key}, ${value}, ${encrypted}, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          encrypted = EXCLUDED.encrypted,
          updated_at = NOW()
  `;
}

// ============================================
// Router
// ============================================

const router = express.Router();

// GET /api/admin/settings/smtp
router.get('/smtp', requireRole('super_admin'), async (_req: AuthenticatedRequest, res) => {
  try {
    const rows = await getSmtpRows();
    const map = rowsToMap(rows);
    const passwordRow = rows.find((r) => r.key === 'smtp.password');

    const result: SmtpSettings = {
      host: map.get('smtp.host') ?? '',
      port: parseInt(map.get('smtp.port') ?? '587', 10) || 587,
      user: map.get('smtp.user') ?? '',
      fromEmail: map.get('smtp.fromEmail') ?? '',
      fromName: map.get('smtp.fromName') ?? '',
      secure: map.get('smtp.secure') === 'true',
      hasPassword: passwordRow != null && passwordRow.value != null && passwordRow.value !== '',
    };

    res.json(result);
  } catch (error) {
    console.error('Get SMTP settings error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// POST /api/admin/settings/smtp
router.post('/smtp', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;

    const host = sanitizeString(body.host, 255);
    const user = sanitizeString(body.user, 255);
    const fromEmail = sanitizeString(body.fromEmail, 255);
    const fromName = sanitizeString(body.fromName, 255);
    const password = typeof body.password === 'string' ? body.password : undefined;
    const secure = body.secure === true || body.secure === 'true';

    let port: number;
    try {
      port = validatePort(body.port);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Ungueltige Port-Angabe' });
    }

    try {
      validateEmail(fromEmail);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Ungueltige E-Mail' });
    }

    try {
      validateMaxLen(host, 'Host');
      validateMaxLen(user, 'Benutzername');
      validateMaxLen(fromName, 'Absender-Name');
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Eingabe zu lang' });
    }

    await upsertSetting('smtp.host', host, false);
    await upsertSetting('smtp.port', String(port), false);
    await upsertSetting('smtp.user', user, false);
    await upsertSetting('smtp.fromEmail', fromEmail, false);
    await upsertSetting('smtp.fromName', fromName, false);
    await upsertSetting('smtp.secure', String(secure), false);

    if (password !== undefined) {
      const encrypted = encryptSecret(password);
      await upsertSetting('smtp.password', encrypted, true);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Save SMTP settings error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// POST /api/admin/settings/smtp/test
router.post('/smtp/test', requireRole('super_admin'), async (_req: AuthenticatedRequest, res) => {
  try {
    const rows = await getSmtpRows();
    const map = rowsToMap(rows);

    const host = map.get('smtp.host');
    const portStr = map.get('smtp.port');
    const user = map.get('smtp.user');
    const password = map.get('smtp.password');
    const secure = map.get('smtp.secure') === 'true';

    if (!host || !portStr) {
      return res.status(400).json({ error: 'SMTP-Server ist noch nicht konfiguriert' });
    }

    const port = parseInt(portStr, 10);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password ?? '' } : undefined,
    });

    try {
      await transporter.verify();
      res.json({ success: true, message: 'SMTP-Verbindung erfolgreich' });
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : 'Verbindungsfehler';
      res.status(400).json({ error: `SMTP-Verbindung fehlgeschlagen: ${message}` });
    }
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// POST /api/admin/settings/smtp/send-test
// Sends an actual test email to the super_admin's own address to verify end-to-end delivery.
router.post('/smtp/send-test', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const adminEmail = sanitizeString((req.body as Record<string, unknown>).email, 255);
    if (!adminEmail || !adminEmail.includes('@')) {
      return res.status(400).json({ error: 'Bitte eine gueltige E-Mail-Adresse angeben' });
    }

    try {
      await sendTestEmail(adminEmail);
      res.json({ success: true, message: `Testmail an ${adminEmail} gesendet` });
    } catch (sendErr) {
      const message = sendErr instanceof Error ? sendErr.message : 'Sendefehler';
      res.status(400).json({ error: `E-Mail-Versand fehlgeschlagen: ${message}` });
    }
  } catch (error) {
    console.error('SMTP send-test error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

export default router;
