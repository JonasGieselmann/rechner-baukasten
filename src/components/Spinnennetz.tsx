import { useEffect, useRef, useState } from 'react';
import { BRAND } from '../../branding/tokens';

export interface SpinnennetzProps {
  values: number[];
  labels: string[];

  // Colors (default to BRAND tokens)
  accentColor?: string;
  fillOpacity?: number;
  gridColor?: string;
  labelColor?: string;
  pointStrokeColor?: string;
  backgroundColor?: string;

  // Animation
  enableReveal?: boolean;
  revealDuration?: number;
  enableWiggle?: boolean;
  wiggleIntensity?: number;
  pauseOnHover?: boolean;

  // Layout
  radius?: number;
  levels?: number;
  fontSize?: number;
  pointRadius?: number;
  strokeWidth?: number;
  maxValue?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function Spinnennetz({
  values: base,
  labels,
  accentColor = BRAND.colors.accent,
  fillOpacity = 0.25,
  gridColor = BRAND.colors.border,
  labelColor = BRAND.colors.text,
  pointStrokeColor = BRAND.colors.background,
  backgroundColor = 'transparent',
  enableReveal = true,
  revealDuration = 1100,
  enableWiggle = true,
  wiggleIntensity = 0.45,
  pauseOnHover = true,
  radius = 220,
  levels = 5,
  fontSize = 12,
  pointRadius = 5,
  strokeWidth = 2,
  maxValue = 10,
}: SpinnennetzProps) {
  const num = labels.length;

  const [values, setValues] = useState<number[]>(enableReveal ? base.map(() => 0) : base);
  const [paused, setPaused] = useState(false);

  const rafRef = useRef<number | null>(null);
  const revealStartRef = useRef<number | null>(null);
  const revealDoneRef = useRef(!enableReveal);

  function coords(i: number, value: number) {
    const angle = (Math.PI * 2 * i) / num - Math.PI / 2;
    const d = (value / maxValue) * radius;
    return { x: Math.cos(angle) * d, y: Math.sin(angle) * d };
  }

  useEffect(() => {
    revealStartRef.current = null;
    revealDoneRef.current = !enableReveal;
    if (!enableReveal) setValues(base);

    function tick(ts: number) {
      if (enableReveal && !revealDoneRef.current) {
        if (revealStartRef.current === null) revealStartRef.current = ts;
        const elapsed = ts - revealStartRef.current;
        const t = Math.min(1, elapsed / Math.max(100, revealDuration));
        const eased = easeOutCubic(t);
        setValues(base.map((v) => v * eased));
        if (t >= 1) revealDoneRef.current = true;
      } else if (enableWiggle && !paused) {
        const time = performance.now() / 1000;
        setValues(
          base.map((v, i) => {
            const phase = i * 0.85;
            const w =
              Math.sin(time * 0.6 + phase) * wiggleIntensity +
              Math.sin(time * 1.7 + phase * 1.3) * (wiggleIntensity * 0.4);
            return Math.max(0, Math.min(maxValue, v + w));
          }),
        );
      } else if (paused || !enableWiggle) {
        setValues(base);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.join(','), enableReveal, revealDuration, enableWiggle, wiggleIntensity, paused, radius, maxValue]);

  const gridPolys: string[] = [];
  for (let level = 1; level <= levels; level++) {
    const pts: string[] = [];
    for (let i = 0; i < num; i++) {
      const p = coords(i, (level / levels) * maxValue);
      pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    gridPolys.push(pts.join(' '));
  }

  const axisLines = Array.from({ length: num }, (_, i) => {
    const end = coords(i, maxValue);
    return { x: end.x, y: end.y };
  });

  const labelData = labels.map((label, i) => {
    const labelPos = coords(i, maxValue * 1.23);
    const angle = (Math.PI * 2 * i) / num - Math.PI / 2;
    const cosA = Math.cos(angle);
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (cosA > 0.3) anchor = 'start';
    else if (cosA < -0.3) anchor = 'end';
    return { x: labelPos.x, y: labelPos.y, text: label, anchor };
  });

  const radarPoints = values
    .map((v, i) => {
      const p = coords(i, v);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  const radarCircles = values.map((v, i) => coords(i, v));

  const padding = 130;
  const vbSize = (radius + padding) * 2;
  const viewBox = `${-radius - padding} ${-radius - padding} ${vbSize} ${vbSize}`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
    >
      <svg
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {gridPolys.map((pts, i) => (
          <polygon key={`grid-${i}`} points={pts} fill="none" stroke={gridColor} strokeWidth={1} />
        ))}
        {axisLines.map((line, i) => (
          <line key={`axis-${i}`} x1={0} y1={0} x2={line.x} y2={line.y} stroke={gridColor} strokeWidth={1} />
        ))}
        <polygon
          points={radarPoints}
          fill={accentColor}
          fillOpacity={fillOpacity}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {radarCircles.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={pointRadius}
            fill={accentColor}
            stroke={pointStrokeColor}
            strokeWidth={2}
          />
        ))}
        {labelData.map((l, i) => (
          <text
            key={`lbl-${i}`}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            dominantBaseline="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize={fontSize}
            fontWeight={500}
            fill={labelColor}
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
