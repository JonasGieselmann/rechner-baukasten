import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';

const INPUT_CLS = 'w-full rounded-lg py-3 px-4 border outline-none transition-all focus:ring-2';

export default function ResetPassword() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const inputStyle = { backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border, color: BRAND.colors.text };

  useEffect(() => {
    fetch(`/api/password-reset/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setStatus(d?.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben.'); return; }
    if (pw !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/password-reset/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? 'Zurücksetzen fehlgeschlagen.');
      }
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium tracking-tight">Neues Passwort</h1>
        </div>
        <div className="rounded-2xl p-8 border" style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          {status === 'checking' && <p className="text-sm text-center opacity-70">Link wird geprüft...</p>}

          {status === 'invalid' && (
            <div className="space-y-4 text-center">
              <p className="text-sm" style={{ color: BRAND.colors.text }}>
                Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.
              </p>
              <Link to="/passwort-vergessen" className="inline-block text-sm font-medium hover:opacity-80" style={{ color: BRAND.colors.accent }}>
                Neuen Link anfordern
              </Link>
            </div>
          )}

          {status === 'valid' && done && (
            <div className="space-y-4 text-center">
              <p className="text-sm" style={{ color: BRAND.colors.accent }}>
                Passwort erfolgreich gesetzt. Sie werden zur Anmeldung weitergeleitet...
              </p>
              <Link to="/login" className="inline-block text-sm font-medium hover:opacity-80" style={{ color: BRAND.colors.accent }}>
                Jetzt anmelden
              </Link>
            </div>
          )}

          {status === 'valid' && !done && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium mb-2 opacity-80">Neues Passwort</label>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required className={INPUT_CLS} style={inputStyle} placeholder="Mindestens 8 Zeichen" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 opacity-80">Passwort bestätigen</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={INPUT_CLS} style={inputStyle} placeholder="Passwort wiederholen" autoComplete="new-password" />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                {saving ? 'Speichern...' : 'Passwort setzen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
