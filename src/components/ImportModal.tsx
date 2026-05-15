import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useCalculatorStore } from '../store/calculatorStore';
import { BRAND } from '../../branding/tokens';

interface ImportedData {
  headers: string[];
  rows: Record<string, string | number>[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: Props) {
  const { addBlock, setVariable } = useCalculatorStore();
  const [data, setData] = useState<ImportedData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'variables' | 'inputs'>('variables');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const fileData = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(fileData, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
          defval: '',
        });

        if (jsonData.length === 0) {
          setError('Die Datei enthält keine Daten.');
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setData({ headers, rows: jsonData });
        setSelectedColumns(headers.slice(0, 3));
      } catch (err) {
        console.error('Parse error:', err);
        setError('Fehler beim Lesen der Datei. Stelle sicher, dass es eine gültige Excel- oder CSV-Datei ist.');
      }
    };

    reader.onerror = () => {
      setError('Fehler beim Lesen der Datei.');
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        parseFile(file);
      } else {
        setError('Bitte eine Excel- (.xlsx, .xls) oder CSV-Datei hochladen.');
      }
    }
  }, [parseFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const sanitizeVarName = (name: string) => {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  };

  const hasProblematicName = (name: string) => {
    const sanitized = sanitizeVarName(name);
    return (
      sanitized !== name.toLowerCase() ||
      sanitized.length > 30 ||
      /^\d/.test(sanitized)
    );
  };

  const handleImport = () => {
    if (!data || selectedColumns.length === 0) return;

    if (importMode === 'variables') {
      const firstRow = data.rows[0];
      selectedColumns.forEach((col) => {
        const value = firstRow[col];
        const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        const varName = col.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        setVariable(varName, numValue);
        addBlock('input');
      });
    } else {
      selectedColumns.forEach(() => {
        addBlock('input');
      });
    }

    setData(null);
    setSelectedColumns([]);
    onClose();
  };

  if (!isOpen) return null;

  const inputStyle = {
    backgroundColor: BRAND.colors.background,
    border: `1px solid ${BRAND.colors.border}`,
    color: BRAND.colors.text,
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(15,47,91,0.5)' }}
    >
      <div
        className="rounded-2xl w-full max-w-2xl shadow-2xl"
        style={{ backgroundColor: BRAND.colors.card, border: `1px solid ${BRAND.colors.border}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: `1px solid ${BRAND.colors.border}` }}
        >
          <div>
            <h2 className="text-xl font-semibold" style={{ color: BRAND.colors.text }}>Daten importieren</h2>
            <p className="text-sm mt-1" style={{ color: BRAND.colors.muted }}>Excel (.xlsx) oder CSV-Datei hochladen</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: BRAND.colors.muted }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {!data ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              className="border-2 border-dashed rounded-xl p-12 text-center transition-colors"
              style={{
                borderColor: isDraggingFile ? BRAND.colors.accent : BRAND.colors.border,
                backgroundColor: isDraggingFile ? `rgba(126,200,243,0.05)` : 'transparent',
              }}
            >
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: BRAND.colors.background }}
              >
                <svg className="w-8 h-8" style={{ color: BRAND.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-medium mb-2" style={{ color: BRAND.colors.text }}>
                Datei hierher ziehen
              </p>
              <p className="text-sm mb-4" style={{ color: BRAND.colors.muted }}>
                oder klicken zum Auswählen
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                style={inputStyle}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Datei auswählen
              </label>
              <p className="text-xs mt-4" style={{ color: BRAND.colors.muted }}>
                Unterstuetzt: .xlsx, .xls, .csv
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Import mode selection */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: BRAND.colors.muted }}>Importieren als</label>
                <div className="flex gap-2">
                  {(['variables', 'inputs'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setImportMode(mode)}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: importMode === mode ? BRAND.colors.primary : BRAND.colors.background,
                        color: importMode === mode ? BRAND.colors.background : BRAND.colors.text,
                        border: `1px solid ${importMode === mode ? BRAND.colors.primary : BRAND.colors.border}`,
                      }}
                    >
                      <span className="block">{mode === 'variables' ? 'Variablen' : 'Eingabefelder'}</span>
                      <span className="text-xs opacity-70">
                        {mode === 'variables' ? 'Für Formeln nutzbar' : 'Benutzer kann Werte ändern'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column selection */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: BRAND.colors.muted }}>
                  Gefundene Spalten ({selectedColumns.length} von {data.headers.length} ausgewaehlt)
                </label>
                <div
                  className="space-y-2 max-h-48 overflow-y-auto rounded-lg p-2"
                  style={{ backgroundColor: BRAND.colors.background, border: `1px solid ${BRAND.colors.border}` }}
                >
                  {data.headers.map((header) => {
                    const varName = sanitizeVarName(header);
                    const isSelected = selectedColumns.includes(header);
                    const firstValue = data.rows[0]?.[header];
                    const displayValue = typeof firstValue === 'number'
                      ? firstValue.toLocaleString('de-DE')
                      : String(firstValue).length > 20
                        ? String(firstValue).slice(0, 20) + '...'
                        : String(firstValue);
                    const isProblematic = hasProblematicName(header);

                    return (
                      <label
                        key={header}
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{
                          backgroundColor: isSelected ? `${BRAND.colors.accent}15` : BRAND.colors.card,
                          border: `1px solid ${isSelected ? `${BRAND.colors.accent}50` : BRAND.colors.border}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleColumn(header)}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: BRAND.colors.accent }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate text-sm" style={{ color: BRAND.colors.text }}>
                              {header}
                            </span>
                            {isProblematic && (
                              <span className="px-1.5 py-0.5 text-xs bg-amber-50 text-amber-600 rounded border border-amber-200">
                                wird angepasst
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: BRAND.colors.muted }}>to</span>
                            <code
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                color: isSelected ? BRAND.colors.accent : BRAND.colors.muted,
                                backgroundColor: BRAND.colors.background,
                              }}
                            >
                              {'{' + varName + '}'}
                            </code>
                            <span className="text-xs" style={{ color: BRAND.colors.muted }}>=</span>
                            <span className="text-xs" style={{ color: BRAND.colors.text }}>{displayValue}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Info box */}
              <div
                className="mb-4 p-4 rounded-lg"
                style={{ backgroundColor: BRAND.colors.background, border: `1px solid ${BRAND.colors.border}` }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: BRAND.colors.text }}>So funktioniert der Import:</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: BRAND.colors.accent }}>
                      SPALTENÜBERSCHRIFTEN TO VARIABLEN
                    </p>
                    <p className="text-xs mb-2" style={{ color: BRAND.colors.muted }}>
                      Die Überschriften deiner Tabelle werden automatisch zu Variablennamen:
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <span
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: BRAND.colors.card, color: BRAND.colors.muted, border: `1px solid ${BRAND.colors.border}` }}
                      >
                        "Umsatz pro Monat" to{' '}
                        <span style={{ color: BRAND.colors.accent }}>{'{umsatz_pro_monat}'}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: BRAND.colors.accent }}>IN FORMELN NUTZEN</p>
                    <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                      Verwende die Variablen in Ergebnis-Blöcken:{' '}
                      <code
                        className="px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: BRAND.colors.card, color: BRAND.colors.text, border: `1px solid ${BRAND.colors.border}` }}
                      >
                        {'{umsatz_pro_monat}'} * 12
                      </code>
                    </p>
                  </div>

                  <div className="pt-2" style={{ borderTop: `1px solid ${BRAND.colors.border}` }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#d97706' }}>Tipps:</p>
                    <ul className="text-xs space-y-0.5" style={{ color: BRAND.colors.muted }}>
                      <li>Kurze, beschreibende Spaltennamen nutzen</li>
                      <li>Sonderzeichen werden automatisch entfernt</li>
                      <li>Leerzeichen werden zu Unterstrichen (_)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data preview */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: BRAND.colors.muted }}>Vorschau</label>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${BRAND.colors.border}` }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BRAND.colors.border}`, backgroundColor: BRAND.colors.background }}>
                          {data.headers
                            .filter((h) => selectedColumns.includes(h))
                            .map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left text-xs font-medium"
                                style={{ color: BRAND.colors.muted }}
                              >
                                {header}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.slice(0, 5).map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: i < Math.min(data.rows.length, 5) - 1 ? `1px solid ${BRAND.colors.border}` : 'none',
                            }}
                          >
                            {data.headers
                              .filter((h) => selectedColumns.includes(h))
                              .map((header) => (
                                <td key={header} className="px-3 py-2" style={{ color: BRAND.colors.text }}>
                                  {String(row[header])}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.rows.length > 5 && (
                    <div
                      className="px-3 py-2 text-xs"
                      style={{ color: BRAND.colors.muted, borderTop: `1px solid ${BRAND.colors.border}` }}
                    >
                      ... und {data.rows.length - 5} weitere Zeilen
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => { setData(null); setSelectedColumns([]); setError(null); }}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: BRAND.colors.muted }}
              >
                Andere Datei wählen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div
            className="flex gap-3 justify-end p-5"
            style={{ borderTop: `1px solid ${BRAND.colors.border}` }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: BRAND.colors.muted }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleImport}
              disabled={selectedColumns.length === 0}
              className="px-5 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            >
              {selectedColumns.length} Spalte{selectedColumns.length !== 1 ? 'n' : ''} importieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
