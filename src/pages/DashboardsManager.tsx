import { useCallback, useEffect, useState } from 'react';
import { BRAND } from '../../branding/tokens';
import { AgencyHeader } from '../components/AgencyLayout';

interface Dashboard {
  id: string;
  name: string;
  description: string;
  org_id?: string;
}
interface FunnelLite {
  id: string;
  slug: string;
  name: string;
  status: string;
  position?: number;
}

const API = '';

// Forward the agency drill-in org (?orgId) so a super_admin operating a specific
// org stays scoped to it (agency_admin has no ?orgId → backend uses their org).
function withOrg(path: string): string {
  if (typeof window === 'undefined') return path;
  const orgId = new URLSearchParams(window.location.search).get('orgId');
  if (!orgId) return path;
  return path.includes('?') ? `${path}&orgId=${encodeURIComponent(orgId)}` : `${path}?orgId=${encodeURIComponent(orgId)}`;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${withOrg(path)}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export default function DashboardsManager() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [allFunnels, setAllFunnels] = useState<FunnelLite[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [linked, setLinked] = useState<FunnelLite[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const loadBase = useCallback(() => {
    Promise.all([api<Dashboard[]>('/api/dashboards'), api<FunnelLite[]>('/api/funnels')])
      .then(([d, f]) => {
        setDashboards(d);
        setAllFunnels(f);
      })
      .catch((e) => setError(String(e.message || e)));
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  const loadLinked = useCallback((id: string) => {
    api<FunnelLite[]>(`/api/dashboards/${id}/funnels`)
      .then(setLinked)
      .catch((e) => setError(String(e.message || e)));
  }, []);

  useEffect(() => {
    if (selected) loadLinked(selected);
    else setLinked([]);
  }, [selected, loadLinked]);

  const createDashboard = () => {
    if (!newName.trim()) return;
    api<Dashboard>('/api/dashboards', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) })
      .then((d) => {
        setNewName('');
        loadBase();
        setSelected(d.id);
      })
      .catch((e) => setError(String(e.message || e)));
  };

  const linkFunnel = (funnelId: string) => {
    if (!selected) return;
    api(`/api/dashboards/${selected}/funnels`, { method: 'POST', body: JSON.stringify({ funnelId }) })
      .then(() => loadLinked(selected))
      .catch((e) => setError(String(e.message || e)));
  };
  const unlinkFunnel = (funnelId: string) => {
    if (!selected) return;
    api(`/api/dashboards/${selected}/funnels/${funnelId}`, { method: 'DELETE' })
      .then(() => loadLinked(selected))
      .catch((e) => setError(String(e.message || e)));
  };

  const linkedIds = new Set(linked.map((f) => f.id));
  const available = allFunnels.filter((f) => !linkedIds.has(f.id));

  const card = { backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <AgencyHeader />

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Dashboards</h1>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>
            Ein Dashboard b&uuml;ndelt mehrere Funnels f&uuml;r einen Kunden. Funnels verwalten Sie unter dem Men&uuml;punkt &bdquo;Funnels&ldquo;; hier verkn&uuml;pfen Sie bestehende Funnels mit einem Dashboard.
          </p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-2" style={{ backgroundColor: '#FEE', color: '#B00' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dashboards list + create */}
          <div className="rounded-2xl border p-5 space-y-3" style={card}>
            <h2 className="font-semibold">Dashboards</h2>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Neues Dashboard"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
              />
              <button
                onClick={createDashboard}
                className="px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                +
              </button>
            </div>
            <ul className="space-y-1">
              {dashboards.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setSelected(d.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={selected === d.id ? { backgroundColor: `${BRAND.colors.accent}33` } : {}}
                  >
                    {d.name}
                  </button>
                </li>
              ))}
              {dashboards.length === 0 && <li className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine Dashboards.</li>}
            </ul>
          </div>

          {/* Linked funnels */}
          <div className="rounded-2xl border p-5 space-y-3" style={card}>
            <h2 className="font-semibold">Verkn&uuml;pfte Funnels</h2>
            {!selected && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Dashboard w&auml;hlen.</p>}
            {selected &&
              linked.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{f.name}</span>
                  <button onClick={() => unlinkFunnel(f.id)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: BRAND.colors.border }}>
                    entfernen
                  </button>
                </div>
              ))}
            {selected && linked.length === 0 && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Keine Funnels verkn&uuml;pft.</p>}
          </div>

          {/* Available funnels */}
          <div className="rounded-2xl border p-5 space-y-3" style={card}>
            <h2 className="font-semibold">Verf&uuml;gbare Funnels</h2>
            {!selected && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Dashboard w&auml;hlen.</p>}
            {selected &&
              available.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{f.name}</span>
                  <button
                    onClick={() => linkFunnel(f.id)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
                  >
                    hinzuf&uuml;gen
                  </button>
                </div>
              ))}
            {selected && available.length === 0 && <p className="text-sm" style={{ color: BRAND.colors.muted }}>Alle Funnels verkn&uuml;pft.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
