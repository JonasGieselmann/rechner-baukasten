import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block } from '../types';
import { useCalculatorStore } from '../store/calculatorStore';
import { BRAND } from '../../branding/tokens';
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
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : undefined,
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
    { type: 'slider' as const, label: 'Slider', icon: '-' },
    { type: 'result' as const, label: 'Ergebnis', icon: '=' },
    { type: 'chart' as const, label: 'Chart', icon: 'C' },
    { type: 'comparison' as const, label: 'Vergleich', icon: '/' },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative mb-2 ${isDragging ? 'z-50' : ''}`}
    >
      {/* Notion-style handle area */}
      <div
        className="absolute -left-16 top-0 bottom-0 w-16 flex items-center justify-end gap-1 pr-2
                    opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      >
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
            className="p-1.5 rounded transition-colors hover:opacity-70"
            style={{ color: BRAND.colors.muted }}
            title="Block hinzufügen"
          >
            <PlusIcon />
          </button>

          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div
                className="absolute left-0 top-full mt-1 rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                style={{
                  backgroundColor: BRAND.colors.card,
                  border: `1px solid ${BRAND.colors.border}`,
                }}
              >
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={(e) => {
                      e.stopPropagation();
                      addBlock(bt.type, block.order + 1);
                      setShowAddMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ color: BRAND.colors.text }}
                  >
                    <span className="w-5 text-center font-mono text-xs" style={{ color: BRAND.colors.muted }}>{bt.icon}</span>
                    {bt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded transition-colors cursor-grab active:cursor-grabbing hover:opacity-70"
          style={{ color: BRAND.colors.muted }}
          title="Ziehen zum Verschieben"
        >
          <GripIcon />
        </button>
      </div>

      {/* Block content with selection ring */}
      <div
        onClick={() => selectBlock(block.id)}
        className="relative rounded-xl transition-all duration-150"
        style={
          isSelected
            ? { outline: `2px solid ${BRAND.colors.accent}`, outlineOffset: '2px' }
            : undefined
        }
        onMouseEnter={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.outline = `1px solid ${BRAND.colors.border}`;
            (e.currentTarget as HTMLDivElement).style.outlineOffset = '2px';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.outline = 'none';
          }
        }}
      >
        {renderBlockContent()}

        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteBlock(block.id);
            }}
            className="absolute -right-2 -top-2 bg-red-500 hover:bg-red-600 text-white
                       rounded-full p-1 shadow-lg transition-all z-10"
            title="Block loeschen"
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
