import type { TextBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';

interface Props {
  block: TextBlock;
}

export function TextBlockRenderer({ block }: Props) {
  const { isPreviewMode, selectedBlockId, updateBlock } = useCalculatorStore();
  const isSelected = selectedBlockId === block.id;

  const sizeClasses = {
    h1: 'text-3xl md:text-4xl font-bold',
    h2: 'text-2xl md:text-3xl font-semibold',
    h3: 'text-xl md:text-2xl font-medium',
    body: 'text-base text-gray-300',
  };

  if (isPreviewMode) {
    return (
      <div className={sizeClasses[block.size]}>
        {block.content}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[block.size]} ${
        isSelected ? '' : 'hover:bg-white/5'
      } rounded-lg transition-colors`}
    >
      <input
        type="text"
        value={block.content}
        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        className="w-full bg-transparent border-none outline-none"
        placeholder="Text eingeben..."
      />
    </div>
  );
}
