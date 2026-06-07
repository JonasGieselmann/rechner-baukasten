import { Router } from 'express';
import { nanoid } from 'nanoid';
import { auth } from './auth.js';
import {
  getUserByEmailForReset,
  createPasswordReset,
  getValidPasswordReset,
  consumePasswordReset,
  setCredentialPassword,
} from './db.js';
import { sendPasswordResetEmail, appBaseUrl } from './mailer.js';

const router = Router();

// Public "forgot password" links are short-lived (more sensitive than an
// admin-handed link, which lives longer — see admin/agency reset-link routes).
const PUBLIC_TTL_MINUTES = 60;

// POST /api/password-reset/request { email }
// Always responds generically — never reveals whether the email exists (no user
// enumeration). If the user exists, mint a token and (best-effort) email the
// link when SMTP is configured.
router.post('/request', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  // Respond immediately and IDENTICALLY whether or not the account exists — the
  // DB write + SMTP round-trip happen off the response path so response latency
  // cannot be used to enumerate accounts.
  res.json({ ok: true });
  void (async () => {
    try {
      const user = await getUserByEmailForReset(email);
      if (!user) return;
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + PUBLIC_TTL_MINUTES * 60 * 1000).toISOString();
      await createPasswordReset({ id: nanoid(), token, userId: user.id as string, createdBy: null, expiresAt });
      const link = `${appBaseUrl()}/passwort-zuruecksetzen/${token}`;
      await sendPasswordResetEmail({ to: user.email as string, name: user.name as string, link });
    } catch (e) {
      // SMTP not configured / send failed: the admin-handed-link path still works.
      console.error('Password reset request (background) failed:', e instanceof Error ? e.message : e);
    }
  })();
});

// GET /api/password-reset/:token -> { valid, name? }
router.get('/:token', async (req, res) => {
  try {
    const row = await getValidPasswordReset(req.params.token);
    if (!row) return res.json({ valid: false });
    res.json({ valid: true, name: (row.name as string) ?? null });
  } catch (err) {
    console.error('Password reset validate error:', err);
    res.json({ valid: false });
  }
});

// POST /api/password-reset/:token { newPassword } -> consume the token.
router.post('/:token', async (req, res) => {
  try {
    // Validate the new password BEFORE consuming, so a too-short submission does
    // not burn the user's one valid token.
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 8) return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' });
    // Atomically claim the token (single-use, race-safe). Bound to one user_id.
    const claimed = await consumePasswordReset(req.params.token);
    if (!claimed) return res.status(400).json({ error: 'Der Link ist ungültig oder abgelaufen.' });
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(newPassword);
    await setCredentialPassword(claimed.user_id as string, hash); // also revokes existing sessions
    res.json({ ok: true });
  } catch (err) {
    console.error('Password reset consume error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
