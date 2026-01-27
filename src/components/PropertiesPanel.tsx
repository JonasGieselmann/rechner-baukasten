import { nanoid } from 'nanoid';
import { useCalculatorStore } from '../store/calculatorStore';
import type {
  Block,
  TextBlock,
  InputBlock,
  SliderBlock,
  ResultBlock,
  ChartBlock,
  ComparisonBlock,
  ComparisonRow,
} from '../types';

export function PropertiesPanel() {
  const { calculator, selectedBlockId, updateBlock, isPreviewMode, variables } =
    useCalculatorStore();

  // Get list of available variables for dropdowns
  const availableVariables = Object.keys(variables);

  if (isPreviewMode) {
    return (
      <div className="w-80 bg-[#0d0d14] border-l border-[#1f1f2e] p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white">Vorschau-Modus</p>
          <p className="text-xs mt-1">Teste deinen Rechner live</p>
        </div>
      </div>
    );
  }

  if (!calculator || !selectedBlockId) {
    return (
      <div className="w-80 bg-[#0d0d14] border-l border-[#1f1f2e] p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a24] flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white">Kein Block ausgewählt</p>
          <p className="text-xs mt-1">Klicke auf einen Block zum Bearbeiten</p>
        </div>
      </div>
    );
  }

  const block = calculator.blocks.find((b) => b.id === selectedBlockId);
  if (!block) return null;

  // Block type labels
  const blockTypeLabels: Record<string, string> = {
    text: 'Text',
    input: 'Eingabefeld',
    slider: 'Slider',
    result: 'Ergebnis',
    chart: 'Diagramm',
    comparison: 'Vergleich',
  };

  return (
    <div className="w-80 bg-[#0d0d14] border-l border-[#1f1f2e] overflow-auto">
      <div className="p-4 border-b border-[#1f1f2e]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#7EC8F3]" />
          <h2 className="text-sm font-semibold text-white">Eigenschaften</h2>
        </div>
        <p className="text-xs text-gray-500 ml-4">
          {blockTypeLabels[block.type] || block.type}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {renderBlockProperties(block, updateBlock, availableVariables)}
      </div>

      {/* Variable reference help */}
      {availableVariables.length > 0 && (
        <div className="p-4 border-t border-[#1f1f2e]">
          <p className="text-xs text-gray-500 mb-2">Verfügbare Variablen:</p>
          <div className="flex flex-wrap gap-1">
            {availableVariables.map((v) => (
              <code
                key={v}
                className="text-xs bg-[#1a1a24] text-[#7EC8F3] px-2 py-0.5 rounded cursor-pointer
                           hover:bg-[#2a2a3a] transition-colors"
                onClick={() => navigator.clipboard.writeText(`{${v}}`)}
                title="Klicken zum Kopieren"
              >
                {`{${v}}`}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderBlockProperties(
  block: Block,
  updateBlock: (id: string, updates: Partial<Block>) => void,
  availableVariables: string[]
) {
  switch (block.type) {
    case 'text':
      return <TextProperties block={block} updateBlock={updateBlock} />;
    case 'input':
      return <InputProperties block={block} updateBlock={updateBlock} />;
    case 'slider':
      return <SliderProperties block={block} updateBlock={updateBlock} />;
    case 'result':
      return <ResultProperties block={block} updateBlock={updateBlock} availableVariables={availableVariables} />;
    case 'chart':
      return <ChartProperties block={block} updateBlock={updateBlock} availableVariables={availableVariables} />;
    case 'comparison':
      return <ComparisonProperties block={block} updateBlock={updateBlock} availableVariables={availableVariables} />;
    default:
      return null;
  }
}

// Property Input Components
function PropertyInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2.5
                   text-white text-sm focus:border-[#7EC8F3] focus:ring-1
                   focus:ring-[#7EC8F3]/30 outline-none transition-all"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function PropertySelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2.5
                   text-white text-sm focus:border-[#7EC8F3] focus:ring-1
                   focus:ring-[#7EC8F3]/30 outline-none transition-all cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Variable selector with quick insert
function VariableSelector({
  label,
  value,
  onChange,
  availableVariables,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  availableVariables: string[];
  placeholder?: string;
}) {
  const insertVariable = (varName: string) => {
    onChange(value + `{${varName}}`);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2.5
                   text-white text-sm font-mono focus:border-[#7EC8F3] focus:ring-1
                   focus:ring-[#7EC8F3]/30 outline-none transition-all resize-none"
      />
      {availableVariables.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {availableVariables.map((v) => (
            <button
              key={v}
              onClick={() => insertVariable(v)}
              className="text-xs bg-[#1a1a24] text-[#7EC8F3] px-2 py-1 rounded
                         hover:bg-[#2a2a3a] border border-[#2a2a3a] transition-colors"
            >
              + {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Block-specific property editors
function TextProperties({
  block,
  updateBlock,
}: {
  block: TextBlock;
  updateBlock: (id: string, updates: Partial<TextBlock>) => void;
}) {
  return (
    <>
      <PropertyInput
        label="Inhalt"
        value={block.content}
        onChange={(v) => updateBlock(block.id, { content: v })}
      />
      <PropertySelect
        label="Größe"
        value={block.size}
        onChange={(v) => updateBlock(block.id, { size: v as TextBlock['size'] })}
        options={[
          { value: 'h1', label: 'Überschrift 1 (groß)' },
          { value: 'h2', label: 'Überschrift 2 (mittel)' },
          { value: 'h3', label: 'Überschrift 3 (klein)' },
          { value: 'body', label: 'Fließtext' },
        ]}
      />
    </>
  );
}

function InputProperties({
  block,
  updateBlock,
}: {
  block: InputBlock;
  updateBlock: (id: string, updates: Partial<InputBlock>) => void;
}) {
  return (
    <>
      <PropertyInput
        label="Label"
        value={block.label}
        onChange={(v) => updateBlock(block.id, { label: v })}
        placeholder="z.B. Monatliche Leads"
      />
      <PropertyInput
        label="Variablenname"
        value={block.variableName}
        onChange={(v) => updateBlock(block.id, { variableName: v.replace(/[^a-zA-Z0-9_]/g, '') })}
        placeholder="z.B. leads"
        hint="Nur Buchstaben, Zahlen und Unterstriche"
      />
      <PropertyInput
        label="Standardwert"
        value={block.defaultValue}
        type="number"
        onChange={(v) => updateBlock(block.id, { defaultValue: Number(v) || 0 })}
      />
      <div className="grid grid-cols-2 gap-3">
        <PropertyInput
          label="Minimum"
          value={block.min}
          type="number"
          onChange={(v) => updateBlock(block.id, { min: Number(v) || 0 })}
        />
        <PropertyInput
          label="Maximum"
          value={block.max}
          type="number"
          onChange={(v) => updateBlock(block.id, { max: Number(v) || 100 })}
        />
      </div>
      <PropertyInput
        label="Suffix"
        value={block.suffix}
        onChange={(v) => updateBlock(block.id, { suffix: v })}
        placeholder="z.B. €, %, Stück"
      />
    </>
  );
}

function SliderProperties({
  block,
  updateBlock,
}: {
  block: SliderBlock;
  updateBlock: (id: string, updates: Partial<SliderBlock>) => void;
}) {
  return (
    <>
      <PropertyInput
        label="Label"
        value={block.label}
        onChange={(v) => updateBlock(block.id, { label: v })}
        placeholder="z.B. Conversion Rate"
      />
      <PropertyInput
        label="Variablenname"
        value={block.variableName}
        onChange={(v) => updateBlock(block.id, { variableName: v.replace(/[^a-zA-Z0-9_]/g, '') })}
        placeholder="z.B. conversion"
        hint="Referenziere mit {'{variablenname}'}"
      />
      <PropertyInput
        label="Standardwert"
        value={block.defaultValue}
        type="number"
        onChange={(v) => updateBlock(block.id, { defaultValue: Number(v) || 0 })}
      />
      <div className="grid grid-cols-3 gap-2">
        <PropertyInput
          label="Min"
          value={block.min}
          type="number"
          onChange={(v) => updateBlock(block.id, { min: Number(v) || 0 })}
        />
        <PropertyInput
          label="Max"
          value={block.max}
          type="number"
          onChange={(v) => updateBlock(block.id, { max: Number(v) || 100 })}
        />
        <PropertyInput
          label="Schritt"
          value={block.step}
          type="number"
          onChange={(v) => updateBlock(block.id, { step: Number(v) || 1 })}
        />
      </div>
      <PropertyInput
        label="Suffix"
        value={block.suffix}
        onChange={(v) => updateBlock(block.id, { suffix: v })}
        placeholder="z.B. %"
      />
    </>
  );
}

function ResultProperties({
  block,
  updateBlock,
  availableVariables,
}: {
  block: ResultBlock;
  updateBlock: (id: string, updates: Partial<ResultBlock>) => void;
  availableVariables: string[];
}) {
  return (
    <>
      <PropertyInput
        label="Label"
        value={block.label}
        onChange={(v) => updateBlock(block.id, { label: v })}
        placeholder="z.B. Monatlicher Umsatz"
      />
      <VariableSelector
        label="Formel"
        value={block.formula}
        onChange={(v) => updateBlock(block.id, { formula: v })}
        availableVariables={availableVariables}
        placeholder="{leads} * {conversion} / 100 * {price}"
      />
      <PropertySelect
        label="Format"
        value={block.format}
        onChange={(v) => updateBlock(block.id, { format: v as ResultBlock['format'] })}
        options={[
          { value: 'number', label: 'Zahl (1.234)' },
          { value: 'currency', label: 'Währung (1.234 €)' },
          { value: 'percent', label: 'Prozent (12%)' },
        ]}
      />
      <PropertySelect
        label="Größe"
        value={block.size}
        onChange={(v) => updateBlock(block.id, { size: v as ResultBlock['size'] })}
        options={[
          { value: 'small', label: 'Klein' },
          { value: 'medium', label: 'Mittel' },
          { value: 'large', label: 'Groß' },
        ]}
      />
      <PropertySelect
        label="Farbe"
        value={block.color}
        onChange={(v) => updateBlock(block.id, { color: v as ResultBlock['color'] })}
        options={[
          { value: 'default', label: 'Standard (Weiß)' },
          { value: 'accent', label: 'Akzent (Blau)' },
          { value: 'success', label: 'Erfolg (Grün)' },
          { value: 'warning', label: 'Warnung (Gelb)' },
        ]}
      />
    </>
  );
}

function ChartProperties({
  block,
  updateBlock,
  availableVariables,
}: {
  block: ChartBlock;
  updateBlock: (id: string, updates: Partial<ChartBlock>) => void;
  availableVariables: string[];
}) {
  // Parse current dataFormula to get before and after values
  const parts = block.dataFormula.split(':');
  const beforeFormula = parts[0] || '';
  const afterFormula = parts[1] || '';

  const updateFormulas = (before: string, after: string) => {
    updateBlock(block.id, { dataFormula: `${before}:${after}` });
  };

  return (
    <>
      <PropertyInput
        label="Titel"
        value={block.title}
        onChange={(v) => updateBlock(block.id, { title: v })}
        placeholder="z.B. Umsatzentwicklung"
      />

      <div className="bg-[#1a1a24] rounded-lg p-3 border border-[#2a2a3a] space-y-3">
        <p className="text-xs font-medium text-gray-400">Datenquellen</p>

        {/* Before value selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Vorher-Wert (Basis)</label>
          <div className="flex gap-2">
            <select
              value={availableVariables.includes(beforeFormula.replace(/[{}]/g, '')) ? beforeFormula : '_custom'}
              onChange={(e) => {
                if (e.target.value !== '_custom') {
                  updateFormulas(`{${e.target.value}}`, afterFormula);
                }
              }}
              className="flex-1 bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                         text-white text-xs outline-none focus:border-[#7EC8F3]"
            >
              <option value="_custom">Formel eingeben...</option>
              {availableVariables.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <input
            value={beforeFormula}
            onChange={(e) => updateFormulas(e.target.value, afterFormula)}
            placeholder="z.B. {umsatz_alt} oder 1000"
            className="w-full mt-1 bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                       text-white text-xs font-mono outline-none focus:border-[#7EC8F3]"
          />
        </div>

        {/* After value selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nachher-Wert (Ergebnis)</label>
          <div className="flex gap-2">
            <select
              value={availableVariables.includes(afterFormula.replace(/[{}]/g, '')) ? afterFormula : '_custom'}
              onChange={(e) => {
                if (e.target.value !== '_custom') {
                  updateFormulas(beforeFormula, `{${e.target.value}}`);
                }
              }}
              className="flex-1 bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                         text-white text-xs outline-none focus:border-[#7EC8F3]"
            >
              <option value="_custom">Formel eingeben...</option>
              {availableVariables.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <input
            value={afterFormula}
            onChange={(e) => updateFormulas(beforeFormula, e.target.value)}
            placeholder="z.B. {umsatz_neu} oder {leads}*100"
            className="w-full mt-1 bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                       text-white text-xs font-mono outline-none focus:border-[#7EC8F3]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PropertyInput
          label="Vorher-Label"
          value={block.beforeLabel}
          onChange={(v) => updateBlock(block.id, { beforeLabel: v })}
          placeholder="Aktuell"
        />
        <PropertyInput
          label="Nachher-Label"
          value={block.afterLabel}
          onChange={(v) => updateBlock(block.id, { afterLabel: v })}
          placeholder="Mit Lösung"
        />
      </div>
    </>
  );
}

function ComparisonProperties({
  block,
  updateBlock,
  availableVariables,
}: {
  block: ComparisonBlock;
  updateBlock: (id: string, updates: Partial<ComparisonBlock>) => void;
  availableVariables: string[];
}) {
  const addRow = () => {
    const newRow: ComparisonRow = {
      id: nanoid(),
      label: 'Neuer Wert',
      beforeFormula: '0',
      afterFormula: '0',
      format: 'number',
    };
    updateBlock(block.id, { rows: [...block.rows, newRow] });
  };

  const updateRow = (rowId: string, updates: Partial<ComparisonRow>) => {
    const updatedRows = block.rows.map((row) =>
      row.id === rowId ? { ...row, ...updates } : row
    );
    updateBlock(block.id, { rows: updatedRows });
  };

  const deleteRow = (rowId: string) => {
    updateBlock(block.id, { rows: block.rows.filter((r) => r.id !== rowId) });
  };

  return (
    <>
      <PropertyInput
        label="Titel"
        value={block.title}
        onChange={(v) => updateBlock(block.id, { title: v })}
        placeholder="z.B. Vorher vs. Nachher"
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-gray-400">Vergleichszeilen</label>
          <button
            onClick={addRow}
            className="text-xs text-[#7EC8F3] hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Zeile
          </button>
        </div>

        <div className="space-y-2">
          {block.rows.map((row, index) => (
            <div
              key={row.id}
              className="bg-[#1a1a24] rounded-lg p-3 border border-[#2a2a3a]"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                <button
                  onClick={() => deleteRow(row.id)}
                  className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <input
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
                placeholder="Bezeichnung"
                className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                           text-white text-sm mb-2 outline-none focus:border-[#7EC8F3]"
              />

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Vorher</label>
                  <input
                    value={row.beforeFormula}
                    onChange={(e) => updateRow(row.id, { beforeFormula: e.target.value })}
                    placeholder="{var} oder Zahl"
                    className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                               text-white text-xs font-mono outline-none focus:border-[#7EC8F3]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nachher</label>
                  <input
                    value={row.afterFormula}
                    onChange={(e) => updateRow(row.id, { afterFormula: e.target.value })}
                    placeholder="{var} oder Formel"
                    className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                               text-white text-xs font-mono outline-none focus:border-[#7EC8F3]"
                  />
                </div>
              </div>

              <select
                value={row.format}
                onChange={(e) => updateRow(row.id, { format: e.target.value as ComparisonRow['format'] })}
                className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1.5
                           text-white text-xs outline-none focus:border-[#7EC8F3]"
              >
                <option value="number">Zahl</option>
                <option value="currency">Währung (€)</option>
                <option value="percent">Prozent (%)</option>
                <option value="text">Text</option>
              </select>

              {/* Quick variable insert for this row */}
              {availableVariables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#2a2a3a]">
                  {availableVariables.slice(0, 4).map((v) => (
                    <button
                      key={v}
                      onClick={() => updateRow(row.id, { afterFormula: row.afterFormula + `{${v}}` })}
                      className="text-xs bg-[#12121a] text-[#7EC8F3] px-1.5 py-0.5 rounded
                                 hover:bg-[#2a2a3a] transition-colors"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
