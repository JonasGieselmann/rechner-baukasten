import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';
import { useAuth } from '../components/AuthProvider';
import { AdminHeader } from '../components/AdminHeader';
import { BRAND } from '../../branding/tokens';
import { formatDateTime } from '../lib/dateFormat';

interface CustomCalculator {
  id: string;
  name: string;
  description: string;
  slug: string;
  path: string;
  width: string;
  height: string;
  active: boolean;
}

type TabType = 'builder' | 'custom';

const TABS: TabType[] = ['builder', 'custom'];

// API base URL - different in dev vs production
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// Shared overlay style for all modals
const OVERLAY_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(15, 47, 91, 0.5)',
};

export function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin } = useAuth();
  const { savedCalculators, loadSavedCalculators, createNewCalculator, deleteCalculator } =
    useCalculatorStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteCustomConfirm, setDeleteCustomConfirm] = useState<string | null>(null);
  const urlTab = searchParams.get('tab') as TabType | null;
  const activeTab: TabType = urlTab && TABS.includes(urlTab) ? urlTab : 'builder';
  const setActiveTab = (tab: TabType) => {
    if (tab === 'builder') {
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set('tab', tab);
      setSearchParams(searchParams, { replace: true });
    }
  };
  const [customCalculators, setCustomCalculators] = useState<CustomCalculator[]>([]);
  const [showEmbedModal, setShowEmbedModal] = useState<{ type: 'builder' | 'custom'; id: string; name: string } | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadWidth, setUploadWidth] = useState('100%');
  const [uploadHeight, setUploadHeight] = useState('800px');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSavedCalculators();
  }, [loadSavedCalculators]);

  // Load custom calculators from API
  const loadCustomCalculators = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/custom-calculators`);
      if (response.ok) {
        const data = await response.json();
        setCustomCalculators(data || []);
      }
    } catch (err) {
      console.error('Failed to load custom calculators:', err);
      // Fallback to registry.json in case API is not available
      try {
        const fallbackResponse = await fetch('/custom-calculators/registry.json');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setCustomCalculators(data.calculators || []);
        }
      } catch {
        // Ignore fallback errors
      }
    }
  };

  useEffect(() => {
    loadCustomCalculators();
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createNewCalculator(newName.trim());
    setShowNewModal(false);
    setNewName('');
    navigate(`/editor/${id}`);
  };

  const handleDelete = (id: string) => {
    deleteCalculator(id);
    setDeleteConfirm(null);
  };

  // Upload custom calculator
  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadName.trim());
      formData.append('description', uploadDescription.trim());
      formData.append('width', uploadWidth);
      formData.append('height', uploadHeight);

      const response = await fetch(`${API_BASE}/api/custom-calculators/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      // Reload custom calculators
      await loadCustomCalculators();

      // Reset form and close modal
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      setUploadWidth('100%');
      setUploadHeight('800px');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  // Delete custom calculator
  const handleDeleteCustom = async (slug: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/custom-calculators/${slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Löschen fehlgeschlagen');
      }

      // Reload custom calculators
      await loadCustomCalculators();
      setDeleteCustomConfirm(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    }
  };

  const getEmbedCode = (type: 'builder' | 'custom', id: string) => {
    const baseUrl = window.location.origin;
    const url = type === 'builder'
      ? `${baseUrl}/embed/${id}`
      : `${baseUrl}/embed/custom/${id}`;
    return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`;
  };

  const copyEmbedCode = () => {
    if (!showEmbedModal) return;
    navigator.clipboard.writeText(getEmbedCode(showEmbedModal.type, showEmbedModal.id));
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  // Shared tab button classes/styles
  const tabStyle = (tab: TabType): React.CSSProperties => ({
    borderBottomColor: activeTab === tab ? BRAND.colors.accent : 'transparent',
    color: activeTab === tab ? BRAND.colors.text : BRAND.colors.muted,
    fontWeight: activeTab === tab ? 700 : 500,
  });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <AdminHeader />

      {/* Tab strip */}
      <div
        className="border-b"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 -mb-px">
            {(
              [
                { key: 'builder', label: 'Builder-Rechner', count: savedCalculators.length },
                { key: 'custom', label: 'Custom-Rechner', count: customCalculators.length },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="px-4 py-3 text-sm border-b-2 transition-colors"
                style={tabStyle(key)}
              >
                {label}
                {count > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: BRAND.colors.border, color: BRAND.colors.muted }}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Sub-toolbar: tab-specific primary action */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: BRAND.colors.text }}
          >
            {activeTab === 'builder' && `Builder-Rechner (${savedCalculators.length})`}
            {activeTab === 'custom' && `Custom-Rechner (${customCalculators.length})`}
          </h2>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => navigate('/admin/users')}
                className="text-sm px-4 py-2 rounded-full border transition-opacity hover:opacity-70"
                style={{ borderColor: BRAND.colors.border, color: BRAND.colors.muted }}
              >
                Benutzer
              </button>
            )}
            {activeTab === 'builder' && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuer Rechner
              </button>
            )}
            {activeTab === 'custom' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Hochladen
              </button>
            )}
          </div>
        </div>

        {/* Builder-Rechner tab */}
        {activeTab === 'builder' && (
          <>
            {savedCalculators.length === 0 ? (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2
                  className="text-xl font-semibold mb-2"
                  style={{ color: BRAND.colors.text }}
                >
                  Noch keine Rechner
                </h2>
                <p className="mb-6 text-center max-w-md" style={{ color: BRAND.colors.muted }}>
                  Erstelle deinen ersten interaktiven Rechner mit dem Baukasten-Editor.
                </p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ersten Rechner erstellen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCalculators
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((calc) => (
                    <div
                      key={calc.id}
                      className="rounded-2xl border transition-all group"
                      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
                    >
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() => navigate(`/editor/${calc.id}`)}
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(calc.id);
                            }}
                            className="p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100
                                       hover:bg-red-50 hover:text-red-600"
                            style={{ color: BRAND.colors.muted }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <h3
                          className="font-semibold mb-1 group-hover:opacity-80 transition-opacity"
                          style={{ color: BRAND.colors.text }}
                        >
                          {calc.name}
                        </h3>
                        <p className="text-sm mb-3" style={{ color: BRAND.colors.muted }}>
                          {calc.blocks.length} Block{calc.blocks.length !== 1 ? 's' : ''}
                        </p>
                        <div
                          className="flex items-center gap-2 text-xs"
                          style={{ color: BRAND.colors.muted }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDateTime(calc.updatedAt)}
                        </div>
                      </div>
                      {/* Embed button */}
                      <div className="px-5 pb-4 pt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmbedModal({ type: 'builder', id: calc.id, name: calc.name });
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                                     text-sm transition-colors border hover:border-transparent"
                          style={{
                            backgroundColor: BRAND.colors.background,
                            borderColor: BRAND.colors.border,
                            color: BRAND.colors.muted,
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          Embed-Code
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Custom-Rechner tab */}
        {activeTab === 'custom' && (
          <>
            {customCalculators.length === 0 ? (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: BRAND.colors.text }}>
                  Keine Custom-Rechner
                </h2>
                <p className="mb-6 text-center max-w-md" style={{ color: BRAND.colors.muted }}>
                  Lade deinen fertigen Rechner als ZIP-Datei hoch und hoste ihn hier.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Rechner hochladen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customCalculators.map((calc) => (
                  <div
                    key={calc.id}
                    className="rounded-2xl border transition-all group"
                    style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(126,200,243,0.12)' }}
                        >
                          <svg className="w-5 h-5" style={{ color: BRAND.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              calc.active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {calc.active ? 'Aktiv' : 'Inaktiv'}
                          </span>
                          <button
                            onClick={() => setDeleteCustomConfirm(calc.slug)}
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
                        {calc.name}
                      </h3>
                      <p className="text-sm mb-3 line-clamp-2" style={{ color: BRAND.colors.muted }}>
                        {calc.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: BRAND.colors.muted }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        /embed/custom/{calc.slug}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="px-5 pb-4 pt-0 flex gap-2">
                      <a
                        href={calc.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                                   text-sm transition-colors border hover:border-transparent hover:bg-slate-50"
                        style={{
                          backgroundColor: BRAND.colors.background,
                          borderColor: BRAND.colors.border,
                          color: BRAND.colors.muted,
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Vorschau
                      </a>
                      <button
                        onClick={() => setShowEmbedModal({ type: 'custom', id: calc.slug, name: calc.name })}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                                   text-sm transition-colors"
                        style={{
                          backgroundColor: 'rgba(126,200,243,0.12)',
                          color: BRAND.colors.accent,
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Embed-Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* New Calculator Modal */}
      {showNewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={OVERLAY_STYLE}>
          <div
            className="rounded-2xl w-full max-w-md border shadow-xl"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <div className="p-5 border-b" style={{ borderColor: BRAND.colors.border }}>
              <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
                Neuen Rechner erstellen
              </h2>
            </div>
            <div className="p-5">
              <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="z.B. ROI Rechner"
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
                onClick={() => { setShowNewModal(false); setNewName(''); }}
                className="px-4 py-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-5 py-2 rounded-full font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
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
                Rechner löschen?
              </h3>
              <p className="text-center text-sm" style={{ color: BRAND.colors.muted }}>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
            <div className="flex gap-3 justify-center p-5 border-t" style={{ borderColor: BRAND.colors.border }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={OVERLAY_STYLE}>
          <div
            className="rounded-2xl w-full max-w-lg border shadow-xl overflow-hidden"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <div className="p-5 border-b" style={{ borderColor: BRAND.colors.border }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(126,200,243,0.12)' }}
                >
                  <svg className="w-5 h-5" style={{ color: BRAND.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>Embed-Code</h2>
                  <p className="text-xs" style={{ color: BRAND.colors.muted }}>{showEmbedModal.name}</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <pre
                className="rounded-xl p-4 text-sm font-mono overflow-auto max-h-48 border"
                style={{
                  backgroundColor: BRAND.colors.background,
                  borderColor: BRAND.colors.border,
                  color: BRAND.colors.text,
                }}
              >
                {getEmbedCode(showEmbedModal.type, showEmbedModal.id)}
              </pre>

              <div
                className="mt-4 p-3 rounded-lg border"
                style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border }}
              >
                <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                  <span className="font-medium" style={{ color: BRAND.colors.accent }}>Tipp:</span>{' '}
                  Der Embed-Code funktioniert mit Framer, Webflow, WordPress und allen anderen Websites,
                  die iframes unterstützen.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-5 border-t" style={{ borderColor: BRAND.colors.border }}>
              <button
                onClick={() => { setShowEmbedModal(null); setEmbedCopied(false); }}
                className="px-4 py-2.5 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Schließen
              </button>
              <button
                onClick={copyEmbedCode}
                className="px-5 py-2.5 rounded-full font-medium transition-all"
                style={
                  embedCopied
                    ? { backgroundColor: '#22c55e', color: '#fff' }
                    : { backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }
                }
              >
                {embedCopied ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Kopiert!
                  </span>
                ) : (
                  'Code kopieren'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Custom Calculator Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={OVERLAY_STYLE}>
          <div
            className="rounded-2xl w-full max-w-lg border shadow-xl overflow-hidden"
            style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
          >
            <div className="p-5 border-b" style={{ borderColor: BRAND.colors.border }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(126,200,243,0.12)' }}
                >
                  <svg className="w-5 h-5" style={{ color: BRAND.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
                    Custom-Rechner hochladen
                  </h2>
                  <p className="text-xs" style={{ color: BRAND.colors.muted }}>ZIP-Datei mit index.html</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>ZIP-Datei *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setUploadFile(file || null);
                    if (file && !uploadName) {
                      const name = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
                      setUploadName(name.charAt(0).toUpperCase() + name.slice(1));
                    }
                  }}
                  className="w-full rounded-lg py-3 px-4 border outline-none transition-all
                             file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                             file:font-medium file:cursor-pointer"
                  style={{
                    backgroundColor: BRAND.colors.background,
                    color: BRAND.colors.text,
                    borderColor: BRAND.colors.border,
                  }}
                />
                <p className="text-xs mt-1" style={{ color: BRAND.colors.muted }}>
                  Die ZIP-Datei muss eine index.html enthalten (max. 50MB)
                </p>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>Name *</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="z.B. ROI Rechner"
                  className="w-full rounded-lg py-3 px-4 border outline-none transition-all"
                  style={{
                    backgroundColor: BRAND.colors.background,
                    color: BRAND.colors.text,
                    borderColor: BRAND.colors.border,
                  }}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>Beschreibung</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Kurze Beschreibung des Rechners..."
                  rows={2}
                  className="w-full rounded-lg py-3 px-4 border outline-none transition-all resize-none"
                  style={{
                    backgroundColor: BRAND.colors.background,
                    color: BRAND.colors.text,
                    borderColor: BRAND.colors.border,
                  }}
                />
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>Breite</label>
                  <input
                    type="text"
                    value={uploadWidth}
                    onChange={(e) => setUploadWidth(e.target.value)}
                    placeholder="100%"
                    className="w-full rounded-lg py-3 px-4 border outline-none transition-all"
                    style={{
                      backgroundColor: BRAND.colors.background,
                      color: BRAND.colors.text,
                      borderColor: BRAND.colors.border,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: BRAND.colors.muted }}>Höhe</label>
                  <input
                    type="text"
                    value={uploadHeight}
                    onChange={(e) => setUploadHeight(e.target.value)}
                    placeholder="800px"
                    className="w-full rounded-lg py-3 px-4 border outline-none transition-all"
                    style={{
                      backgroundColor: BRAND.colors.background,
                      color: BRAND.colors.text,
                      borderColor: BRAND.colors.border,
                    }}
                  />
                </div>
              </div>

              {/* Info Box */}
              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border }}
              >
                <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                  <span className="font-medium" style={{ color: BRAND.colors.accent }}>So funktioniert's:</span>{' '}
                  Baue deinen Rechner mit npm run build (Vite:{' '}
                  <code
                    className="px-1 rounded text-xs"
                    style={{ backgroundColor: BRAND.colors.border }}
                  >
                    base: './'
                  </code>
                  {' '}für relative Pfade). Zippe den dist-Ordner und lade ihn hier hoch.
                </p>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end p-5 border-t" style={{ borderColor: BRAND.colors.border }}>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadName('');
                  setUploadDescription('');
                  setUploadError(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={uploading}
                className="px-4 py-2.5 rounded-lg transition-colors hover:opacity-70 disabled:opacity-50"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName.trim() || uploading}
                className="px-5 py-2.5 rounded-full font-medium transition-opacity hover:opacity-90
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                {uploading ? (
                  <>
                    <div
                      className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"
                      style={{ borderColor: BRAND.colors.background }}
                    />
                    Wird hochgeladen...
                  </>
                ) : (
                  'Hochladen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Calculator Confirmation Modal */}
      {deleteCustomConfirm && (
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
                Custom-Rechner löschen?
              </h3>
              <p className="text-center text-sm" style={{ color: BRAND.colors.muted }}>
                Der Rechner und alle zugehörigen Dateien werden permanent gelöscht.
              </p>
            </div>
            <div className="flex gap-3 justify-center p-5 border-t" style={{ borderColor: BRAND.colors.border }}>
              <button
                onClick={() => setDeleteCustomConfirm(null)}
                className="px-4 py-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteCustom(deleteCustomConfirm)}
                className="px-5 py-2 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
