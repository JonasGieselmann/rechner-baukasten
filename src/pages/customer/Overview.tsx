import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { BRAND } from '../../../branding/tokens';
import { renderTitleWithItalics } from '../../lib/textFormat';

interface Lead {
  id: string;
  createdAt: string;
  recommendation?: string;
}

function PillCTA({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
      style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
    >
      {label}
      <span aria-hidden="true">&#x21AA;</span>
    </Link>
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-4xl font-medium" style={{ color: BRAND.colors.text }}>
        {renderTitleWithItalics(displayName ? `Willkommen *zurück*, ${displayName}` : 'Willkommen *zurück*')}
      </h1>

      <div
        className="rounded-2xl border p-6"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <h2 className="text-xl font-semibold mb-4" style={{ color: BRAND.colors.text }}>
          Ihre letzte Auswertung
        </h2>

        {loading && (
          <p className="text-sm opacity-60">Laden...</p>
        )}

        {!loading && empty && (
          <div className="space-y-4">
            <p className="text-sm opacity-70" style={{ color: BRAND.colors.text }}>
              Noch keine Analyse. Starten Sie unter Potenzialanalyse.
            </p>
            <PillCTA label="Zur Potenzialanalyse" to="/dashboard/potenzialanalyse" />
          </div>
        )}

        {!loading && lead && (
          <div className="space-y-2">
            {lead.recommendation && (
              <p className="text-base" style={{ color: BRAND.colors.text }}>
                {lead.recommendation}
              </p>
            )}
            <p className="text-sm opacity-50">
              {new Date(lead.createdAt).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
