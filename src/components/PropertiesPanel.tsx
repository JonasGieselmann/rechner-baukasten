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
  const { calculator, selectedBlockId, updateBlock, isPreviewMode } =
    useCalculatorStore();

  if (isPreviewMode) {
    return (
      <div className="w-72 bg-[#0d0d14] border-l border-[#1f1f2e] p-4">
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">Vorschau-Modus aktiv</p>
          <p className="text-xs mt-1">Bearbeitung deaktiviert</p>
        </div>
      </div>
    );
  }

  if (!calculator || !selectedBlockId) {
    return (
      <div className="w-72 bg-[#0d0d14] border-l border-[#1f1f2e] p-4">
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">Kein Block ausgewählt</p>
          <p className="text-xs mt-1">Klicke auf einen Block zum Bearbeiten</p>
        </div>
      </div>
    );
  }

  const block = calculator.blocks.find((b) => b.id === selectedBlockId);
  if (!block) return null;

  return (
    <div className="w-72 bg-[#0d0d14] border-l border-[#1f1f2e] overflow-auto">
      <div className="p-4 border-b border-[#1f1f2e]">
        <h2 className="text-lg font-semibold text-white">Eigenschaften</h2>
        <p className="text-xs text-gray-500 mt-1">
          {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block
        </p>
      </div>

      <div className="p-4 space-y-4">
        {renderBlockProperties(block, updateBlock)}
      </div>
    </div>
  );
}

function renderBlockProperties(
  block: Block,
  updateBlock: (id: string, updates: Partial<Block>) => void
) {
  switch (block.type) {
    case 'text':
      return <TextProperties block={block} updateBlock={updateBlock} />;
    case 'input':
      return <InputProperties block={block} updateBlock={updateBlock} />;
    case 'slider':
      return <SliderProperties block={block} updateBlock={updateBlock} />;
    case 'result':
      return <ResultProperties block={block} updateBlock={updateBlock} />;
    case 'chart':
      return <ChartProperties block={block} updateBlock={updateBlock} />;
    case 'comparison':
      return <ComparisonProperties block={block} updateBlock={updateBlock} />;
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
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2
                   text-white text-sm focus:border-[#7EC8F3] focus:ring-1
                   focus:ring-[#7EC8F3]/30 outline-none transition-all"
      />
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
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2
                   text-white text-sm focus:border-[#7EC8F3] focus:ring-1
                   focus:ring-[#7EC8F3]/30 outline-none transition-all"
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
          { value: 'h1', label: 'Überschrift 1' },
          { value: 'h2', label: 'Überschrift 2' },
          { value: 'h3', label: 'Überschrift 3' },
          { value: 'body', label: 'Text' },
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
      />
      <PropertyInput
        label="Variablenname"
        value={block.variableName}
        onChange={(v) => updateBlock(block.id, { variableName: v.replace(/\s/g, '_') })}
        placeholder="z.B. leads"
      />
      <PropertyInput
        label="Standardwert"
        value={block.defaultValue}
        type="number"
        onChange={(v) => updateBlock(block.id, { defaultValue: Number(v) || 0 })}
      />
      <div className="grid grid-cols-2 gap-2">
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
      </div>
      <PropertyInput
        label="Suffix"
        value={block.suffix}
        onChange={(v) => updateBlock(block.id, { suffix: v })}
        placeholder="z.B. EUR, %"
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
      />
      <PropertyInput
        label="Variablenname"
        value={block.variableName}
        onChange={(v) => updateBlock(block.id, { variableName: v.replace(/\s/g, '_') })}
        placeholder="z.B. conversion"
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
          label="Step"
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
}: {
  block: ResultBlock;
  updateBlock: (id: string, updates: Partial<ResultBlock>) => void;
}) {
  return (
    <>
      <PropertyInput
        label="Label"
        value={block.label}
        onChange={(v) => updateBlock(block.id, { label: v })}
      />
      <div>
        <label className="block text-xs text-gray-400 mb-1">Formel</label>
        <textarea
          value={block.formula}
          onChange={(e) => updateBlock(block.id, { formula: e.target.value })}
          placeholder="z.B. {leads} * {conversion} / 100"
          rows={3}
          className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2
                     text-white text-sm font-mono focus:border-[#7EC8F3] focus:ring-1
                     focus:ring-[#7EC8F3]/30 outline-none transition-all resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Nutze {'{variableName}'} für Variablen
        </p>
      </div>
      <PropertySelect
        label="Format"
        value={block.format}
        onChange={(v) => updateBlock(block.id, { format: v as ResultBlock['format'] })}
        options={[
          { value: 'number', label: 'Zahl' },
          { value: 'currency', label: 'Währung (EUR)' },
          { value: 'percent', label: 'Prozent' },
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
}: {
  block: ChartBlock;
  updateBlock: (id: string, updates: Partial<ChartBlock>) => void;
}) {
  return (
    <>
      <PropertyInput
        label="Titel"
        value={block.title}
        onChange={(v) => updateBlock(block.id, { title: v })}
      />
      <div>
        <label className="block text-xs text-gray-400 mb-1">Daten-Formel</label>
        <textarea
          value={block.dataFormula}
          onChange={(e) => updateBlock(block.id, { dataFormula: e.target.value })}
          placeholder="vorher:nachher z.B. {umsatzIst}:{umsatzNeu}"
          rows={2}
          className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2
                     text-white text-sm font-mono focus:border-[#7EC8F3] focus:ring-1
                     focus:ring-[#7EC8F3]/30 outline-none transition-all resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: vorher:nachher
        </p>
      </div>
      <PropertyInput
        label="Vorher-Label"
        value={block.beforeLabel}
        onChange={(v) => updateBlock(block.id, { beforeLabel: v })}
      />
      <PropertyInput
        label="Nachher-Label"
        value={block.afterLabel}
        onChange={(v) => updateBlock(block.id, { afterLabel: v })}
      />
    </>
  );
}

function ComparisonProperties({
  block,
  updateBlock,
}: {
  block: ComparisonBlock;
  updateBlock: (id: string, updates: Partial<ComparisonBlock>) => void;
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
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-400">Zeilen</label>
          <button
            onClick={addRow}
            className="text-xs text-[#7EC8F3] hover:text-white transition-colors"
          >
            + Zeile hinzufügen
          </button>
        </div>

        <div className="space-y-3">
          {block.rows.map((row, index) => (
            <div
              key={row.id}
              className="bg-[#1a1a24] rounded-lg p-3 border border-[#2a2a3a]"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Zeile {index + 1}</span>
                <button
                  onClick={() => deleteRow(row.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Löschen
                </button>
              </div>
              <input
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
                placeholder="Label"
                className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1
                           text-white text-xs mb-2 outline-none focus:border-[#7EC8F3]"
              />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={row.beforeFormula}
                  onChange={(e) => updateRow(row.id, { beforeFormula: e.target.value })}
                  placeholder="Vorher"
                  className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1
                             text-white text-xs font-mono outline-none focus:border-[#7EC8F3]"
                />
                <input
                  value={row.afterFormula}
                  onChange={(e) => updateRow(row.id, { afterFormula: e.target.value })}
                  placeholder="Nachher"
                  className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1
                             text-white text-xs font-mono outline-none focus:border-[#7EC8F3]"
                />
              </div>
              <select
                value={row.format}
                onChange={(e) => updateRow(row.id, { format: e.target.value as ComparisonRow['format'] })}
                className="w-full bg-[#12121a] border border-[#2a2a3a] rounded px-2 py-1
                           text-white text-xs outline-none focus:border-[#7EC8F3]"
              >
                <option value="number">Zahl</option>
                <option value="currency">Währung</option>
                <option value="percent">Prozent</option>
                <option value="text">Text</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
