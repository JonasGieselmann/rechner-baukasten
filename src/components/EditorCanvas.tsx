import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCalculatorStore } from '../store/calculatorStore';
import { BlockRenderer } from './BlockRenderer';
import { DropZone } from './DropZone';

interface EditorCanvasProps {
  showDropZone?: boolean;
}

export function EditorCanvas({ showDropZone }: EditorCanvasProps) {
  const { calculator, selectBlock, isPreviewMode } = useCalculatorStore();

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  if (!calculator) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#6b7a90]">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-[#3a4555]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium text-white">Erstelle einen neuen Rechner</p>
          <p className="text-sm mt-1">
            oder lade eine bestehende Konfiguration
          </p>
        </div>
      </div>
    );
  }

  const blocks = [...calculator.blocks].sort((a, b) => a.order - b.order);
  const showDragIndicators = showDropZone && !isPreviewMode;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-auto p-8 transition-colors ${
        showDragIndicators ? 'bg-[#7EC8F3]/5' : ''
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectBlock(null);
        }
      }}
    >
      <div className="max-w-3xl mx-auto pl-8">
        {isPreviewMode ? (
          // Preview mode - no drag and drop
          <div className="space-y-4">
            {blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        ) : (
          // Edit mode with sortable blocks and drop zones
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {/* Drop zone at the top */}
              <DropZone id="drop-zone-0" isActive={showDragIndicators ?? false} />

              {blocks.map((block, index) => (
                <div key={block.id}>
                  <div className="py-2">
                    <BlockRenderer block={block} />
                  </div>
                  {/* Drop zone after each block */}
                  <DropZone
                    id={`drop-zone-${index + 1}`}
                    isActive={showDragIndicators ?? false}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        )}

        {/* Empty state when no blocks */}
        {blocks.length === 0 && !isPreviewMode && (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              showDragIndicators && isOver
                ? 'border-[#7EC8F3] bg-[#7EC8F3]/10 text-[#7EC8F3]'
                : 'border-[#2a3142] text-[#6b7a90]'
            }`}
          >
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-lg font-medium">
              {showDragIndicators ? 'Block hier ablegen' : 'Füge Blöcke hinzu'}
            </p>
            <p className="text-sm mt-2 opacity-70">
              {showDragIndicators ? 'Loslassen zum Hinzufügen' : 'Ziehe einen Block aus der Seitenleiste'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
