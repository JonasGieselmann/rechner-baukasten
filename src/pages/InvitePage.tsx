import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';
import { Wordmark } from '../components/Wordmark';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    fetch(`/api/invites/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: { valid?: boolean; orgName?: string }) => {
        if (d?.valid) {
          setOrgName(d.orgName ?? '');
          setState('valid');
        } else {
          setState('invalid');
        }
      })
      .catch(() => setState('invalid'));
  }, [token]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center space-y-5"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <Wordmark size="md" />
        {state === 'loading' && (
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>Einladung wird geprüft…</p>
        )}
        {state === 'invalid' && (
          <>
            <h1 className="text-xl font-semibold">Einladung ungültig</h1>
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>
              Diese Einladung ist abgelaufen oder existiert nicht. Bitte fordern Sie einen neuen Link an.
            </p>
            <Link to="/login" className="text-sm underline" style={{ color: BRAND.colors.primary }}>Zum Login</Link>
          </>
        )}
        {state === 'valid' && (
          <>
            <h1 className="text-2xl font-semibold">Willkommen{orgName ? ` bei ${orgName}` : ''}</h1>
            <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
              Sie wurden eingeladen{orgName ? ` zu ${orgName}` : ''}. Erstellen Sie Ihr Konto, um Ihre
              Potenzialanalyse und Ihr Dashboard zu nutzen.
            </p>
            <Link
              to={`/register?invite=${encodeURIComponent(token ?? '')}`}
              className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            >
              Konto erstellen
            </Link>
            <p className="text-xs" style={{ color: BRAND.colors.muted }}>
              Schon registriert? <Link to="/login" className="underline" style={{ color: BRAND.colors.primary }}>Anmelden</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
