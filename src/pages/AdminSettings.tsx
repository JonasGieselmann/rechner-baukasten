import { useState, useEffect } from 'react';
import { AdminHeader } from '../components/AdminHeader';
import { BRAND } from '../../branding/tokens';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

interface SmtpForm {
  host: string;
  port: string;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
}

const EMPTY_FORM: SmtpForm = {
  host: '',
  port: '587',
  user: '',
  password: '',
  fromEmail: '',
  fromName: '',
  secure: false,
};

export function AdminSettings() {
  const [form, setForm] = useState<SmtpForm>(EMPTY_FORM);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/settings/smtp`, { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        host: string;
        port: number;
        user: string;
        fromEmail: string;
        fromName: string;
        secure: boolean;
        hasPassword: boolean;
      };
      setForm({
        host: data.host,
        port: String(data.port),
        user: data.user,
        password: '',
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        secure: data.secure,
      });
      setHasPassword(data.hasPassword);
    } finally {
      setLoading(false);
    }
  }

  function setField<K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveMsg(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, unknown> = {
        host: form.host,
        port: parseInt(form.port, 10),
        user: form.user,
        fromEmail: form.fromEmail,
        fromName: form.fromName,
        secure: form.secure,
      };
      if (form.password.length > 0) {
        body.password = form.password;
      }
      const res = await fetch(`${API_BASE}/api/admin/settings/smtp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveMsg({ ok: false, text: data.error ?? 'Fehler beim Speichern' });
      } else {
        setSaveMsg({ ok: true, text: 'Einstellungen gespeichert' });
        await fetchSettings();
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Netzwerkfehler' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings/smtp/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setTestMsg({ ok: false, text: data.error ?? 'Verbindungstest fehlgeschlagen' });
      } else {
        setTestMsg({ ok: true, text: data.message ?? 'Verbindung erfolgreich' });
      }
    } catch {
      setTestMsg({ ok: false, text: 'Netzwerkfehler' });
    } finally {
      setTesting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: BRAND.colors.background,
    border: `1px solid ${BRAND.colors.border}`,
    color: BRAND.colors.text,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    width: '100%',
    outline: 'none',
    fontSize: '0.875rem',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: BRAND.colors.muted,
    display: 'block',
    marginBottom: '0.375rem',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BRAND.colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: BRAND.colors.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background }}>
      <AdminHeader />

      <div
        className="border-b px-6 py-2 flex items-center gap-4"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <h1 className="text-base font-semibold" style={{ color: BRAND.colors.text }}>
          Einstellungen
        </h1>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: BRAND.colors.border }}>
            <h2 className="text-sm font-semibold" style={{ color: BRAND.colors.text }}>
              SMTP-Server
            </h2>
            <p className="text-xs mt-0.5" style={{ color: BRAND.colors.muted }}>
              Konfigurieren Sie den Mailserver, ueber den BeautyFlow E-Mails versendet.
            </p>
          </div>

          <form onSubmit={(e) => void handleSave(e)} className="px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Host</label>
                <input
                  type="text"
                  value={form.host}
                  onChange={(e) => setField('host', e.target.value)}
                  placeholder="smtp.example.com"
                  maxLength={255}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Port</label>
                <input
                  type="number"
                  value={form.port}
                  onChange={(e) => setField('port', e.target.value)}
                  min={1}
                  max={65535}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Benutzername</label>
              <input
                type="text"
                value={form.user}
                onChange={(e) => setField('user', e.target.value)}
                placeholder="mail@example.com"
                maxLength={255}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Passwort
                {hasPassword && form.password === '' && (
                  <span className="ml-2 font-normal" style={{ color: BRAND.colors.muted }}>
                    (gesetzt, leer lassen um beizubehalten)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                placeholder={hasPassword ? '**********' : 'Passwort eingeben'}
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Absender-E-Mail</label>
                <input
                  type="text"
                  value={form.fromEmail}
                  onChange={(e) => setField('fromEmail', e.target.value)}
                  placeholder="noreply@example.com"
                  maxLength={255}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Absender-Name</label>
                <input
                  type="text"
                  value={form.fromName}
                  onChange={(e) => setField('fromName', e.target.value)}
                  placeholder="BeautyFlow"
                  maxLength={255}
                  style={inputStyle}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: BRAND.colors.text }}>
              <input
                type="checkbox"
                checked={form.secure}
                onChange={(e) => setField('secure', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Verschluesselte Verbindung (TLS)</span>
            </label>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-full text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-80"
                style={{ backgroundColor: BRAND.colors.primary, color: '#fff' }}
              >
                {saving ? 'Wird gespeichert...' : 'Speichern'}
              </button>

              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testing}
                className="px-5 py-2 rounded-full text-sm font-medium border transition-opacity disabled:opacity-50 hover:opacity-80"
                style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text, backgroundColor: 'transparent' }}
              >
                {testing ? 'Wird getestet...' : 'Verbindung testen'}
              </button>
            </div>

            {saveMsg && (
              <p className="text-sm" style={{ color: saveMsg.ok ? '#15803d' : '#b91c1c' }}>
                {saveMsg.text}
              </p>
            )}

            {testMsg && (
              <p className="text-sm" style={{ color: testMsg.ok ? '#15803d' : '#b91c1c' }}>
                {testMsg.text}
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
