import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { BRAND } from '../../../branding/tokens';
import { renderTitleWithItalics } from '../../lib/textFormat';
import type { Lead } from '../../types';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div
      className="rounded-2xl border p-6 space-y-4 flex flex-col"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function PillCTA({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 self-start"
      style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
    >
      {label}
      <span aria-hidden="true">&#x21AA;</span>
    </Link>
  );
}

function ArrowLink({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
      style={{ color: BRAND.colors.primary }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
        style={{ backgroundColor: BRAND.colors.accent }}
        aria-hidden="true"
      >
        &#x2192;
      </span>
      {label}
    </Link>
  );
}

function PotenzialCard({ lead, loading, empty }: { lead: Lead | null; loading: boolean; empty: boolean }) {
  return (
    <Card title="Ihre Potenzialanalyse">
      {loading && (
        <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>
      )}
      {!loading && empty && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
            Noch keine Analyse vorhanden. Starten Sie jetzt und entdecken Sie das
            verborgene Potenzial Ihrer Praxis.
          </p>
          <PillCTA label="Analyse starten" to="/dashboard/potenzialanalyse" />
        </div>
      )}
      {!loading && lead && (
        <div className="space-y-3 flex-1">
          {lead.recommendation && (
            <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.text }}>
              {lead.recommendation}
            </p>
          )}
          {lead.scores && Object.keys(lead.scores).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: BRAND.colors.muted }}>
                Gesamtscore:
              </span>
              <span className="text-sm font-semibold" style={{ color: BRAND.colors.primary }}>
                {Math.round(
                  Object.values(lead.scores).reduce((a, b) => a + b, 0) /
                    Object.keys(lead.scores).length,
                )}
                /100
              </span>
            </div>
          )}
          {lead.kalkuPotential?.delta !== undefined && lead.kalkuPotential.delta > 0 && (
            <div
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: BRAND.colors.accent + '33', color: BRAND.colors.primary }}
            >
              Mehrumsatz: +{lead.kalkuPotential.delta.toLocaleString('de-DE')} € / Monat
            </div>
          )}
          <Link
            to="/dashboard/potenzialanalyse"
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: BRAND.colors.muted }}
          >
            Vollständige Auswertung ansehen &#x2192;
          </Link>
        </div>
      )}
    </Card>
  );
}

const NEXT_STEPS = [
  { label: 'Vollständige Auswertung als PDF herunterladen', to: '/dashboard/potenzialanalyse' },
  { label: 'Leitfaden durcharbeiten', to: '/dashboard/leitfaden' },
  { label: 'Strategiegespräch buchen', to: '#termin' },
];

function NaechsteSchritteCard() {
  return (
    <Card title="Nächste Schritte">
      <ul className="space-y-3 flex-1">
        {NEXT_STEPS.map((step) => (
          <li key={step.label}>
            <ArrowLink label={step.label} to={step.to} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LeitfadenCard() {
  const sections = 4;
  const done = 0;
  const pct = Math.round((done / sections) * 100);

  return (
    <Card title="BeautyFlow Leitfaden">
      <div className="flex-1 space-y-3">
        <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
          Schritt für Schritt zu mehr Patienten, strukturiert und mit System.
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: BRAND.colors.muted }}>
            <span>{done}/{sections} Kapitel</span>
            <span>{pct}%</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: BRAND.colors.border }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: BRAND.colors.accent }}
            />
          </div>
        </div>
      </div>
      <PillCTA label="Leitfaden öffnen" to="/dashboard/leitfaden" />
    </Card>
  );
}

function StrategiegespraechCard() {
  return (
    <Card title="Strategiegespräch">
      <div className="flex-1 space-y-2">
        <p className="text-xl font-semibold" style={{ color: BRAND.colors.text }}>
          Kostenloses Erstgespräch
        </p>
        <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
          30 Minuten, strukturiert, kein Druck.
        </p>
        <p className="text-xs" style={{ color: BRAND.colors.muted }}>
          noch nicht freigeschaltet
        </p>
      </div>
      <a
        href="#termin"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 self-start opacity-40 cursor-not-allowed"
        style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
        aria-disabled="true"
        onClick={(e) => e.preventDefault()}
      >
        Termin buchen
        <span aria-hidden="true">&#x21AA;</span>
      </a>
    </Card>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me/leads', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: Lead[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setLead(sorted[0]);
        } else {
          setEmpty(true);
        }
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false));
  }, []);

  const displayName = user?.name?.trim() || user?.email || '';

  const greeting = displayName
    ? `Willkommen *zurück*, ${displayName}`
    : 'Schön, dass Sie da sind.';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-4xl font-medium" style={{ color: BRAND.colors.text }}>
          {renderTitleWithItalics(greeting)}
        </h1>
        <p className="text-base" style={{ color: BRAND.colors.muted }}>
          Mehr Patienten durch smarte Systeme.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PotenzialCard lead={lead} loading={loading} empty={empty} />
        <NaechsteSchritteCard />
        <LeitfadenCard />
        <StrategiegespraechCard />
      </div>

      <p className="text-xs text-center pt-2" style={{ color: BRAND.colors.muted }}>
        BeautyFlow &bull; strukturiert, mit System, transparent
      </p>
    </div>
  );
}
