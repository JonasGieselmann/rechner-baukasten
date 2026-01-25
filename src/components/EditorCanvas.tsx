import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCalculatorStore } from '../store/calculatorStore';
import { BlockRenderer } from './BlockRenderer';

export function EditorCanvas() {
  const { calculator, reorderBlocks, selectBlock, isPreviewMode } =
    useCalculatorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderBlocks(String(active.id), String(over.id));
    }
  };

  if (!calculator) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
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
          <p className="text-lg">Erstelle einen neuen Rechner</p>
          <p className="text-sm text-gray-600 mt-1">
            oder lade eine bestehende Konfiguration
          </p>
        </div>
      </div>
    );
  }

  const blocks = [...calculator.blocks].sort((a, b) => a.order - b.order);

  return (
    <div
      className="flex-1 overflow-auto p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectBlock(null);
        }
      }}
    >
      <div className="max-w-3xl mx-auto pl-8">
        {isPreviewMode ? (
          // Preview mode - no drag and drop
          <div>
            {blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        ) : (
          // Edit mode with drag and drop
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Empty state */}
        {blocks.length === 0 && !isPreviewMode && (
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center text-gray-500">
            <p>Füge Blöcke hinzu, um deinen Rechner zu erstellen</p>
            <p className="text-sm mt-2">
              Wähle einen Block aus der Seitenleiste
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
