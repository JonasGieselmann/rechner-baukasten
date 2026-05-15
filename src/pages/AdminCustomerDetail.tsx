import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { AdminHeader } from '../components/AdminHeader';
import { Avatar } from '../components/Avatar';
import { BRAND } from '../../branding/tokens';
import { formatDateTime } from '../lib/dateFormat';

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  createdAt: string;
}

interface LeadRow {
  id: string;
  funnelId: string;
  funnelSlug: string | null;
  createdAt: string;
  recommendation: string | null;
  scrapeStatus: string;
}

interface CustomerDetailResponse {
  user: CustomerDetail;
  leads: LeadRow[];
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading } = useAuth();
  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate('/');
    }
  }, [user, isSuperAdmin, loading, navigate]);

  useEffect(() => {
    if (!isSuperAdmin || !id) return;
    setLoadingData(true);
    fetch(`${API_BASE}/api/admin/customers/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Kunde nicht gefunden');
        return r.json() as Promise<CustomerDetailResponse>;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Unbekannter Fehler'))
      .finally(() => setLoadingData(false));
  }, [isSuperAdmin, id]);

  if (loading || loadingData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BRAND.colors.background }}
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
          style={{ borderColor: BRAND.colors.accent }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background }}>
        <AdminHeader />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error ?? 'Kunde nicht gefunden.'}</p>
          </div>
        </main>
      </div>
    );
  }

  const { user: customer, leads } = data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background }}>
      <AdminHeader />

      {/* Sub-toolbar */}
      <div
        className="border-b px-6 py-2 flex items-center gap-4"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <button
          onClick={() => navigate('/admin/customers')}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: BRAND.colors.muted }}
        >
          &larr; Kunden
        </button>
        <h1 className="text-base font-semibold" style={{ color: BRAND.colors.text }}>
          {customer.name}
        </h1>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Customer header card */}
        <div
          className="rounded-2xl border p-6 flex items-start gap-6"
          style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
        >
          <Avatar name={customer.name} email={customer.email} size="lg" />
          <div className="space-y-1 flex-1">
            <p className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
              {customer.name}
            </p>
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>
              {customer.email}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {customer.approved ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${BRAND.colors.accent}26`,
                    color: BRAND.colors.primary,
                  }}
                >
                  Aktiv
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                  Wartet auf Freigabe
                </span>
              )}
              <span className="text-xs" style={{ color: BRAND.colors.muted }}>
                Mitglied seit {formatDateTime(customer.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Leads section */}
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: BRAND.colors.text }}>
            Aktivität ({leads.length} {leads.length === 1 ? 'Lead' : 'Leads'})
          </h2>
          {leads.length === 0 ? (
            <div
              className="rounded-2xl border p-10 text-center"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <p style={{ color: BRAND.colors.muted }}>Noch keine Aktivität.</p>
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
                    <th className="py-3 px-4">Funnel</th>
                    <th className="py-3 px-4">Empfehlung</th>
                    <th className="py-3 px-4">Scrape-Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b"
                      style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
                    >
                      <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                        {formatDateTime(l.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                        {l.funnelSlug ?? l.funnelId}
                      </td>
                      <td className="py-3 px-4">{l.recommendation ?? '-'}</td>
                      <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                        {l.scrapeStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
