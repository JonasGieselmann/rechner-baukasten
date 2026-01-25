import { useState } from 'react';
import { useCalculatorStore } from '../store/calculatorStore';

export function Toolbar() {
  const {
    calculator,
    createNewCalculator,
    togglePreviewMode,
    isPreviewMode,
    getEmbedCode,
    exportConfig,
  } = useCalculatorStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      createNewCalculator(newName.trim());
      setNewName('');
      setShowNewModal(false);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
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

  return (
    <>
      <div className="h-14 bg-[#0d0d14] border-b border-[#1f1f2e] flex items-center justify-between px-4">
        {/* Left side: Logo and Calculator Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-[#7EC8F3]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="font-semibold text-white">Rechner-Baukasten</span>
          </div>

          {calculator && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-gray-500">/</span>
              <span className="text-gray-300">{calculator.name}</span>
            </div>
          )}
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {!calculator ? (
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-[#7EC8F3] text-[#0a0a0f] px-4 py-2
                         rounded-lg font-medium hover:bg-[#a6daff] transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Neuer Rechner
            </button>
          ) : (
            <>
              {/* Preview Toggle */}
              <button
                onClick={togglePreviewMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                           transition-colors ${
                             isPreviewMode
                               ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                               : 'bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a]'
                           }`}
              >
                {isPreviewMode ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Bearbeiten
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Vorschau
                  </>
                )}
              </button>

              {/* Export */}
              <button
                onClick={downloadConfig}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                           bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </button>

              {/* Embed Code */}
              <button
                onClick={() => setShowEmbedModal(true)}
                className="flex items-center gap-2 bg-[#7EC8F3] text-[#0a0a0f] px-4 py-2
                           rounded-lg font-medium hover:bg-[#a6daff] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Embed-Code
              </button>
            </>
          )}
        </div>
      </div>

      {/* New Calculator Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#12121a] rounded-2xl p-6 w-full max-w-md border border-[#1f1f2e]">
            <h2 className="text-xl font-semibold mb-4">Neuer Rechner</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name des Rechners"
              autoFocus
              className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-4 py-3
                         text-white focus:border-[#7EC8F3] focus:ring-1 focus:ring-[#7EC8F3]/30
                         outline-none transition-all mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 rounded-lg bg-[#7EC8F3] text-[#0a0a0f] font-medium
                           hover:bg-[#a6daff] transition-colors disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#12121a] rounded-2xl p-6 w-full max-w-lg border border-[#1f1f2e]">
            <h2 className="text-xl font-semibold mb-4">Embed-Code</h2>
            <p className="text-gray-400 text-sm mb-4">
              Kopiere diesen Code, um den Rechner in deine Website einzubinden.
            </p>
            <pre className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-4
                          text-sm text-gray-300 font-mono overflow-auto mb-4">
              {getEmbedCode()}
            </pre>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={() => {
                  copyEmbedCode();
                  setShowEmbedModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#7EC8F3] text-[#0a0a0f] font-medium
                           hover:bg-[#a6daff] transition-colors"
              >
                Code kopieren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
