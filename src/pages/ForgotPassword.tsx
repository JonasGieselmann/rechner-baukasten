import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';

const INPUT_CLS = 'w-full rounded-lg py-3 px-4 border outline-none transition-all focus:ring-2';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputStyle = { backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border, color: BRAND.colors.text };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show the same generic confirmation — no enumeration, no error leak.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium tracking-tight">Passwort vergessen</h1>
          <p className="text-sm opacity-70 mt-2">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
        </div>
        <div className="rounded-2xl p-8 border" style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm" style={{ color: BRAND.colors.text }}>
                Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum
                Zurücksetzen des Passworts gesendet. Bitte prüfen Sie Ihr Postfach.
              </p>
              <Link to="/login" className="inline-block text-sm font-medium hover:opacity-80" style={{ color: BRAND.colors.accent }}>
                Zurück zur Anmeldung
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 opacity-80">E-Mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT_CLS} style={inputStyle} placeholder="ihre@email.de" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                {loading ? 'Senden...' : 'Link anfordern'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm hover:opacity-80" style={{ color: BRAND.colors.accent }}>
                  Zurück zur Anmeldung
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
