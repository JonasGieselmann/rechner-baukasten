import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFunnel, getFunnelLeads } from '../lib/funnelApi';
import type { Funnel, Lead } from '../types';

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

  if (error) return <div className="p-10 text-red-400">Fehler: {error}</div>;
  if (!funnel) return <div className="p-10 text-[#6b7a90]">Lädt...</div>;

  return (
    <div className="min-h-screen bg-[#04070d] text-white">
      <header className="border-b border-[#1a1f2e] bg-[#0a0d12] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-[#6b7a90] hover:text-white text-sm">← Funnels</button>
        <h1 className="text-lg font-semibold">{funnel.name}</h1>
        <span className="text-xs text-[#6b7a90]">{leads.length} Leads</span>
        <button onClick={() => navigate(`/funnels/${funnel.id}`)} className="ml-auto text-xs text-[#7EC8F3] hover:underline">Editor →</button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {leads.length === 0 ? (
          <div className="text-center py-20 text-[#6b7a90]">Noch keine Leads.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b7a90] border-b border-[#1a1f2e]">
              <tr>
                <th className="py-3 pr-4">Datum</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">E-Mail</th>
                <th className="py-3 pr-4">Praxis</th>
                <th className="py-3 pr-4">Empfehlung</th>
                <th className="py-3 pr-4">Scrape</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-[#1a1f2e] hover:bg-[#0a0d12]">
                  <td className="py-3 pr-4 text-[#6b7a90]">{new Date(l.createdAt).toLocaleString('de-DE')}</td>
                  <td className="py-3 pr-4">{l.name ?? '-'}</td>
                  <td className="py-3 pr-4">{l.email ?? '-'}</td>
                  <td className="py-3 pr-4">{l.businessName ?? '-'}</td>
                  <td className="py-3 pr-4">{l.recommendation ?? '-'}</td>
                  <td className="py-3 pr-4 text-[#6b7a90]">{l.scrapeStatus}</td>
                  <td className="py-3 pr-4">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
