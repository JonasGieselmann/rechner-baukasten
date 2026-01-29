import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block } from '../types';
import { useCalculatorStore } from '../store/calculatorStore';
import {
  TextBlockRenderer,
  InputBlockRenderer,
  SliderBlockRenderer,
  ResultBlockRenderer,
  ChartBlockRenderer,
  ComparisonBlockRenderer,
} from './blocks';

interface Props {
  block: Block;
}

// Notion-style 6-dot grip icon
function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
      <circle cx="2" cy="2" r="1.5" />
      <circle cx="8" cy="2" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="2" cy="14" r="1.5" />
      <circle cx="8" cy="14" r="1.5" />
    </svg>
  );
}

// Plus icon for adding blocks
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 1v12M1 7h12" />
    </svg>
  );
}

export function BlockRenderer({ block }: Props) {
  const { selectedBlockId, selectBlock, isPreviewMode, deleteBlock, addBlock } =
    useCalculatorStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isSelected = selectedBlockId === block.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isPreviewMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Only apply transition when sorting (not during active drag)
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : undefined,
    // GPU acceleration for smooth transforms
    willChange: transform ? 'transform' : undefined,
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return <TextBlockRenderer block={block} />;
      case 'input':
        return <InputBlockRenderer block={block} />;
      case 'slider':
        return <SliderBlockRenderer block={block} />;
      case 'result':
        return <ResultBlockRenderer block={block} />;
      case 'chart':
        return <ChartBlockRenderer block={block} />;
      case 'comparison':
        return <ComparisonBlockRenderer block={block} />;
      default:
        return <div>Unknown block type</div>;
    }
  };

  if (isPreviewMode) {
    return <div className="mb-4">{renderBlockContent()}</div>;
  }

  const blockTypes = [
    { type: 'text' as const, label: 'Text', icon: 'T' },
    { type: 'input' as const, label: 'Eingabe', icon: '#' },
    { type: 'slider' as const, label: 'Slider', icon: '—' },
    { type: 'result' as const, label: 'Ergebnis', icon: '=' },
    { type: 'chart' as const, label: 'Chart', icon: '📊' },
    { type: 'comparison' as const, label: 'Vergleich', icon: '⇄' },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative mb-2 ${isDragging ? 'z-50' : ''}`}
    >
      {/* Notion-style handle area - appears on hover */}
      <div className="absolute -left-16 top-0 bottom-0 w-16 flex items-center justify-end gap-1 pr-2
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {/* Add block button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
            className="p-1.5 rounded hover:bg-[#2a2a3a] text-gray-500 hover:text-gray-300
                       transition-colors"
            title="Block hinzufügen"
          >
            <PlusIcon />
          </button>

          {/* Add block dropdown menu */}
          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 bg-[#1a1a24] border border-[#2a2a3a]
                              rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Insert after current block
                      addBlock(bt.type, block.order + 1);
                      setShowAddMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a3a]
                               flex items-center gap-2 transition-colors"
                  >
                    <span className="w-5 text-center text-gray-500">{bt.icon}</span>
                    {bt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Drag handle - Notion style 6-dot grip */}
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded hover:bg-[#2a2a3a] text-gray-500 hover:text-gray-300
                     cursor-grab active:cursor-grabbing transition-colors"
          title="Ziehen zum Verschieben"
        >
          <GripIcon />
        </button>
      </div>

      {/* Block content with selection ring */}
      <div
        onClick={() => selectBlock(block.id)}
        className={`relative rounded-xl transition-shadow duration-150 ${
          isSelected
            ? 'ring-2 ring-[#7EC8F3] ring-offset-2 ring-offset-[#0a0a0f]'
            : 'hover:ring-1 hover:ring-[#3a3a4a] hover:ring-offset-1 hover:ring-offset-[#0a0a0f]'
        }`}
      >
        {renderBlockContent()}

        {/* Delete button - only show when selected */}
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteBlock(block.id);
            }}
            className="absolute -right-2 -top-2 bg-red-500/90 hover:bg-red-500 text-white
                       rounded-full p-1 shadow-lg transition-all z-10"
            title="Block löschen"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
