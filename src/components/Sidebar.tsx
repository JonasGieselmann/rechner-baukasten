import { useCalculatorStore } from '../store/calculatorStore';
import type { Block } from '../types';

const BLOCK_TYPES: Array<{
  type: Block['type'];
  label: string;
  icon: JSX.Element;
  description: string;
}> = [
  {
    type: 'text',
    label: 'Text',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    description: 'Überschrift oder Beschreibung',
  },
  {
    type: 'input',
    label: 'Eingabefeld',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    description: 'Numerische Eingabe',
  },
  {
    type: 'slider',
    label: 'Slider',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    description: 'Wert mit Schieberegler',
  },
  {
    type: 'result',
    label: 'Ergebnis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Berechnetes Ergebnis',
  },
  {
    type: 'chart',
    label: 'Diagramm',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    description: '12-Monats-Vergleich',
  },
  {
    type: 'comparison',
    label: 'Vergleich',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    description: 'Vorher/Nachher-Tabelle',
  },
];

export function Sidebar() {
  const { addBlock, isPreviewMode, calculator, variables } = useCalculatorStore();

  return (
    <div className="w-64 bg-[#0d0d14] border-r border-[#1f1f2e] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f2e]">
        <h2 className="text-lg font-semibold text-white">Blöcke</h2>
        <p className="text-xs text-gray-500 mt-1">
          Klicke zum Hinzufügen
        </p>
      </div>

      {/* Block Palette */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {BLOCK_TYPES.map((blockType) => (
            <button
              key={blockType.type}
              onClick={() => addBlock(blockType.type)}
              disabled={isPreviewMode || !calculator}
              className="w-full flex items-start gap-3 p-3 rounded-lg bg-[#12121a]
                         border border-[#1f1f2e] hover:border-[#7EC8F3]/50
                         hover:bg-[#1a1a24] transition-all text-left
                         disabled:opacity-50 disabled:cursor-not-allowed
                         disabled:hover:border-[#1f1f2e] disabled:hover:bg-[#12121a]"
            >
              <div className="text-[#7EC8F3] mt-0.5">{blockType.icon}</div>
              <div>
                <p className="font-medium text-white text-sm">{blockType.label}</p>
                <p className="text-xs text-gray-500">{blockType.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Variables Info */}
      {calculator && Object.keys(variables).length > 0 && (
        <div className="p-4 border-t border-[#1f1f2e]">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Variablen</h3>
          <div className="space-y-1 text-xs">
            {Object.entries(variables).map(([name, value]) => (
              <div key={name} className="flex justify-between text-gray-500">
                <span className="font-mono text-[#7EC8F3]">{`{${name}}`}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
