import { useDraggable } from '@dnd-kit/core';
import { useCalculatorStore } from '../store/calculatorStore';
import type { Block } from '../types';

const BLOCK_TYPES: Array<{
  type: Block['type'];
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    type: 'text',
    label: 'Text',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    description: 'Überschriften & Text',
  },
  {
    type: 'input',
    label: 'Eingabefeld',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    description: 'Numerische Eingabe',
  },
  {
    type: 'slider',
    label: 'Slider',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    description: 'Interaktiver Schieberegler',
  },
  {
    type: 'result',
    label: 'Ergebnis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
    description: 'Berechnetes Ergebnis',
  },
  {
    type: 'chart',
    label: 'Diagramm',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    description: '12-Monats Chart',
  },
  {
    type: 'comparison',
    label: 'Vergleich',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    description: 'Vorher/Nachher Tabelle',
  },
];

// Draggable block item component
function DraggableBlockItem({
  blockType,
  disabled,
}: {
  blockType: (typeof BLOCK_TYPES)[number];
  disabled: boolean;
}) {
  const { addBlock } = useCalculatorStore();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-${blockType.type}`,
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !disabled && addBlock(blockType.type)}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl
                 bg-[#10131c] border border-[#1a1f2e]
                 hover:bg-[#1a1f2e] hover:border-[#2a3142]
                 active:scale-[0.98] cursor-grab active:cursor-grabbing
                 transition-all text-left group
                 disabled:opacity-40 disabled:cursor-not-allowed
                 disabled:hover:bg-[#10131c] disabled:hover:border-[#1a1f2e]
                 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="w-8 h-8 rounded-lg bg-[#1a1f2e] group-hover:bg-[#2a3142]
                      flex items-center justify-center text-[#6b7a90]
                      group-hover:text-[#7EC8F3] transition-all">
        {blockType.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{blockType.label}</p>
        <p className="text-xs text-[#6b7a90] truncate">{blockType.description}</p>
      </div>
      <svg className="w-4 h-4 text-[#3a4555] group-hover:text-[#6b7a90] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}

export function Sidebar() {
  const { isPreviewMode, calculator, variables } = useCalculatorStore();

  const isDisabled = isPreviewMode || !calculator;

  return (
    <div className="w-64 bg-[#0a0d12] border-r border-[#1a1f2e] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1f2e]">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Bausteine
        </h2>
        <p className="text-xs text-[#6b7a90] mt-1 ml-6">
          {calculator ? 'Klicken oder ziehen' : 'Erstelle zuerst einen Rechner'}
        </p>
      </div>

      {/* Block Palette */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {BLOCK_TYPES.map((blockType) => (
            <DraggableBlockItem
              key={blockType.type}
              blockType={blockType}
              disabled={isDisabled}
            />
          ))}
        </div>
      </div>

      {/* Variables Info */}
      {calculator && Object.keys(variables).length > 0 && (
        <div className="p-4 border-t border-[#1a1f2e]">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-3.5 h-3.5 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <h3 className="text-xs font-semibold text-[#b8c7d9]">Variablen</h3>
            <span className="text-xs text-[#6b7a90] ml-auto">{Object.keys(variables).length}</span>
          </div>
          <div className="space-y-1 max-h-28 overflow-auto">
            {Object.entries(variables).map(([name, value]) => (
              <div
                key={name}
                className="flex justify-between items-center text-xs bg-[#10131c] rounded-lg px-2.5 py-1.5
                           cursor-pointer hover:bg-[#1a1f2e] transition-colors group"
                onClick={() => navigator.clipboard.writeText(`{${name}}`)}
                title="Klicken zum Kopieren"
              >
                <code className="text-[#7EC8F3] font-mono group-hover:text-white transition-colors">
                  {`{${name}}`}
                </code>
                <span className="text-[#6b7a90]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
