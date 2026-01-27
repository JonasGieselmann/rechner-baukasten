import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';
import { ImportModal } from './ImportModal';
import { useAuth } from './AuthProvider';

export function Toolbar() {
  const navigate = useNavigate();
  const {
    calculator,
    togglePreviewMode,
    isPreviewMode,
    getEmbedCode,
    exportConfig,
    saveCalculator,
    closeCalculator,
    loadCalculator,
    isDirty,
  } = useCalculatorStore();

  const { user, logout } = useAuth();
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBack = () => {
    closeCalculator();
    navigate('/');
  };

  const handleSave = () => {
    saveCalculator();
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadConfig = () => {
    const config = exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${calculator?.name || 'rechner'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        loadCalculator(config);
        // Save to storage after loading
        saveCalculator();
      } catch (err) {
        console.error('Invalid config file:', err);
        alert('Ungültige Konfigurationsdatei');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowImportMenu(false);
  };

  return (
    <>
      <div className="h-14 bg-[#0d0d14] border-b border-[#1f1f2e] flex items-center justify-between px-4">
        {/* Left side: Back button, Logo and Calculator Name */}
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#6b7a90]
                       hover:text-white hover:bg-[#1a1f2e] transition-colors"
            title="Zurück zur Übersicht"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="w-px h-6 bg-[#1a1f2e]" />

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7EC8F3] to-[#5BA8D3] flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-[#0a0a0f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-white hidden sm:block">Rechner-Baukasten</span>
          </button>

          {calculator && (
            <div className="flex items-center gap-2 ml-1">
              <svg className="w-4 h-4 text-[#3a4555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#b8c7d9] font-medium">{calculator.name}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-[#7EC8F3] animate-pulse" title="Ungespeicherte Änderungen" />
              )}
            </div>
          )}
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {calculator && (
            <>
              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isDirty
                    ? 'bg-[#1a1f2e] text-[#7EC8F3] hover:bg-[#2a3142]'
                    : 'bg-[#1a1a24] text-[#4a5565] cursor-default'
                }`}
                title={isDirty ? 'Speichern (Ctrl+S)' : 'Keine Änderungen'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="hidden sm:inline">Speichern</span>
              </button>

              {/* Import Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowImportMenu(!showImportMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium
                             bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a] transition-colors"
                  title="Daten importieren"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Import Dropdown */}
                {showImportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowImportMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-[#1a1a24] border border-[#2a2a3a]
                                    rounded-lg shadow-xl z-50 py-1 min-w-[180px]">
                      {/* JSON Import */}
                      <label
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a3a]
                                   flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        JSON Konfiguration
                        <input
                          ref={jsonInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleJsonImport}
                          className="hidden"
                        />
                      </label>

                      {/* Excel/CSV Import */}
                      <button
                        onClick={() => {
                          setShowImportMenu(false);
                          setShowImportModal(true);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a3a]
                                   flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel / CSV Daten
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Preview Toggle */}
              <button
                onClick={togglePreviewMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isPreviewMode
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 ring-1 ring-green-500/30'
                    : 'bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a]'
                }`}
              >
                {isPreviewMode ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Bearbeiten
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Vorschau
                  </>
                )}
              </button>

              {/* Export */}
              <button
                onClick={downloadConfig}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium
                           bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a] transition-colors"
                title="Als JSON exportieren"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Embed Code */}
              <button
                onClick={() => setShowEmbedModal(true)}
                className="flex items-center gap-2 bg-[#7EC8F3] text-[#0a0a0f] px-4 py-2
                           rounded-lg font-medium hover:bg-[#a6daff] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="hidden sm:inline">Embed</span>
              </button>
            </>
          )}

          {/* User Menu */}
          {user && (
            <div className="relative ml-2">
              <div className="w-px h-6 bg-[#1a1f2e] absolute -left-2 top-1/2 -translate-y-1/2" />
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg
                           text-gray-300 hover:bg-[#1a1f2e] transition-colors"
                title={user.email}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7EC8F3] to-[#5BA8D3]
                                flex items-center justify-center text-[#0a0a0f] font-semibold text-sm">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-[#1a1a24] border border-[#2a2a3a]
                                  rounded-lg shadow-xl z-50 py-1 min-w-[200px]">
                    {/* User Info */}
                    <div className="px-3 py-2 border-b border-[#2a2a3a]">
                      <p className="text-xs text-gray-500">Angemeldet als</p>
                      <p className="text-sm text-white font-medium truncate">{user.email}</p>
                    </div>

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#2a2a3a]
                                 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Abmelden
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
                  <p className="text-xs text-gray-500">Füge diesen Code in deine Website ein</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <pre className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl p-4
                            text-sm text-gray-300 font-mono overflow-auto max-h-48">
                {getEmbedCode()}
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
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={copyEmbedCode}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#7EC8F3] text-[#0a0a0f] hover:bg-[#a6daff]'
                }`}
              >
                {copied ? (
                  <>
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Kopiert!
                    </span>
                  </>
                ) : (
                  'Code kopieren'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
    </>
  );
}
