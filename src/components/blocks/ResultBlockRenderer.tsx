import { useMemo } from 'react';
import type { ResultBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';
import { formatValue } from '../../engine/formula';

interface Props {
  block: ResultBlock;
}

export function ResultBlockRenderer({ block }: Props) {
  // Subscribe to both evaluate and variables - variables triggers re-render on input changes
  const { evaluate, variables } = useCalculatorStore();

  // useMemo with variables dependency ensures re-calculation when inputs change
  const { value, formattedValue } = useMemo(() => {
    const val = evaluate(block.formula);
    return {
      value: val,
      formattedValue: formatValue(val, block.format),
    };
  }, [block.formula, block.format, evaluate, variables]);

  const sizeClasses = {
    small: 'text-xl',
    medium: 'text-3xl md:text-4xl',
    large: 'text-4xl md:text-5xl',
  };

  const colorClasses = {
    default: 'text-white',
    accent: 'text-[#7EC8F3]',
    success: 'text-[#7EC8F3]',
    warning: 'text-amber-400',
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1f2e] to-[#10131c] rounded-2xl p-6 border border-[#2a3142]">
      <p className="text-[#b8c7d9] text-sm mb-1">{block.label}</p>
      <p className={`${sizeClasses[block.size]} ${colorClasses[block.color]} font-bold`}>
        {block.format === 'percent' && value > 0 ? '+' : ''}
        {formattedValue}
      </p>
    </div>
  );
}
