import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFunnelStore } from '../store/funnelStore';
import { AgencyLayout } from '../components/AgencyLayout';
import { useOrgQuery } from '../lib/useOrgQuery';
import { BRAND } from '../../branding/tokens';
import { formatDateTime } from '../lib/dateFormat';
import { OVERLAY_STYLE } from '../lib/uiStyles';

export default function FunnelsManager() {
  const navigate = useNavigate();
  const { withQ } = useOrgQuery();
  const { funnels, loadFunnels, createFunnel, deleteFunnel } = useFunnelStore();
  const [showNewFunnelModal, setShowNewFunnelModal] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [deleteFunnelConfirm, setDeleteFunnelConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadFunnels().catch(() => { /* surfaced via store error path */ });
  }, [loadFunnels]);

  const handleCreateFunnel = async () => {
    if (!newFunnelName.trim()) return;
    try {
      const id = await createFunnel(newFunnelName.trim());
      setShowNewFunnelModal(false);
      setNewFunnelName('');
      navigate(withQ(`/agency/funnels/${id}`));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Funnel konnte nicht erstellt werden');
    }
  };

  const handleDeleteFunnel = async (id: string) => {
    try {
      await deleteFunnel(id);
    } finally {
      setDeleteFunnelConfirm(null);
    }
  };

  return (
    <AgencyLayout>
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Sub-toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: BRAND.colors.text }}
          >
            {`Custom Funnels (${funnels.length})`}
          </h2>
          <button
            onClick={() => setShowNewFunnelModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Funnel
          </button>
        </div>

        {/* Funnels grid / empty state */}
        {funnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-24 h-24 rounded-2xl border flex items-center justify-center mb-6"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <svg
                className="w-12 h-12"
                style={{ color: BRAND.colors.border }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: BRAND.colors.text }}>
              Noch keine Funnels
            </h2>
            <p className="mb-6 text-center max-w-md" style={{ color: BRAND.colors.muted }}>
              Erstellen Sie Ihren ersten Funnel, um Leads mit mehrstufigen Formularen einzusammeln.
            </p>
            <button
              onClick={() => setShowNewFunnelModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ersten Funnel erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnels.map((funnel) => (
              <div
                key={funnel.id}
                className="rounded-2xl border transition-all group"
                style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(withQ(`/agency/funnels/${funnel.id}`))}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: BRAND.colors.background }}
                    >
                      <svg
                        className="w-5 h-5"
                        style={{ color: BRAND.colors.accent }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          funnel.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {funnel.status === 'published' ? 'Aktiv' : 'Entwurf'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFunnelConfirm(funnel.id);
                        }}
                        className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100
                                   hover:bg-red-50 hover:text-red-600"
                        style={{ color: BRAND.colors.muted }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3
                    className="font-semibold mb-1 group-hover:opacity-80 transition-opacity"
                    style={{ color: BRAND.colors.text }}
                  >
                    {funnel.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs mt-3" style={{ color: BRAND.colors.muted }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDateTime(funnel.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Funnel Modal */}
      {showNewFunnelModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={OVERLAY_STYLE}>
          <div
            className="rounded-2xl w-full max-w-md border shadow-xl"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <div className="p-5 border-b" style={{ borderColor: BRAND.colors.border }}>
              <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
                Neuen Funnel erstellen
              </h2>
            </div>
            <div className="p-5">
              <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>Name</label>
              <input
                type="text"
                value={newFunnelName}
                onChange={(e) => setNewFunnelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFunnel()}
                placeholder="z.B. Potenzialanalyse"
                className="w-full rounded-lg py-3 px-4 border outline-none transition-all"
                style={{
                  backgroundColor: BRAND.colors.background,
                  color: BRAND.colors.text,
                  borderColor: BRAND.colors.border,
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end p-5 border-t" style={{ borderColor: BRAND.colors.border }}>
              <button
                onClick={() => { setShowNewFunnelModal(false); setNewFunnelName(''); }}
                className="px-4 py-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateFunnel}
                disabled={!newFunnelName.trim()}
                className="px-5 py-2 rounded-full font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Funnel Confirmation Modal */}
      {deleteFunnelConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={OVERLAY_STYLE}>
          <div
            className="rounded-2xl w-full max-w-sm border shadow-xl"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <div className="p-5">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center mb-2" style={{ color: BRAND.colors.text }}>
                Funnel löschen?
              </h3>
              <p className="text-center text-sm" style={{ color: BRAND.colors.muted }}>
                Funnel und alle eingesammelten Leads werden permanent gelöscht.
              </p>
            </div>
            <div className="flex gap-3 justify-center p-5 border-t" style={{ borderColor: BRAND.colors.border }}>
              <button
                onClick={() => setDeleteFunnelConfirm(null)}
                className="px-4 py-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteFunnel(deleteFunnelConfirm)}
                className="px-5 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </AgencyLayout>
  );
}
