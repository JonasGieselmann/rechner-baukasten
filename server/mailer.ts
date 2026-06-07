import nodemailer from 'nodemailer';
import { loadSmtpConfig } from './secrets.js';

export interface SendLeadReportArgs {
  to: string;
  leadName: string;
  funnelName: string;
  pdf: Buffer;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appBaseUrl(): string {
  return (process.env.APP_URL || process.env.BETTER_AUTH_URL || 'https://kalku.layer-one.io').replace(/\/$/, '');
}

async function createTransporter() {
  const cfg = await loadSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
  });
  return { cfg, transporter };
}

function buildHtmlBody(name: string): string {
  const greeting = escapeHtml(name.trim() ? name.trim() : 'Interessentin');
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Ihre BeautyFlow Potenzialanalyse</title></head>
<body style="font-family:Arial,sans-serif;color:#0F2F5B;background:#F7FAFF;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0F2F5B;margin-top:0;">Ihre BeautyFlow Potenzialanalyse</h2>
    <p>Hallo ${greeting},</p>
    <p>vielen Dank für Ihre Analyse. Im Anhang finden Sie Ihre vollständige Auswertung als PDF.</p>
    <p>Wenn Sie Ihre Ergebnisse besprechen möchten, vereinbaren Sie ein kostenloses Strategiegespräch.</p>
    <p style="margin-top:32px;">Beste Grüße,<br>das BeautyFlow Team</p>
  </div>
</body>
</html>`;
}

/**
 * Send a PDF report to the lead via the configured SMTP server.
 * Throws if SMTP settings are missing or the send fails.
 */
export async function sendLeadReportEmail(args: SendLeadReportArgs): Promise<void> {
  const { to, leadName, pdf } = args;
  const { cfg, transporter } = await createTransporter();

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to,
    subject: 'Ihre BeautyFlow Potenzialanalyse',
    html: buildHtmlBody(leadName),
    attachments: [
      {
        filename: 'BeautyFlow-Potenzialanalyse.pdf',
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
}

/**
 * Double-opt-in confirmation email. Sent when a lead opts into marketing mails;
 * the recipient must click the link before the subscription becomes 'confirmed'.
 */
export async function sendDoiConfirmationEmail(args: { to: string; doiToken: string }): Promise<void> {
  const { cfg, transporter } = await createTransporter();
  const link = `${appBaseUrl()}/mail-bestaetigen?token=${encodeURIComponent(args.doiToken)}`;
  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: args.to,
    subject: 'Bitte bestätigen Sie Ihre E-Mail-Adresse',
    html: `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#0F2F5B;background:#F7FAFF;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0F2F5B;margin-top:0;">Nur noch ein Schritt</h2>
    <p>Bitte bestätigen Sie, dass Sie E-Mails von BeautyFlow erhalten möchten.</p>
    <p style="margin:28px 0;"><a href="${link}" style="background:#0F2F5B;color:#F7FAFF;padding:12px 24px;border-radius:9999px;text-decoration:none;">E-Mail bestätigen</a></p>
    <p style="font-size:12px;color:#5A7090;">Wenn Sie das nicht angefordert haben, ignorieren Sie diese Nachricht einfach.</p>
  </div>
</body></html>`,
  });
}

/**
 * Send a short test email to the given address to verify end-to-end delivery.
 */
export async function sendTestEmail(to: string): Promise<void> {
  const { cfg, transporter } = await createTransporter();

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to,
    subject: 'Testmail von BeautyFlow',
    html: '<p>Die SMTP-Konfiguration funktioniert korrekt. Diese Nachricht bestätigt die erfolgreiche Zustellung.</p>',
  });
}
