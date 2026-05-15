import nodemailer from 'nodemailer';
import { loadSmtpConfig } from './secrets.js';

export interface SendLeadReportArgs {
  to: string;
  leadName: string;
  funnelName: string;
  pdf: Buffer;
}

function buildHtmlBody(name: string): string {
  const greeting = name.trim() ? name.trim() : 'Interessentin';
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Ihre BeautyFlow Potenzialanalyse</title></head>
<body style="font-family:Arial,sans-serif;color:#0F2F5B;background:#F7FAFF;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0F2F5B;margin-top:0;">Ihre BeautyFlow Potenzialanalyse</h2>
    <p>Hallo ${greeting},</p>
    <p>vielen Dank fuer Ihre Analyse. Im Anhang finden Sie Ihre vollstaendige Auswertung als PDF.</p>
    <p>Wenn Sie Ihre Ergebnisse besprechen moechten, vereinbaren Sie ein kostenloses Strategiegespraech.</p>
    <p style="margin-top:32px;">Beste Gruesse,<br>das BeautyFlow Team</p>
  </div>
</body>
</html>`;
}

/**
 * Send a PDF report to the lead via the configured SMTP server.
 * Throws if SMTP settings are missing or the send fails.
 */
export async function sendLeadReportEmail(args: SendLeadReportArgs): Promise<void> {
  const { to, leadName, funnelName: _funnelName, pdf } = args;

  const cfg = await loadSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
  });

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
 * Send a short test email to the given address to verify end-to-end delivery.
 */
export async function sendTestEmail(to: string): Promise<void> {
  const cfg = await loadSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
  });

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to,
    subject: 'Testmail von BeautyFlow',
    html: '<p>Die SMTP-Konfiguration funktioniert korrekt. Diese Nachricht bestaetigt die erfolgreiche Zustellung.</p>',
  });
}
