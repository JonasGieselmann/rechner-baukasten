import { useDroppable } from '@dnd-kit/core';

interface DropZoneProps {
  id: string;
  isActive: boolean;
}

export function DropZone({ id, isActive }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  if (!isActive) {
    return <div className="h-0" />;
  }

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-all duration-150 ${
        isOver ? 'h-14 my-1' : 'h-6 -my-1'
      }`}
    >
      {/* Visual indicator line */}
      <div
        className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 transition-all duration-150 ${
          isOver
            ? 'h-1 bg-[#7EC8F3] rounded-full shadow-[0_0_10px_rgba(126,200,243,0.5)]'
            : 'h-0.5 bg-[#7EC8F3]/30'
        }`}
      />

      {/* Insertion indicator badge */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[#7EC8F3] text-[#0a0a0f] text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Hier einfügen
          </div>
        </div>
      )}
    </div>
  );
}
