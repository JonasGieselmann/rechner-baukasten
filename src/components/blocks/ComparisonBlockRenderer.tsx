import type { ComparisonBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';
import { formatValue } from '../../engine/formula';

interface Props {
  block: ComparisonBlock;
}

export function ComparisonBlockRenderer({ block }: Props) {
  const { evaluate } = useCalculatorStore();

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-[#1f1f2e]">
      <h3 className="text-lg font-semibold mb-4">{block.title}</h3>
      <div className="space-y-1">
        {block.rows.map((row) => {
          const beforeValue = evaluate(row.beforeFormula);
          const afterValue = evaluate(row.afterFormula);

          const beforeFormatted =
            row.format === 'text'
              ? row.beforeFormula
              : formatValue(beforeValue, row.format as 'number' | 'currency' | 'percent');

          const afterFormatted =
            row.format === 'text'
              ? row.afterFormula
              : formatValue(afterValue, row.format as 'number' | 'currency' | 'percent');

          const isBetter =
            row.format !== 'text' && afterValue > beforeValue;

          return (
            <div
              key={row.id}
              className="flex items-center justify-between py-3 border-b border-[#1f1f2e] last:border-0"
            >
              <span className="text-gray-400 text-sm">{row.label}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">{beforeFormatted}</span>
                <svg
                  className="w-4 h-4 text-[#7EC8F3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
                <span
                  className={`font-semibold ${isBetter ? 'text-[#F7FAFF]' : 'text-white'}`}
                >
                  {afterFormatted}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
