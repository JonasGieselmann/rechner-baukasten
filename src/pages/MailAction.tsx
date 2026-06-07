import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';
import { Wordmark } from '../components/Wordmark';
import { Footer } from '../components/Footer';

type State = 'loading' | 'success' | 'error';

interface MailActionProps {
  endpoint: '/api/compliance/unsubscribe' | '/api/compliance/confirm';
  titleSuccess: string;
  titleError: string;
  bodySuccess: string;
  bodyError: string;
}

// Shared public page for email-link actions (Double-Opt-in confirmation and
// unsubscribe). Reads ?token= and calls the matching public endpoint once.
function MailAction({ endpoint, titleSuccess, titleError, bodySuccess, bodyError }: MailActionProps) {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const token = params.get('token') ?? '';
    if (!token) {
      setState('error');
      return;
    }
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => setState(data?.success ? 'success' : 'error'))
      .catch(() => setState('error'));
  }, [endpoint, params]);

  const title = state === 'success' ? titleSuccess : state === 'error' ? titleError : 'Einen Moment...';
  const body = state === 'success' ? bodySuccess : state === 'error' ? bodyError : 'Ihre Anfrage wird verarbeitet.';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <header className="flex items-center px-4 py-4 border-b" style={{ borderColor: BRAND.colors.border }}>
        <Link to="/" aria-label="Zur Startseite">
          <Wordmark size="md" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div
          className="max-w-md w-full rounded-2xl border p-8 text-center space-y-4"
          style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
        >
          <h1 className="text-2xl font-semibold" style={{ color: BRAND.colors.text }}>
            {title}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
            {body}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
          >
            Zur Startseite
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function Unsubscribe() {
  return (
    <MailAction
      endpoint="/api/compliance/unsubscribe"
      titleSuccess="Sie wurden abgemeldet"
      titleError="Abmeldung nicht möglich"
      bodySuccess="Sie erhalten ab sofort keine Marketing-E-Mails mehr von uns. Transaktionale Nachrichten zu Ihrem Konto können weiterhin zugestellt werden."
      bodyError="Der Abmeldelink ist ungültig oder abgelaufen. Bitte verwenden Sie den Link aus der aktuellsten E-Mail oder wenden Sie sich an kocak@aksme.de."
    />
  );
}

export function ConfirmEmail() {
  return (
    <MailAction
      endpoint="/api/compliance/confirm"
      titleSuccess="E-Mail-Adresse bestätigt"
      titleError="Bestätigung nicht möglich"
      bodySuccess="Vielen Dank. Ihre Einwilligung ist nun aktiv und Sie erhalten unsere E-Mails wie gewünscht."
      bodyError="Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordern Sie die Bestätigungsmail erneut an."
    />
  );
}
