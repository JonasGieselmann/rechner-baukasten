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

export function BlockRenderer({ block }: Props) {
  const { selectedBlockId, selectBlock, isPreviewMode, deleteBlock } =
    useCalculatorStore();

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
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group mb-4 ${
        isSelected
          ? 'ring-2 ring-[#7EC8F3] ring-offset-2 ring-offset-[#0a0a0f] rounded-xl'
          : ''
      }`}
      onClick={() => selectBlock(block.id)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                   cursor-grab active:cursor-grabbing p-2 text-gray-500 hover:text-gray-300
                   transition-opacity"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteBlock(block.id);
        }}
        className="absolute -right-3 -top-3 opacity-0 group-hover:opacity-100
                   bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1
                   transition-all z-10"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {renderBlockContent()}
    </div>
  );
}
