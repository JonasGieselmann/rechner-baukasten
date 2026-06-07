import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../../branding/tokens';
import { formatDate } from '../../lib/dateFormat';

interface ConsentRow {
  id: string;
  type: string;
  text_version: string;
  granted_at: string;
  withdrawn_at: string | null;
}

interface Subscription {
  email: string;
  status: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}

const CONSENT_LABEL: Record<string, string> = {
  privacy: 'Datenschutzerklärung',
  terms: 'AGB',
  marketing: 'Marketing-E-Mails',
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function ExportCard() {
  return (
    <Card title="Datenexport (Art. 20 DSGVO)">
      <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
        Laden Sie alle zu Ihrem Konto gespeicherten Daten als maschinenlesbare JSON-Datei herunter.
      </p>
      <a
        href="/api/compliance/export"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 self-start"
        style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
      >
        Meine Daten herunterladen
      </a>
    </Card>
  );
}

function ConsentsCard({
  consents,
  loading,
  onWithdraw,
}: {
  consents: ConsentRow[];
  loading: boolean;
  onWithdraw: (id: string) => void;
}) {
  return (
    <Card title="Erteilte Einwilligungen">
      {loading && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>}
      {!loading && consents.length === 0 && (
        <p className="text-sm" style={{ color: BRAND.colors.muted }}>
          Es liegen keine protokollierten Einwilligungen vor.
        </p>
      )}
      {!loading && consents.length > 0 && (
        <ul className="space-y-3">
          {consents.map((c) => {
            const active = !c.withdrawn_at;
            return (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: BRAND.colors.text }}>
                    {CONSENT_LABEL[c.type] ?? c.type}
                  </p>
                  <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                    Erteilt am {formatDate(c.granted_at)} (Fassung {c.text_version})
                    {!active && c.withdrawn_at && ` · widerrufen am ${formatDate(c.withdrawn_at)}`}
                  </p>
                </div>
                {active && c.type === 'marketing' && (
                  <button
                    onClick={() => onWithdraw(c.id)}
                    className="shrink-0 text-sm px-4 py-2 rounded-full border transition-colors hover:opacity-70"
                    style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
                  >
                    Widerrufen
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function SubscriptionCard({
  subscription,
  loading,
  onUnsubscribe,
}: {
  subscription: Subscription | null;
  loading: boolean;
  onUnsubscribe: () => void;
}) {
  const statusLabel =
    subscription?.status === 'confirmed'
      ? 'angemeldet'
      : subscription?.status === 'unsubscribed'
        ? 'abgemeldet'
        : subscription?.status === 'pending'
          ? 'Bestätigung ausstehend'
          : 'nicht angemeldet';
  const canUnsubscribe = subscription && subscription.status !== 'unsubscribed';
  return (
    <Card title="E-Mail-Einstellungen">
      {loading ? (
        <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>
            Status Ihrer Marketing-E-Mails: <span style={{ color: BRAND.colors.text }}>{statusLabel}</span>.
            Transaktionale Nachrichten zu Ihrem Konto sind davon nicht betroffen.
          </p>
          {canUnsubscribe && (
            <button
              onClick={onUnsubscribe}
              className="text-sm px-4 py-2 rounded-full border transition-colors hover:opacity-70 self-start"
              style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
            >
              Von Marketing-E-Mails abmelden
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function LinksCard() {
  return (
    <Card title="Rechtliche Dokumente">
      <div className="flex flex-col gap-2 text-sm">
        <Link to="/impressum" className="transition-opacity hover:opacity-70" style={{ color: BRAND.colors.primary }}>
          Impressum
        </Link>
        <Link to="/datenschutz" className="transition-opacity hover:opacity-70" style={{ color: BRAND.colors.primary }}>
          Datenschutzerklärung
        </Link>
        <Link to="/agb" className="transition-opacity hover:opacity-70" style={{ color: BRAND.colors.primary }}>
          AGB
        </Link>
      </div>
      <p className="text-sm pt-2" style={{ color: BRAND.colors.muted }}>
        Ihr Konto können Sie jederzeit unter{' '}
        <Link to="/dashboard/account" className="underline" style={{ color: BRAND.colors.primary }}>
          Account
        </Link>{' '}
        löschen (Recht auf Löschung, Art. 17 DSGVO).
      </p>
    </Card>
  );
}

export default function Rechtliches() {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/compliance/consents', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/compliance/subscription', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([c, s]) => {
        if (Array.isArray(c)) setConsents(c);
        setSubscription(s);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = useCallback(
    (id: string) => {
      fetch(`/api/compliance/consents/${id}/withdraw`, { method: 'POST', credentials: 'include' })
        .then(() => load())
        .catch(() => undefined);
    },
    [load],
  );

  const unsubscribe = useCallback(() => {
    fetch('/api/compliance/subscription/unsubscribe', { method: 'POST', credentials: 'include' })
      .then(() => load())
      .catch(() => undefined);
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold" style={{ color: BRAND.colors.text }}>
          Rechtliches & Datenschutz
        </h1>
        <p className="text-base" style={{ color: BRAND.colors.muted }}>
          Ihre Daten, Einwilligungen und rechtlichen Dokumente an einem Ort.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ExportCard />
        <ConsentsCard consents={consents} loading={loading} onWithdraw={withdraw} />
        <SubscriptionCard subscription={subscription} loading={loading} onUnsubscribe={unsubscribe} />
        <LinksCard />
      </div>
    </div>
  );
}
