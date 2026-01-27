import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'user';
  approved: boolean;
  created_at: string;
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export function AdminUsers() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

      // Reload users
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

      // Reload users
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7EC8F3] border-t-transparent" />
      </div>
    );
  }

  const pendingUsers = users.filter((u) => !u.approved && u.role !== 'super_admin');
  const approvedUsers = users.filter((u) => u.approved || u.role === 'super_admin');

  return (
    <div className="min-h-screen bg-[#04070d]">
      {/* Header */}
      <header className="border-b border-[#1a1f2e] bg-[#0a0d12]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg text-[#6b7a90] hover:text-white hover:bg-[#1a1f2e] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Benutzerverwaltung</h1>
                <p className="text-xs text-[#6b7a90]">Super Admin</p>
              </div>
            </div>
            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1f2e] text-[#b8c7d9] rounded-lg
                         hover:bg-[#2a3142] transition-colors disabled:opacity-50"
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
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Ausstehende Genehmigungen ({pendingUsers.length})
            </h2>
            <div className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] overflow-hidden">
              <div className="divide-y divide-[#1a1f2e]">
                {pendingUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between hover:bg-[#1a1f2e]/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <span className="text-yellow-400 font-medium">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-sm text-[#6b7a90]">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#4a5565]">{formatDate(u.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium
                                     hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === u.id ? (
                            <span className="inline-flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border border-green-400 border-t-transparent" />
                            </span>
                          ) : (
                            'Genehmigen'
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium
                                     hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
          <h2 className="text-lg font-semibold text-white mb-4">
            Alle Benutzer ({approvedUsers.length})
          </h2>
          {loadingUsers ? (
            <div className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#7EC8F3] border-t-transparent" />
            </div>
          ) : approvedUsers.length === 0 ? (
            <div className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] p-8 text-center">
              <p className="text-[#6b7a90]">Keine Benutzer vorhanden</p>
            </div>
          ) : (
            <div className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] overflow-hidden">
              <div className="divide-y divide-[#1a1f2e]">
                {approvedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between hover:bg-[#1a1f2e]/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          u.role === 'super_admin'
                            ? 'bg-gradient-to-br from-[#7EC8F3] to-[#5BA3D9]'
                            : 'bg-[#1a1f2e]'
                        }`}
                      >
                        <span
                          className={`font-medium ${
                            u.role === 'super_admin' ? 'text-white' : 'text-[#7EC8F3]'
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{u.name}</p>
                          {u.role === 'super_admin' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#7EC8F3]/10 text-[#7EC8F3]">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#6b7a90]">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#4a5565]">{formatDate(u.created_at)}</span>
                      {u.role !== 'super_admin' && u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="p-2 rounded-lg text-[#6b7a90] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
    </div>
  );
}
