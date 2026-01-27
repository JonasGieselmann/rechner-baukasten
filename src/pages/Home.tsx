import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';

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

// API base URL - different in dev vs production
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export function Home() {
  const navigate = useNavigate();
  const { savedCalculators, loadSavedCalculators, createNewCalculator, deleteCalculator } =
    useCalculatorStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteCustomConfirm, setDeleteCustomConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('builder');
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
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

  return (
    <div className="min-h-screen bg-[#04070d]">
      {/* Header */}
      <header className="border-b border-[#1a1f2e] bg-[#0a0d12]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7EC8F3] to-[#5BA3D9] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Kalku</h1>
                <p className="text-xs text-[#6b7a90]">Interaktive Rechner erstellen</p>
              </div>
            </div>
            {activeTab === 'builder' && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#7EC8F3] text-[#0a0a0f] rounded-lg
                           font-medium hover:bg-[#a6daff] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuer Rechner
              </button>
            )}
            {activeTab === 'custom' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#7EC8F3] text-[#0a0a0f] rounded-lg
                           font-medium hover:bg-[#a6daff] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Hochladen
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'builder'
                  ? 'text-[#7EC8F3] border-[#7EC8F3]'
                  : 'text-[#6b7a90] border-transparent hover:text-white'
              }`}
            >
              Builder-Rechner
              {savedCalculators.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-[#1a1f2e]">
                  {savedCalculators.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'custom'
                  ? 'text-[#7EC8F3] border-[#7EC8F3]'
                  : 'text-[#6b7a90] border-transparent hover:text-white'
              }`}
            >
              Custom-Rechner
              {customCalculators.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-[#1a1f2e]">
                  {customCalculators.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'builder' && (
          <>
            {savedCalculators.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 rounded-2xl bg-[#10131c] border border-[#1a1f2e] flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-[#3a4555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Noch keine Rechner</h2>
                <p className="text-[#6b7a90] mb-6 text-center max-w-md">
                  Erstelle deinen ersten interaktiven Rechner mit dem Baukasten-Editor.
                </p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-[#7EC8F3] text-[#0a0a0f] rounded-xl
                             font-medium hover:bg-[#a6daff] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ersten Rechner erstellen
                </button>
              </div>
            ) : (
              // Calculator grid
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Deine Rechner ({savedCalculators.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedCalculators
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((calc) => (
                      <div
                        key={calc.id}
                        className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] hover:border-[#2a3142]
                                   transition-all group"
                      >
                        <div
                          className="p-5 cursor-pointer"
                          onClick={() => navigate(`/editor/${calc.id}`)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[#1a1f2e] flex items-center justify-center">
                              <svg className="w-5 h-5 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(calc.id);
                              }}
                              className="p-2 text-[#6b7a90] hover:text-red-400 hover:bg-[#1a1f2e]
                                         rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <h3 className="font-semibold text-white mb-1 group-hover:text-[#7EC8F3] transition-colors">
                            {calc.name}
                          </h3>
                          <p className="text-sm text-[#6b7a90] mb-3">
                            {calc.blocks.length} Block{calc.blocks.length !== 1 ? 's' : ''}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#4a5565]">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDate(calc.updatedAt)}
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
                                       bg-[#1a1f2e] text-[#6b7a90] hover:text-[#7EC8F3] hover:bg-[#2a3142]
                                       text-sm transition-colors"
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
              </div>
            )}
          </>
        )}

        {activeTab === 'custom' && (
          <>
            {customCalculators.length === 0 ? (
              // Empty state for custom calculators
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 rounded-2xl bg-[#10131c] border border-[#1a1f2e] flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-[#3a4555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Keine Custom-Rechner</h2>
                <p className="text-[#6b7a90] mb-6 text-center max-w-md">
                  Lade deinen fertigen Rechner als ZIP-Datei hoch und hoste ihn hier.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-[#7EC8F3] text-[#0a0a0f] rounded-xl
                             font-medium hover:bg-[#a6daff] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Rechner hochladen
                </button>
              </div>
            ) : (
              // Custom calculator grid
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Custom-Rechner ({customCalculators.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customCalculators.map((calc) => (
                    <div
                      key={calc.id}
                      className="bg-[#10131c] rounded-2xl border border-[#1a1f2e] hover:border-[#2a3142]
                                 transition-all group"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              calc.active
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {calc.active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                            <button
                              onClick={() => setDeleteCustomConfirm(calc.slug)}
                              className="p-1.5 text-[#6b7a90] hover:text-red-400 hover:bg-[#1a1f2e]
                                         rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-white mb-1 group-hover:text-[#7EC8F3] transition-colors">
                          {calc.name}
                        </h3>
                        <p className="text-sm text-[#6b7a90] mb-3 line-clamp-2">
                          {calc.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#4a5565]">
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
                                     bg-[#1a1f2e] text-[#6b7a90] hover:text-white hover:bg-[#2a3142]
                                     text-sm transition-colors"
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
                                     bg-[#7EC8F3]/10 text-[#7EC8F3] hover:bg-[#7EC8F3]/20
                                     text-sm transition-colors"
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
              </div>
            )}
          </>
        )}
      </main>

      {/* New Calculator Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] rounded-2xl w-full max-w-md border border-[#1f1f2e] shadow-2xl">
            <div className="p-5 border-b border-[#1f1f2e]">
              <h2 className="text-lg font-semibold text-white">Neuen Rechner erstellen</h2>
            </div>
            <div className="p-5">
              <label className="block text-sm text-[#b8c7d9] mb-2">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="z.B. ROI Rechner"
                className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white
                           border border-[#2a3142] focus:border-[#7EC8F3] focus:ring-1
                           focus:ring-[#7EC8F3]/30 outline-none transition-all"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end p-5 border-t border-[#1f1f2e]">
              <button
                onClick={() => { setShowNewModal(false); setNewName(''); }}
                className="px-4 py-2 rounded-lg text-[#b8c7d9] hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-5 py-2 rounded-lg bg-[#7EC8F3] text-[#0a0a0f] font-medium
                           hover:bg-[#a6daff] transition-colors disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] rounded-2xl w-full max-w-sm border border-[#1f1f2e] shadow-2xl">
            <div className="p-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white text-center mb-2">
                Rechner löschen?
              </h3>
              <p className="text-[#6b7a90] text-center text-sm">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
            <div className="flex gap-3 justify-center p-5 border-t border-[#1f1f2e]">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-[#b8c7d9] hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2 rounded-lg bg-red-500 text-white font-medium
                           hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] rounded-2xl w-full max-w-lg border border-[#1f1f2e] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1f1f2e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7EC8F3]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Embed-Code</h2>
                  <p className="text-xs text-gray-500">{showEmbedModal.name}</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <pre className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl p-4
                            text-sm text-gray-300 font-mono overflow-auto max-h-48">
                {getEmbedCode(showEmbedModal.type, showEmbedModal.id)}
              </pre>

              <div className="mt-4 p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
                <p className="text-xs text-gray-400">
                  <span className="text-[#7EC8F3] font-medium">Tipp:</span> Der Embed-Code funktioniert mit
                  Framer, Webflow, WordPress und allen anderen Websites, die iframes unterstützen.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-5 border-t border-[#1f1f2e]">
              <button
                onClick={() => { setShowEmbedModal(null); setEmbedCopied(false); }}
                className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={copyEmbedCode}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  embedCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#7EC8F3] text-[#0a0a0f] hover:bg-[#a6daff]'
                }`}
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] rounded-2xl w-full max-w-lg border border-[#1f1f2e] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1f1f2e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7EC8F3]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Custom-Rechner hochladen</h2>
                  <p className="text-xs text-gray-500">ZIP-Datei mit index.html</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm text-[#b8c7d9] mb-2">ZIP-Datei *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setUploadFile(file || null);
                    if (file && !uploadName) {
                      // Auto-fill name from filename
                      const name = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
                      setUploadName(name.charAt(0).toUpperCase() + name.slice(1));
                    }
                  }}
                  className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white
                             border border-[#2a3142] focus:border-[#7EC8F3] focus:ring-1
                             focus:ring-[#7EC8F3]/30 outline-none transition-all
                             file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                             file:bg-[#7EC8F3]/20 file:text-[#7EC8F3] file:font-medium
                             file:cursor-pointer hover:file:bg-[#7EC8F3]/30"
                />
                <p className="text-xs text-[#6b7a90] mt-1">
                  Die ZIP-Datei muss eine index.html enthalten (max. 50MB)
                </p>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm text-[#b8c7d9] mb-2">Name *</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="z.B. ROI Rechner"
                  className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white
                             border border-[#2a3142] focus:border-[#7EC8F3] focus:ring-1
                             focus:ring-[#7EC8F3]/30 outline-none transition-all"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm text-[#b8c7d9] mb-2">Beschreibung</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Kurze Beschreibung des Rechners..."
                  rows={2}
                  className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white
                             border border-[#2a3142] focus:border-[#7EC8F3] focus:ring-1
                             focus:ring-[#7EC8F3]/30 outline-none transition-all resize-none"
                />
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#b8c7d9] mb-2">Breite</label>
                  <input
                    type="text"
                    value={uploadWidth}
                    onChange={(e) => setUploadWidth(e.target.value)}
                    placeholder="100%"
                    className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white
                               border border-[#2a3142] focus:border-[#7EC8F3] focus:ring-1
                               focus:ring-[#7EC8F3]/30 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#b8c7d9] mb-2">Höhe</label>
                  <input
                    type="text"
                    value={uploadHeight}
                    onChange={(e) => setUploadHeight(e.target.value)}
                    placeholder="800px"
                    className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white
                               border border-[#2a3142] focus:border-[#7EC8F3] focus:ring-1
                               focus:ring-[#7EC8F3]/30 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-[#1a1a24] rounded-lg border border-[#2a2a3a]">
                <p className="text-xs text-gray-400">
                  <span className="text-[#7EC8F3] font-medium">So funktioniert's:</span> Baue deinen Rechner
                  mit npm run build (Vite: <code className="bg-[#2a2a3a] px-1 rounded">base: './'</code>
                  für relative Pfade). Zippe den dist-Ordner und lade ihn hier hoch.
                </p>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{uploadError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end p-5 border-t border-[#1f1f2e]">
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
                className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName.trim() || uploading}
                className="px-5 py-2.5 rounded-lg bg-[#7EC8F3] text-[#0a0a0f] font-medium
                           hover:bg-[#a6daff] transition-colors disabled:opacity-50
                           disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0a0a0f] border-t-transparent" />
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] rounded-2xl w-full max-w-sm border border-[#1f1f2e] shadow-2xl">
            <div className="p-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white text-center mb-2">
                Custom-Rechner löschen?
              </h3>
              <p className="text-[#6b7a90] text-center text-sm">
                Der Rechner und alle zugehörigen Dateien werden permanent gelöscht.
              </p>
            </div>
            <div className="flex gap-3 justify-center p-5 border-t border-[#1f1f2e]">
              <button
                onClick={() => setDeleteCustomConfirm(null)}
                className="px-4 py-2 rounded-lg text-[#b8c7d9] hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteCustom(deleteCustomConfirm)}
                className="px-5 py-2 rounded-lg bg-red-500 text-white font-medium
                           hover:bg-red-600 transition-colors"
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
