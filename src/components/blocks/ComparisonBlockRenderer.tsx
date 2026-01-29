import { useMemo } from 'react';
import type { ComparisonBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';
import { formatValue } from '../../engine/formula';

interface Props {
  block: ComparisonBlock;
}

interface ComputedRow {
  id: string;
  label: string;
  beforeFormatted: string;
  afterFormatted: string;
  isBetter: boolean;
}

export function ComparisonBlockRenderer({ block }: Props) {
  // Subscribe to both evaluate and variables - variables triggers re-render on input changes
  const { evaluate, variables } = useCalculatorStore();

  // useMemo with variables dependency ensures re-calculation when inputs change
  const computedRows = useMemo((): ComputedRow[] => {
    return block.rows.map((row) => {
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

      const isBetter = row.format !== 'text' && afterValue > beforeValue;

      return {
        id: row.id,
        label: row.label,
        beforeFormatted,
        afterFormatted,
        isBetter,
      };
    });
  }, [block.rows, evaluate, variables]);

  return (
    <div className="bg-[#10131c] rounded-2xl p-6 border border-[#1a1f2e] hover:border-[#2a3142] transition-colors">
      <h3 className="text-lg font-semibold mb-4 text-white">{block.title}</h3>

      <div className="space-y-3">
        {computedRows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between py-3 border-b border-[#1a1f2e] last:border-0"
          >
            <span className="text-[#b8c7d9] text-sm">{row.label}</span>
            <div className="flex items-center gap-4">
              <span className="text-[#6b7a90]">{row.beforeFormatted}</span>
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
              <span className={`font-semibold ${row.isBetter ? 'text-[#F7FAFF]' : 'text-white'}`}>
                {row.afterFormatted}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {block.rows.length === 0 && (
        <div className="py-6 text-center text-[#6b7a90] text-sm">
          Klicke rechts auf "+ Zeile" um Vergleiche hinzuzufügen
        </div>
      )}
    </div>
  );
}
