import { useMemo } from 'react';
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

// Format value based on format type
function formatValue(value: number, format: ChartBlock['yAxisFormat']): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return `${value.toLocaleString('de-DE')}%`;
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k`;
      }
      return value.toLocaleString('de-DE');
  }
}

// Format Y-axis tick
function formatYAxisTick(value: number, format: ChartBlock['yAxisFormat']): string {
  switch (format) {
    case 'currency':
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M €`;
      } else if (value >= 1000) {
        return `${Math.round(value / 1000)}k €`;
      }
      return `${value} €`;
    case 'percent':
      return `${value}%`;
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${Math.round(value / 1000)}k`;
      }
      return String(value);
  }
}

// Generate X-axis labels
function generateXLabels(type: ChartBlock['xAxisType'], count: number): string[] {
  switch (type) {
    case 'quarters':
      // Q1 Y1, Q2 Y1, ... Q4 Y2 etc.
      return Array.from({ length: count }, (_, i) => {
        const quarter = (i % 4) + 1;
        const year = Math.floor(i / 4) + 1;
        return count > 4 ? `Q${quarter} J${year}` : `Q${quarter}`;
      });
    case 'numbers':
      return Array.from({ length: count }, (_, i) => String(i + 1));
    case 'months':
    default:
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      if (count <= 12) {
        // Simple month names
        return Array.from({ length: count }, (_, i) => months[i]);
      } else {
        // For >12 months, show only key points to avoid clutter
        return Array.from({ length: count }, (_, i) => {
          const month = i + 1;
          // Show label at months 1, 6, 12, 18, 24, 30, 36...
          if (month === 1 || month % 6 === 0) {
            return String(month);
          }
          return '';
        });
      }
  }
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
  beforeLabel: string;
  afterLabel: string;
  format: ChartBlock['yAxisFormat'];
}

function ChartTooltip({ active, payload, label, beforeLabel, afterLabel, format }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3142] rounded-lg p-3 shadow-xl">
        <p className="text-[#b8c7d9] text-sm mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey === 'after' ? afterLabel : beforeLabel}: {formatValue(entry.value, format)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function ChartBlockRenderer({ block }: Props) {
  // Subscribe to both evaluate and variables - variables triggers re-render on input changes
  const { evaluate, variables } = useCalculatorStore();

  // Get format settings with defaults
  const yAxisFormat = block.yAxisFormat || 'number';
  const xAxisType = block.xAxisType || 'months';
  const xAxisCount = block.xAxisCount || 12;

  // useMemo with variables dependency ensures re-calculation when inputs change
  const data = useMemo(() => {
    let beforeValue = 0;
    let afterValue = 0;

    if (block.dataFormula) {
      const parts = block.dataFormula.split(':');
      if (parts.length >= 2) {
        const evalBefore = evaluate(parts[0].trim());
        const evalAfter = evaluate(parts[1].trim());
        beforeValue = typeof evalBefore === 'number' ? evalBefore : 0;
        afterValue = typeof evalAfter === 'number' ? evalAfter : 0;
      } else {
        const evalResult = evaluate(block.dataFormula.trim());
        afterValue = typeof evalResult === 'number' ? evalResult : 0;
        beforeValue = 0;
      }
    }

    // Generate labels based on xAxisType
    const labels = generateXLabels(xAxisType, xAxisCount);

    // Generate data points - linear growth from 0 to final value
    // Final point (i = xAxisCount - 1) will equal the entered value
    return labels.map((label, i) => ({
      label,
      before: Math.round(beforeValue * ((i + 1) / xAxisCount)),
      after: Math.round(afterValue * ((i + 1) / xAxisCount)),
    }));
  }, [block.dataFormula, xAxisType, xAxisCount, evaluate, variables]);

  return (
    <div className="bg-[#10131c] rounded-2xl p-6 border border-[#1a1f2e] hover:border-[#2a3142] transition-colors">
      <h3 className="text-lg font-semibold mb-4 text-white">{block.title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorAfter-${block.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7EC8F3" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7EC8F3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`colorBefore-${block.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7a90" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6b7a90" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
            <XAxis
              dataKey="label"
              stroke="#6b7a90"
              tick={{ fill: '#6b7a90', fontSize: 12 }}
            />
            <YAxis
              stroke="#6b7a90"
              tick={{ fill: '#6b7a90', fontSize: 12 }}
              tickFormatter={(v) => formatYAxisTick(v, yAxisFormat)}
              width={65}
            />
            <Tooltip
              content={
                <ChartTooltip
                  beforeLabel={block.beforeLabel}
                  afterLabel={block.afterLabel}
                  format={yAxisFormat}
                />
              }
              cursor={{ stroke: '#2a3142', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
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
              fill={`url(#colorBefore-${block.id})`}
              dot={{ r: 4, fill: '#1a1f2e', stroke: '#6b7a90', strokeWidth: 2 }}
              activeDot={{ r: 8, strokeWidth: 2, stroke: '#6b7a90', fill: '#1a1f2e' }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="after"
              stroke="#7EC8F3"
              strokeWidth={2}
              fill={`url(#colorAfter-${block.id})`}
              dot={{ r: 4, fill: '#1a1f2e', stroke: '#7EC8F3', strokeWidth: 2 }}
              activeDot={{ r: 8, strokeWidth: 2, stroke: '#7EC8F3', fill: '#1a1f2e' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
