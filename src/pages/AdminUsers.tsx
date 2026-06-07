import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { AdminHeader } from '../components/AdminHeader';
import { Avatar } from '../components/Avatar';
import { BRAND } from '../../branding/tokens';
import { formatDateTime } from '../lib/dateFormat';
import { OVERLAY_STYLE } from '../lib/uiStyles';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'agency_admin' | 'customer' | 'user';
  approved: boolean;
  created_at: string;
}

// Relative paths: same-origin in prod, proxied to the API in dev (server runs
// on a different port than Vite, so a hardcoded :3001 base broke local dev).
const API_BASE = '';

export function AdminUsers() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Admin password reset modal
  const [pwUser, setPwUser] = useState<UserData | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // Redirect if not super admin
  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate('/');
    }
  }, [user, isSuperAdmin, loading, navigate]);

  // Load users
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          navigate('/');
          return;
        }
        throw new Error('Fehler beim Laden der Benutzer');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Change a user's role (super_admin only). 3-tier: super_admin/agency_admin/customer.
  const handleRoleChange = async (userId: string, role: string) => {
    try {
      setActionLoading(userId);
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Rollenwechsel fehlgeschlagen');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve user
  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Genehmigen');
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Genehmigen');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const handleDelete = async (userId: string) => {
    if (!confirm('Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    } finally {
      setActionLoading(null);
    }
  };

  // Set / reset a user's password (admin). Works for any user incl. self.
  const handleSetPassword = async () => {
    if (!pwUser || pwValue.length < 8) {
      setPwMsg('Mindestens 8 Zeichen.');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${pwUser.id}/password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwValue }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || 'Passwort setzen fehlgeschlagen.');
      }
      setPwMsg('Passwort gesetzt.');
      setPwValue('');
      setTimeout(() => {
        setPwUser(null);
        setPwMsg('');
      }, 1200);
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : 'Fehler.');
    } finally {
      setPwSaving(false);
    }
  };

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

  const pendingUsers = users.filter((u) => !u.approved && u.role !== 'super_admin');
  const approvedUsers = users.filter((u) => u.approved || u.role === 'super_admin');

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
          &larr; Zurück
        </button>
        <h1 className="text-base font-semibold" style={{ color: BRAND.colors.text }}>
          Benutzerverwaltung
        </h1>
        <button
          onClick={loadUsers}
          disabled={loadingUsers}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg border text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-70"
          style={{
            borderColor: BRAND.colors.border,
            color: BRAND.colors.text,
            backgroundColor: BRAND.colors.card,
          }}
        >
          <svg
            className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Aktualisieren
        </button>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: BRAND.colors.text }}>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Ausstehende Genehmigungen ({pendingUsers.length})
            </h2>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <div className="divide-y" style={{ borderColor: BRAND.colors.border }}>
                {pendingUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(15,47,91,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                        <span className="text-amber-700 font-medium text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: BRAND.colors.text }}>
                          {u.name}
                        </p>
                        <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs" style={{ color: BRAND.colors.muted }}>
                        {formatDateTime(u.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium
                                     hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === u.id ? (
                            <span className="inline-flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border border-green-600 border-t-transparent" />
                            </span>
                          ) : (
                            'Genehmigen'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium
                                     hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Approved Users Section */}
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: BRAND.colors.text }}>
            Alle Benutzer ({approvedUsers.length})
          </h2>
          {loadingUsers ? (
            <div
              className="rounded-2xl border p-8 flex justify-center"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <div
                className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
                style={{ borderColor: BRAND.colors.accent }}
              />
            </div>
          ) : approvedUsers.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <p style={{ color: BRAND.colors.muted }}>Keine Benutzer vorhanden</p>
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <div className="divide-y" style={{ borderColor: BRAND.colors.border }}>
                {approvedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(15,47,91,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={u.name} email={u.email} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm" style={{ color: BRAND.colors.text }}>
                            {u.name}
                          </p>
                          {u.role === 'super_admin' && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${BRAND.colors.accent}1A`,
                                color: BRAND.colors.primary,
                              }}
                            >
                              Super Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs" style={{ color: BRAND.colors.muted }}>
                        {formatDateTime(u.created_at)}
                      </span>
                      <button
                        onClick={() => { setPwUser(u); setPwValue(''); setPwMsg(''); }}
                        data-testid={`set-pw-${u.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-70"
                        style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
                        title="Passwort setzen / zurücksetzen"
                      >
                        Passwort
                      </button>
                      {u.id !== user?.id && (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={actionLoading === u.id}
                          className="text-xs rounded-lg border px-2 py-1 disabled:opacity-50"
                          style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.card, color: BRAND.colors.text }}
                          title="Rolle ändern"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="agency_admin">Agency Admin</option>
                          <option value="customer">Kunde</option>
                        </select>
                      )}
                      {u.role !== 'super_admin' && u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-red-50"
                          style={{ color: BRAND.colors.muted }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = BRAND.colors.muted)}
                          title="Benutzer löschen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {pwUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={OVERLAY_STYLE}
          onClick={() => !pwSaving && setPwUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 space-y-4"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
              Passwort setzen
            </h3>
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>
              Neues Passwort für <strong>{pwUser.name}</strong> ({pwUser.email}). Teilen Sie es der
              Person sicher mit; sie kann es danach selbst im Konto ändern.
            </p>
            <input
              type="text"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              placeholder="Neues Passwort (min. 8 Zeichen)"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
            />
            {pwMsg && <p className="text-sm" style={{ color: BRAND.colors.accent }}>{pwMsg}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPwUser(null)}
                disabled={pwSaving}
                className="text-sm px-4 py-2 rounded-full transition-opacity hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSetPassword}
                disabled={pwSaving || pwValue.length < 8}
                className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                {pwSaving ? 'Speichern...' : 'Passwort setzen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
