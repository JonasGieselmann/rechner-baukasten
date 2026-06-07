import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminHeader } from '../components/AdminHeader';
import { BRAND } from '../../branding/tokens';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  parent_org_id: string | null;
  brand_name: string | null;
  logo_url: string | null;
  user_count: number;
  customer_count: number;
  admin_count: number;
  funnel_count: number;
  dashboard_count: number;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold" style={{ color: BRAND.colors.text }}>{value}</span>
      <span className="text-xs" style={{ color: BRAND.colors.muted }}>{label}</span>
    </div>
  );
}

export default function PlatformOverview() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organizations/overview', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Laden fehlgeschlagen'))))
      .then((d) => Array.isArray(d) && setOrgs(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Fehler'))
      .finally(() => setLoading(false));
  }, []);

  const platform = orgs.find((o) => o.parent_org_id === null);
  const customers = orgs.filter((o) => o.parent_org_id !== null);

  const card = { backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <AdminHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Plattform-Übersicht</h1>
          <p className="text-base" style={{ color: BRAND.colors.muted }}>
            Kalku verwaltet hier alle Organisationen. Jede White-Label-Agentur (z.&nbsp;B. BeautyFlow)
            ist eine eigene Organisation mit eigenen Team-Nutzern, Kunden, Funnels und Dashboards.
          </p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-2" style={{ backgroundColor: '#FEE', color: '#B00' }}>{error}</div>
        )}
        {loading && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden…</p>}

        {/* Platform (over-org) level */}
        {platform && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND.colors.muted }}>Plattform-Ebene</h2>
            <div className="rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={card}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{platform.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.background }}>Über-Org</span>
                </div>
                <p className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
                  Betreiber-Organisation (Layer One / Software-Team). Super-Admins verwalten von hier aus alle Kunden-Organisationen.
                </p>
              </div>
              <div className="flex gap-6">
                <Stat label="Team" value={platform.user_count} />
                <Stat label="Funnels" value={platform.funnel_count} />
                <Stat label="Dashboards" value={platform.dashboard_count} />
              </div>
            </div>
          </section>
        )}

        {/* Customer org level */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND.colors.muted }}>
              White-Label-Organisationen ({customers.length})
            </h2>
            <button
              onClick={() => navigate('/admin/organizations')}
              className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            >
              + Organisation
            </button>
          </div>

          {!loading && customers.length === 0 ? (
            <div className="rounded-2xl border p-6" style={card}>
              <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine White-Label-Organisationen. Legen Sie die erste an.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customers.map((o) => (
                <div key={o.id} className="rounded-2xl border p-6 flex flex-col gap-4" style={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{o.brand_name || o.name}</h3>
                      <p className="text-xs" style={{ color: BRAND.colors.muted }}>/{o.slug}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <Stat label="Kunden" value={o.customer_count} />
                    <Stat label="Team" value={o.admin_count} />
                    <Stat label="Funnels" value={o.funnel_count} />
                    <Stat label="Dashboards" value={o.dashboard_count} />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => navigate(`/agency?orgId=${encodeURIComponent(o.id)}`)}
                      className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90"
                      style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
                    >
                      Konsole öffnen
                    </button>
                    <button
                      onClick={() => navigate('/admin/organizations')}
                      className="text-sm px-4 py-2 rounded-full border transition-opacity hover:opacity-70"
                      style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
                    >
                      Branding & Admins
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
