import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { AdminHeader } from '../components/AdminHeader';
import { BRAND } from '../../branding/tokens';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  createdAt: string;
  leadsCount: number;
  lastLeadAt: string | null;
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export function AdminCustomers() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate('/');
    }
  }, [user, isSuperAdmin, loading, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoadingData(true);
    fetch(`${API_BASE}/api/admin/customers`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Fehler beim Laden der Kunden');
        return r.json() as Promise<CustomerRow[]>;
      })
      .then(setCustomers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Unbekannter Fehler'))
      .finally(() => setLoadingData(false));
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (loading) {
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background }}>
      <AdminHeader />

      {/* Sub-toolbar */}
      <div
        className="border-b px-6 py-2 flex items-center gap-4"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <h1 className="text-base font-semibold" style={{ color: BRAND.colors.text }}>
          Kunden {!loadingData && `(${customers.length})`}
        </h1>
        <input
          type="text"
          placeholder="Name oder E-Mail suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto text-sm px-3 py-1.5 rounded-lg border outline-none"
          style={{
            backgroundColor: BRAND.colors.background,
            borderColor: BRAND.colors.border,
            color: BRAND.colors.text,
          }}
        />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loadingData ? (
          <div
            className="rounded-2xl border p-12 flex justify-center"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <div
              className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
              style={{ borderColor: BRAND.colors.accent }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <p className="font-medium" style={{ color: BRAND.colors.text }}>
              Noch keine Kunden registriert.
            </p>
            <p className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>
              Kunden erscheinen hier, sobald sie sich registrieren und freigeschaltet werden.
            </p>
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
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">E-Mail</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Mitglied seit</th>
                  <th className="py-3 px-4 text-right">Leads</th>
                  <th className="py-3 px-4">Letzter Lead</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b cursor-pointer transition-colors"
                    style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
                    onClick={() => navigate(`/admin/customers/${c.id}`)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = 'rgba(15,47,91,0.04)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4" style={{ color: BRAND.colors.muted }}>
                      {c.email}
                    </td>
                    <td className="py-3 px-4">
                      {c.approved ? (
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
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{c.leadsCount}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: BRAND.colors.muted }}>
                      {c.lastLeadAt ? formatDate(c.lastLeadAt) : '-'}
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
