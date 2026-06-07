import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { BRAND } from '../../../branding/tokens';
import { renderTitleWithItalics } from '../../lib/textFormat';
import { computeProgress, overallScore, formatAnalysisDate, type AnalysisProgress } from '../../lib/analysis';
import { recommendationLabel } from '../../engine/score';
import type { Lead } from '../../types';

const POSITIVE = '#1FA971'; // green for improvement vs last month

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

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta > 0;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: positive ? `${POSITIVE}22` : BRAND.colors.border,
        color: positive ? POSITIVE : BRAND.colors.muted,
      }}
    >
      {positive ? '+' : ''}
      {delta} Punkte ggü. letzter Analyse
    </span>
  );
}

function PotenzialCard({ progress, loading }: { progress: AnalysisProgress; loading: boolean }) {
  const { latest, latestScore, scoreDelta, revenueDelta, dueForUpdate } = progress;
  return (
    <Card title="Ihre Potenzialanalyse">
      {loading && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>}

      {!loading && !latest && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
            Noch keine Analyse vorhanden. Starten Sie jetzt und entdecken Sie das verborgene
            Potenzial Ihrer Praxis.
          </p>
          <PillCTA label="Analyse starten" to="/dashboard/potenzialanalyse" />
        </div>
      )}

      {!loading && latest && (
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex items-end gap-3">
            <span className="text-4xl font-semibold" style={{ color: BRAND.colors.text }}>
              {latestScore}
              <span className="text-lg" style={{ color: BRAND.colors.muted }}>/100</span>
            </span>
            {scoreDelta !== null && <DeltaBadge delta={scoreDelta} />}
          </div>

          {revenueDelta !== null && revenueDelta > 0 && (
            <div
              className="rounded-xl px-4 py-2 text-sm font-semibold self-start"
              style={{ backgroundColor: BRAND.colors.accent + '33', color: BRAND.colors.primary }}
            >
              Mehrumsatz-Potenzial: +{revenueDelta.toLocaleString('de-DE')} € / Monat
            </div>
          )}

          {latest.recommendation && (
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: BRAND.colors.muted }}>
                Ihre Empfehlung
              </span>
              <p className="text-sm font-medium leading-relaxed" style={{ color: BRAND.colors.text }}>
                {recommendationLabel(latest.recommendation)}
              </p>
            </div>
          )}

          {dueForUpdate && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.muted }}
            >
              Ihre letzte Analyse ist über einen Monat alt. Wiederholen Sie sie monatlich, um
              Ihren Fortschritt zu verfolgen.
            </div>
          )}

          <div className="mt-auto pt-1">
            {dueForUpdate ? (
              <PillCTA label="Analyse aktualisieren" to="/dashboard/potenzialanalyse" />
            ) : (
              <Link
                to="/dashboard/potenzialanalyse"
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Vollständige Auswertung ansehen &#x2192;
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function FortschrittCard({ progress, loading }: { progress: AnalysisProgress; loading: boolean }) {
  const { history, count } = progress;
  return (
    <Card title="Ihr Fortschritt">
      {loading && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>}

      {!loading && count <= 1 && (
        <p className="text-sm leading-relaxed flex-1" style={{ color: BRAND.colors.muted }}>
          Wiederholen Sie die Potenzialanalyse einmal im Monat. Ab der zweiten Analyse sehen Sie hier
          Ihre Verbesserung in Grün.
        </p>
      )}

      {!loading && count > 1 && (
        <ul className="space-y-2 flex-1">
          {history.slice(0, 5).map((entry: Lead, idx: number) => {
            const score = overallScore(entry);
            const older = history[idx + 1];
            const delta = older ? score - overallScore(older) : null;
            return (
              <li key={entry.id} className="flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: BRAND.colors.muted }}>
                  {formatAnalysisDate(entry.createdAt)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: BRAND.colors.text }}>
                    {score}/100
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: delta > 0 ? POSITIVE : BRAND.colors.muted }}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function LeitfadenCard() {
  return (
    <Card title="BeautyFlow Leitfaden">
      <p className="text-sm leading-relaxed flex-1" style={{ color: BRAND.colors.muted }}>
        Schritt für Schritt zu mehr Patienten, strukturiert und mit System.
      </p>
      <PillCTA label="Leitfaden öffnen" to="/dashboard/leitfaden" />
    </Card>
  );
}

function StrategiegespraechCard() {
  return (
    <Card title="Nächster Schritt">
      <div className="flex-1 space-y-2">
        <p className="text-xl font-semibold" style={{ color: BRAND.colors.text }}>
          Kostenloses Strategiegespräch
        </p>
        <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
          30 Minuten, strukturiert, kein Druck. Wir zeigen Ihnen, wie Sie Ihr Potenzial heben.
        </p>
      </div>
      <a
        href="https://calendly.com/beauty-flow/30min"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 self-start"
        style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
      >
        Termin buchen
        <span aria-hidden="true">&#x21AA;</span>
      </a>
    </Card>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<AnalysisProgress>(computeProgress([]));
  const [loading, setLoading] = useState(true);
  const [funnels, setFunnels] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/me/leads', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: Lead[]) => {
        if (Array.isArray(data)) setProgress(computeProgress(data));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/dashboards/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { funnels?: { slug: string; name: string }[] } | null) => {
        if (d?.funnels) setFunnels(d.funnels);
      })
      .catch(() => undefined);
  }, []);

  const displayName = user?.name?.trim() || user?.email || '';
  const greeting = displayName ? `Willkommen *zurück*, ${displayName}` : 'Schön, dass Sie da sind.';

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

      {funnels.length > 0 && (
        <Card title="Ihre Analyse-Tools">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {funnels.map((f) => (
              <Link
                key={f.slug}
                to={`/dashboard/funnel/${f.slug}`}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80"
                style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
              >
                {f.name}
                <span aria-hidden="true">&#x2192;</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PotenzialCard progress={progress} loading={loading} />
        <FortschrittCard progress={progress} loading={loading} />
        <LeitfadenCard />
        <StrategiegespraechCard />
      </div>

      <p className="text-xs text-center pt-2" style={{ color: BRAND.colors.muted }}>
        BeautyFlow &bull; strukturiert, mit System, transparent
      </p>
    </div>
  );
}
