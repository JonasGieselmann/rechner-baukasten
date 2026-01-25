import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';
import { formatCurrency } from '../../engine/formula';

interface Props {
  block: ChartBlock;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-lg p-3 shadow-xl">
        <p className="text-gray-400 text-sm mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey === 'after' ? 'Nachher' : 'Vorher'}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function ChartBlockRenderer({ block }: Props) {
  const { evaluate } = useCalculatorStore();

  // Generate sample data based on a formula
  // For demo: we'll use before/after values from variables
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  // Try to get values from the data formula (expects "before:after" format)
  let beforeValue = 1000;
  let afterValue = 2500;

  if (block.dataFormula) {
    const parts = block.dataFormula.split(':');
    if (parts.length >= 2) {
      beforeValue = evaluate(parts[0]) || 1000;
      afterValue = evaluate(parts[1]) || 2500;
    } else {
      afterValue = evaluate(block.dataFormula) || 2500;
    }
  }

  const data = months.map((label, i) => ({
    label,
    before: Math.round(beforeValue * (i + 1)),
    after: Math.round(afterValue * (i + 1)),
  }));

  return (
    <div className="bg-[#12121a] rounded-xl p-5 border border-[#1f1f2e]">
      <h3 className="text-lg font-semibold mb-4">{block.title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAfter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7EC8F3" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7EC8F3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBefore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7a90" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6b7a90" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="label"
              stroke="#6b7a90"
              tick={{ fill: '#6b7a90', fontSize: 12 }}
            />
            <YAxis
              stroke="#6b7a90"
              tick={{ fill: '#6b7a90', fontSize: 12 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-sm">
                  {value === 'after' ? block.afterLabel : block.beforeLabel}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="before"
              stroke="#6b7a90"
              strokeWidth={2}
              fill="url(#colorBefore)"
            />
            <Area
              type="monotone"
              dataKey="after"
              stroke="#7EC8F3"
              strokeWidth={2}
              fill="url(#colorAfter)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
