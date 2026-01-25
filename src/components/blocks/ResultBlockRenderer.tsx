import type { ResultBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';
import { formatValue } from '../../engine/formula';

interface Props {
  block: ResultBlock;
}

export function ResultBlockRenderer({ block }: Props) {
  const { evaluate } = useCalculatorStore();

  const value = evaluate(block.formula);
  const formattedValue = formatValue(value, block.format);

  const sizeClasses = {
    small: 'text-xl',
    medium: 'text-3xl',
    large: 'text-4xl md:text-5xl',
  };

  const colorClasses = {
    default: 'text-white',
    accent: 'text-[#7EC8F3]',
    success: 'text-green-400',
    warning: 'text-yellow-400',
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a24] to-[#12121a] rounded-xl p-5 border border-[#1f1f2e]">
      <p className="text-sm text-gray-400 mb-1">{block.label}</p>
      <p className={`${sizeClasses[block.size]} ${colorClasses[block.color]} font-bold`}>
        {block.format === 'percent' && value > 0 ? '+' : ''}
        {formattedValue}
      </p>
    </div>
  );
}
