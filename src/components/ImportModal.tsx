import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useCalculatorStore } from '../store/calculatorStore';

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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
          defval: '',
        });

        if (jsonData.length === 0) {
          setError('Die Datei enthält keine Daten.');
          return;
        }

        // Get headers from first row keys
        const headers = Object.keys(jsonData[0]);

        setData({
          headers,
          rows: jsonData,
        });
        setSelectedColumns(headers.slice(0, 3)); // Select first 3 columns by default
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
    setIsDragging(false);

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
    // Check if name has special characters or is too long
    const sanitized = sanitizeVarName(name);
    return (
      sanitized !== name.toLowerCase() || // Has special characters
      sanitized.length > 30 || // Too long
      /^\d/.test(sanitized) // Starts with number
    );
  };

  const handleImport = () => {
    if (!data || selectedColumns.length === 0) return;

    if (importMode === 'variables') {
      // Import as variables (use first row values)
      const firstRow = data.rows[0];
      selectedColumns.forEach((col) => {
        const value = firstRow[col];
        const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        const varName = col.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        setVariable(varName, numValue);

        // Also create an input block for each variable
        addBlock('input');
      });
    } else {
      // Import as input blocks
      selectedColumns.forEach(() => {
        // Create input block (the store will handle variable creation)
        addBlock('input');
        // Note: We'd need to update the last added block with the column name
        // For now, just create the blocks
      });
    }

    // Reset and close
    setData(null);
    setSelectedColumns([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] rounded-2xl w-full max-w-2xl border border-[#1f1f2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1f1f2e]">
          <div>
            <h2 className="text-xl font-semibold text-white">Daten importieren</h2>
            <p className="text-sm text-gray-500 mt-1">Excel (.xlsx) oder CSV-Datei hochladen</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-[#2a2a3a] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {!data ? (
            // File upload area
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? 'border-[#7EC8F3] bg-[#7EC8F3]/5'
                  : 'border-[#2a2a3a] hover:border-[#3a3a4a]'
              }`}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a24] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-white font-medium mb-2">
                Datei hierher ziehen
              </p>
              <p className="text-gray-500 text-sm mb-4">
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a24] text-white
                           rounded-lg cursor-pointer hover:bg-[#2a2a3a] transition-colors
                           border border-[#2a2a3a]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Datei auswählen
              </label>
              <p className="text-xs text-gray-600 mt-4">
                Unterstützt: .xlsx, .xls, .csv
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          ) : (
            // Data preview and column selection
            <div>
              {/* Import mode selection */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-2">Importieren als</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportMode('variables')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                      importMode === 'variables'
                        ? 'bg-[#7EC8F3] text-[#0a0a0f] border-[#7EC8F3]'
                        : 'bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a] border-[#2a2a3a]'
                    }`}
                  >
                    <span className="block">Variablen</span>
                    <span className={`text-xs ${importMode === 'variables' ? 'text-[#0a0a0f]/70' : 'text-gray-500'}`}>
                      Für Formeln nutzbar
                    </span>
                  </button>
                  <button
                    onClick={() => setImportMode('inputs')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                      importMode === 'inputs'
                        ? 'bg-[#7EC8F3] text-[#0a0a0f] border-[#7EC8F3]'
                        : 'bg-[#1a1a24] text-gray-300 hover:bg-[#2a2a3a] border-[#2a2a3a]'
                    }`}
                  >
                    <span className="block">Eingabefelder</span>
                    <span className={`text-xs ${importMode === 'inputs' ? 'text-[#0a0a0f]/70' : 'text-gray-500'}`}>
                      Benutzer kann Werte ändern
                    </span>
                  </button>
                </div>
              </div>

              {/* Column selection with live preview */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Gefundene Spalten ({selectedColumns.length} von {data.headers.length} ausgewählt)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-[#0d0d14] rounded-lg border border-[#2a2a3a] p-2">
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
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#7EC8F3]/10 border border-[#7EC8F3]/30'
                            : 'bg-[#1a1a24] border border-transparent hover:border-[#2a3142]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleColumn(header)}
                          className="w-4 h-4 rounded border-[#3a4555] bg-[#1a1a24] text-[#7EC8F3]
                                     focus:ring-[#7EC8F3] focus:ring-offset-0 focus:ring-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                              {header}
                            </span>
                            {isProblematic && (
                              <span className="px-1.5 py-0.5 text-xs bg-amber-500/10 text-amber-400 rounded">
                                wird angepasst
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">→</span>
                            <code className={`text-xs px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-[#7EC8F3]/20 text-[#7EC8F3]' : 'bg-[#2a2a3a] text-gray-400'
                            }`}>
                              {'{' + varName + '}'}
                            </code>
                            <span className="text-xs text-gray-500">=</span>
                            <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                              {displayValue}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Info box about how import works */}
              <div className="mb-4 p-4 bg-[#0d0d14] border border-[#2a2a3a] rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">So funktioniert der Import:</span>
                </div>

                <div className="space-y-3">
                  {/* Column to Variable */}
                  <div>
                    <p className="text-xs text-[#7EC8F3] font-medium mb-1.5">SPALTENÜBERSCHRIFTEN → VARIABLEN</p>
                    <p className="text-xs text-gray-400 mb-2">
                      Die Überschriften deiner Tabelle werden automatisch zu Variablennamen:
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <span className="px-2 py-1 bg-[#1a1a24] rounded text-gray-400">
                        "Umsatz pro Monat" → <span className="text-[#7EC8F3]">{'{umsatz_pro_monat}'}</span>
                      </span>
                      <span className="px-2 py-1 bg-[#1a1a24] rounded text-gray-400">
                        "Preis (EUR)" → <span className="text-[#7EC8F3]">{'{preis_eur}'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Using in formulas */}
                  <div>
                    <p className="text-xs text-[#7EC8F3] font-medium mb-1.5">IN FORMELN NUTZEN</p>
                    <p className="text-xs text-gray-400">
                      Verwende die Variablen in Ergebnis-Blöcken:{' '}
                      <code className="px-1.5 py-0.5 bg-[#1a1a24] rounded text-white">
                        {'{umsatz_pro_monat}'} * 12
                      </code>
                    </p>
                  </div>

                  {/* Tips */}
                  <div className="pt-2 border-t border-[#2a2a3a]">
                    <p className="text-xs text-amber-400 font-medium mb-1">Tipps:</p>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      <li>• Kurze, beschreibende Spaltennamen nutzen</li>
                      <li>• Sonderzeichen werden automatisch entfernt</li>
                      <li>• Leerzeichen werden zu Unterstrichen (_)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data preview */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-2">Vorschau</label>
                <div className="bg-[#1a1a24] rounded-lg border border-[#2a2a3a] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2a2a3a]">
                          {data.headers
                            .filter((h) => selectedColumns.includes(h))
                            .map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-400"
                              >
                                {header}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-[#2a2a3a] last:border-0">
                            {data.headers
                              .filter((h) => selectedColumns.includes(h))
                              .map((header) => (
                                <td key={header} className="px-3 py-2 text-white">
                                  {String(row[header])}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.rows.length > 5 && (
                    <div className="px-3 py-2 text-xs text-gray-500 border-t border-[#2a2a3a]">
                      ... und {data.rows.length - 5} weitere Zeilen
                    </div>
                  )}
                </div>
              </div>

              {/* Reset button */}
              <button
                onClick={() => { setData(null); setSelectedColumns([]); setError(null); }}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Andere Datei wählen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="flex gap-3 justify-end p-5 border-t border-[#1f1f2e]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleImport}
              disabled={selectedColumns.length === 0}
              className="px-5 py-2 rounded-lg bg-[#7EC8F3] text-[#0a0a0f] font-medium
                         hover:bg-[#a6daff] transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed"
            >
              {selectedColumns.length} Spalte{selectedColumns.length !== 1 ? 'n' : ''} importieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
