import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFunnel, getFunnelLeads } from '../lib/funnelApi';
import type { Funnel, Lead } from '../types';
import { AdminHeader } from '../components/AdminHeader';
import { BRAND } from '../../branding/tokens';
import { recommendationLabel } from '../engine/score';

export function FunnelLeads() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getFunnel(id), getFunnelLeads(id)])
      .then(([f, l]) => {
        setFunnel(f);
        setLeads(l);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, [id]);

  if (error) return <div className="p-10 text-red-600">Fehler: {error}</div>;
  if (!funnel) {
    return (
      <div className="p-10" style={{ color: BRAND.colors.muted }}>
        Lädt...
      </div>
    );
  }

  const statusPillFor = (status: string) => {
    if (status === 'active') return 'bg-green-50 text-green-700';
    if (status === 'archived') return 'bg-neutral-100 text-neutral-600';
    return 'bg-amber-50 text-amber-700';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background }}>
      <AdminHeader />

      {/* Sub-toolbar */}
      <div
        className="border-b px-6 py-2 flex items-center gap-4"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <button
          onClick={() => navigate('/')}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: BRAND.colors.muted }}
        >
          &larr; Funnels
        </button>
        <h1 className="text-base font-semibold" style={{ color: BRAND.colors.text }}>
          {funnel.name}
        </h1>
        <span className="text-xs" style={{ color: BRAND.colors.muted }}>
          {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
        </span>
        <button
          onClick={() => navigate(`/funnels/${funnel.id}`)}
          className="ml-auto text-xs hover:underline"
          style={{ color: BRAND.colors.accent }}
        >
          Editor &rarr;
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {leads.length === 0 ? (
          <div className="text-center py-20" style={{ color: BRAND.colors.muted }}>
            Noch keine Leads.
          </div>
        ) : (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-xs font-medium text-left"
                  style={{ borderColor: BRAND.colors.border, color: BRAND.colors.muted }}
                >
                  <th className="py-3 px-4">Datum</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">E-Mail</th>
                  <th className="py-3 px-4">Praxis</th>
                  <th className="py-3 px-4">Empfehlung</th>
                  <th className="py-3 px-4">Scrape</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b transition-colors"
                    style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(15,47,91,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                      {new Date(l.createdAt).toLocaleString('de-DE')}
                    </td>
                    <td className="py-3 px-4">{l.name ?? '-'}</td>
                    <td className="py-3 px-4">{l.email ?? '-'}</td>
                    <td className="py-3 px-4">{l.businessName ?? '-'}</td>
                    <td className="py-3 px-4">{recommendationLabel(l.recommendation) ?? '-'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                      {l.scrapeStatus}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPillFor(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
