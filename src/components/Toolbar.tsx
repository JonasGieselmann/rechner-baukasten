import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';
import { ImportModal } from './ImportModal';
import { BRAND } from '../../branding/tokens';

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

  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    closeCalculator();
    navigate('/admin');
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
      <div
        className="h-11 flex items-center justify-between px-4 border-b"
        style={{
          backgroundColor: BRAND.colors.card,
          borderColor: BRAND.colors.border,
        }}
      >
        {/* Left: Back + calculator name + dirty indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: BRAND.colors.muted }}
            title="Zur Übersicht"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Übersicht
          </button>

          <div className="w-px h-5" style={{ backgroundColor: BRAND.colors.border }} />

          {calculator && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: BRAND.colors.text }}>
                {calculator.name}
              </span>
              {isDirty ? (
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: BRAND.colors.accent }}
                  title="Ungespeicherte Änderungen"
                />
              ) : (
                <span className="text-xs" style={{ color: BRAND.colors.muted }}>Gespeichert</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        {calculator && (
          <div className="flex items-center gap-2">
            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: isDirty ? `${BRAND.colors.accent}20` : 'transparent',
                color: isDirty ? BRAND.colors.text : BRAND.colors.muted,
                cursor: isDirty ? 'pointer' : 'default',
              }}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  color: BRAND.colors.muted,
                  border: `1px solid ${BRAND.colors.border}`,
                }}
                title="Daten importieren"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Import</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showImportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-50 py-1 min-w-[180px]"
                    style={{
                      backgroundColor: BRAND.colors.card,
                      border: `1px solid ${BRAND.colors.border}`,
                    }}
                  >
                    <label
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors cursor-pointer hover:opacity-80"
                      style={{ color: BRAND.colors.text }}
                    >
                      <svg className="w-4 h-4" style={{ color: BRAND.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <button
                      onClick={() => { setShowImportMenu(false); setShowImportModal(true); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:opacity-80"
                      style={{ color: BRAND.colors.text }}
                    >
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: isPreviewMode ? `${BRAND.colors.accent}20` : 'transparent',
                color: isPreviewMode ? BRAND.colors.text : BRAND.colors.muted,
                border: `1px solid ${isPreviewMode ? BRAND.colors.accent : BRAND.colors.border}`,
              }}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{
                color: BRAND.colors.muted,
                border: `1px solid ${BRAND.colors.border}`,
              }}
              title="Als JSON exportieren"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Embed CTA */}
            <button
              onClick={() => setShowEmbedModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="hidden sm:inline">Embed</span>
            </button>
          </div>
        )}
      </div>

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: `rgba(15,47,91,0.5)` }}
        >
          <div
            className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            style={{ backgroundColor: BRAND.colors.card, border: `1px solid ${BRAND.colors.border}` }}
          >
            <div className="p-5" style={{ borderBottom: `1px solid ${BRAND.colors.border}` }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${BRAND.colors.accent}20` }}
                >
                  <svg className="w-5 h-5" style={{ color: BRAND.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>Embed-Code</h2>
                  <p className="text-xs" style={{ color: BRAND.colors.muted }}>Fügen Sie diesen Code in Ihre Website ein</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <pre
                className="rounded-xl p-4 text-sm font-mono overflow-auto max-h-48"
                style={{
                  backgroundColor: BRAND.colors.background,
                  border: `1px solid ${BRAND.colors.border}`,
                  color: BRAND.colors.text,
                }}
              >
                {getEmbedCode()}
              </pre>

              <div
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: BRAND.colors.background, border: `1px solid ${BRAND.colors.border}` }}
              >
                <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                  <span className="font-medium" style={{ color: BRAND.colors.accent }}>Tipp:</span>{' '}
                  Der Embed-Code funktioniert mit Framer, Webflow, WordPress und allen anderen Websites, die iframes unterstützen.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-5" style={{ borderTop: `1px solid ${BRAND.colors.border}` }}>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2.5 rounded-lg transition-colors hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Schließen
              </button>
              <button
                onClick={copyEmbedCode}
                className="px-5 py-2.5 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: copied ? '#22c55e' : BRAND.colors.primary,
                  color: BRAND.colors.background,
                }}
              >
                {copied ? (
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

      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
    </>
  );
}
