import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, CollisionDetection } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { useCalculatorStore } from '../store/calculatorStore';
import type { Block } from '../types';

export function EditorLayout() {
  const { addBlock, reorderBlocks, calculator } = useCalculatorStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'new' | 'reorder' | null>(null);

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

  // Custom collision detection
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const { active } = args;
    const isNewBlock = String(active.id).startsWith('new-');

    if (isNewBlock) {
      // For new blocks, use rectIntersection to detect drop zones
      const intersections = rectIntersection(args);

      // Prioritize specific drop zones (drop-zone-N) over canvas-drop-zone
      const dropZone = intersections.find(c => String(c.id).startsWith('drop-zone-'));
      if (dropZone) {
        return [dropZone];
      }

      // Fall back to canvas drop zone
      const canvasCollision = intersections.find(c => c.id === 'canvas-drop-zone');
      if (canvasCollision) {
        return [canvasCollision];
      }

      // Use pointerWithin as fallback
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }

      return [];
    }

    // For reordering, use closestCenter
    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);

    if (id.startsWith('new-')) {
      setDragType('new');
    } else {
      setDragType('reorder');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeId = String(active.id);
      const overId = String(over.id);

      // New block from sidebar
      if (activeId.startsWith('new-')) {
        const blockType = activeId.replace('new-', '') as Block['type'];

        // Check if dropped on a specific drop zone
        if (overId.startsWith('drop-zone-')) {
          const index = parseInt(overId.replace('drop-zone-', ''), 10);
          addBlock(blockType, index);
        }
        // Dropped on canvas or existing block - add to end
        else if (overId === 'canvas-drop-zone' || !overId.startsWith('new-')) {
          addBlock(blockType);
        }
      }
      // Reordering existing blocks
      else if (active.id !== over.id && !overId.startsWith('drop-zone-')) {
        reorderBlocks(activeId, overId);
      }
    }

    setActiveId(null);
    setDragType(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDragType(null);
  };

  // Get block type label for overlay
  const getBlockLabel = (id: string) => {
    const type = id.replace('new-', '');
    const labels: Record<string, string> = {
      text: 'Text',
      input: 'Eingabefeld',
      slider: 'Slider',
      result: 'Ergebnis',
      chart: 'Diagramm',
      comparison: 'Vergleich',
    };
    return labels[type] || type;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-screen flex flex-col bg-[#04070d]">
        {/* Toolbar */}
        <Toolbar />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Block Palette */}
          <Sidebar />

          {/* Center - Editor Canvas */}
          <EditorCanvas showDropZone={dragType === 'new' && !!calculator} />

          {/* Right Sidebar - Properties Panel */}
          <PropertiesPanel />
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && dragType === 'new' && (
          <div className="bg-[#10131c] rounded-xl p-3 border-2 border-[#7EC8F3] shadow-2xl shadow-[#7EC8F3]/20 opacity-95">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#7EC8F3]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#7EC8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-white font-medium text-sm">
                {getBlockLabel(activeId)}
              </p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
