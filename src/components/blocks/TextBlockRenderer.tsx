import type { TextBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';

interface Props {
  block: TextBlock;
}

export function TextBlockRenderer({ block }: Props) {
  const { isPreviewMode, updateBlock } = useCalculatorStore();

  const sizeClasses = {
    h1: 'text-3xl md:text-4xl font-bold text-white',
    h2: 'text-2xl md:text-3xl font-semibold text-white',
    h3: 'text-xl md:text-2xl font-medium text-white',
    body: 'text-base text-[#b8c7d9] leading-relaxed',
  };

  const placeholders = {
    h1: 'Überschrift eingeben...',
    h2: 'Titel eingeben...',
    h3: 'Untertitel eingeben...',
    body: 'Text eingeben...',
  };

  if (isPreviewMode) {
    if (!block.content) {
      return null; // Don't show empty text blocks in preview
    }
    return (
      <div className="bg-[#10131c] rounded-2xl p-5 border border-[#1a1f2e]">
        <div className={sizeClasses[block.size]}>
          {block.content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#10131c] rounded-2xl p-5 border border-[#1a1f2e] hover:border-[#2a3142] transition-colors">
      <input
        type="text"
        value={block.content}
        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        className={`w-full bg-transparent border-none outline-none ${sizeClasses[block.size]}
                   placeholder:text-[#3a4555] focus:placeholder:text-[#4a5565] transition-colors`}
        placeholder={placeholders[block.size]}
      />
    </div>
  );
}
