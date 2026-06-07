import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '../lib/auth-client';
import { BRAND } from '../../branding/tokens';

const INPUT_CLS =
  'w-full rounded-lg py-3 px-4 border outline-none transition-all focus:ring-2';

export function Register() {
  const [searchParams] = useSearchParams();
  // Only honor an invite token explicitly present in the URL — never a stale
  // localStorage value (which would silently contaminate an unrelated signup).
  const inviteToken = searchParams.get('invite');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [gmbUrl, setGmbUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const inputStyle = {
    backgroundColor: BRAND.colors.card,
    borderColor: BRAND.colors.border,
    color: BRAND.colors.text,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    if (!acceptedTerms) {
      setError('Bitte stimmen Sie der Datenschutzerklärung und den AGB zu.');
      return;
    }

    setLoading(true);

    const practiceFields: Record<string, string> = {};
    if (phone.trim()) practiceFields.phone = phone.trim();
    if (businessName.trim()) practiceFields.businessName = businessName.trim();
    if (websiteUrl.trim()) practiceFields.websiteUrl = websiteUrl.trim();
    if (instagramHandle.trim()) practiceFields.instagramHandle = instagramHandle.trim();
    if (gmbUrl.trim()) practiceFields.gmbUrl = gmbUrl.trim();

    try {
      const result = await signUp.email({ email, password, name, ...practiceFields });

      if (result.error) {
        setError(result.error.message || 'Registrierung fehlgeschlagen.');
      } else {
        // If the user came via an org invite link, join that org now (the
        // signup created a session, so the authed claim succeeds).
        if (inviteToken) {
          try {
            await fetch(`/api/invites/${encodeURIComponent(inviteToken)}/claim`, { method: 'POST', credentials: 'include' });
          } catch {
            /* non-fatal: fall through to the default org */
          }
        }
        window.location.href = '/';
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium tracking-tight">Ihr BeautyFlow Konto</h1>
          <p className="text-sm opacity-70 mt-2">Kostenlos registrieren und Potenzialanalyse starten</p>
        </div>

        <div
          className="rounded-2xl p-8 border"
          style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={INPUT_CLS}
                style={inputStyle}
                placeholder="Ihr Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={INPUT_CLS}
                style={inputStyle}
                placeholder="ihre@email.de"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={INPUT_CLS}
                style={inputStyle}
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={INPUT_CLS}
                style={inputStyle}
                placeholder="Passwort wiederholen"
              />
            </div>

            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: BRAND.colors.border }}
            >
              <button
                type="button"
                onClick={() => setPracticeOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors hover:opacity-80"
                style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.muted }}
              >
                <span>Praxis-Angaben (optional)</span>
                <span aria-hidden="true" className="text-xs">{practiceOpen ? '▲' : '▼'}</span>
              </button>
              {practiceOpen && (
                <div
                  className="px-4 pb-4 pt-2 space-y-3"
                  style={{ backgroundColor: BRAND.colors.card }}
                >
                  <div>
                    <label className="block text-sm font-medium mb-2 opacity-80">Telefon</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={INPUT_CLS}
                      style={inputStyle}
                      placeholder="+49 123 456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 opacity-80">Praxisname</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className={INPUT_CLS}
                      style={inputStyle}
                      placeholder="Ihr Praxisname"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 opacity-80">Website-URL</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className={INPUT_CLS}
                      style={inputStyle}
                      placeholder="https://ihre-praxis.de"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 opacity-80">Instagram-Handle</label>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      className={INPUT_CLS}
                      style={inputStyle}
                      placeholder="@ihre_praxis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 opacity-80">Google My Business oder Praxis + Stadt</label>
                    <input
                      type="text"
                      value={gmbUrl}
                      onChange={(e) => setGmbUrl(e.target.value)}
                      className={INPUT_CLS}
                      style={inputStyle}
                      placeholder="z.B. Ihre Praxis Berlin Mitte"
                    />
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 text-sm cursor-pointer" style={{ color: BRAND.colors.muted }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                data-testid="accept-terms"
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: BRAND.colors.primary }}
              />
              <span className="leading-relaxed">
                Ich habe die{' '}
                <Link to="/datenschutz" target="_blank" className="underline" style={{ color: BRAND.colors.primary }}>
                  Datenschutzerklärung
                </Link>{' '}
                gelesen und stimme den{' '}
                <Link to="/agb" target="_blank" className="underline" style={{ color: BRAND.colors.primary }}>
                  AGB
                </Link>{' '}
                zu.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full py-3 px-4 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            >
              {loading ? 'Wird erstellt...' : 'Konto erstellen'}
            </button>
          </form>

          <div
            className="mt-6 pt-6 border-t text-center text-sm opacity-70"
            style={{ borderColor: BRAND.colors.border }}
          >
            Bereits ein Konto?{' '}
            <Link to="/login" className="font-medium hover:opacity-80" style={{ color: BRAND.colors.accent }}>
              Anmelden
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
