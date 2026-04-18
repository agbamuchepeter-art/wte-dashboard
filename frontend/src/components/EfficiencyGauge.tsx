import clsx from "clsx";

interface EfficiencyGaugeProps {
  value: number;       // 0–100
  threshold: number;   // alert threshold (e.g. 65)
  size?: number;       // px
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function EfficiencyGauge({ value, threshold, size = 140 }: EfficiencyGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.085;

  // Arc spans -135° to +135° (270° total)
  const START = -135;
  const END = 135;
  const filled = START + (Math.min(value, 100) / 100) * (END - START);

  const isAlert = value < threshold;
  const color = value >= 75 ? "#10b981" : value >= threshold ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <path
          d={arcPath(cx, cy, r, START, END)}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* threshold marker */}
        <path
          d={arcPath(cx, cy, r, START + (threshold / 100) * (END - START) - 1, START + (threshold / 100) * (END - START) + 1)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeW + 2}
          strokeLinecap="butt"
          opacity={0.6}
        />
        {/* filled arc */}
        {value > 0 && (
          <path
            d={arcPath(cx, cy, r, START, filled)}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* centre value */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.18}
          fontWeight="700"
          fill={color}
          fontFamily="Inter, sans-serif"
        >
          {value.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          fontSize={size * 0.085}
          fill="#94a3b8"
          fontFamily="Inter, sans-serif"
        >
          efficiency
        </text>
      </svg>
      {isAlert && (
        <span className="text-xs font-semibold text-red-400 animate-pulse">
          BELOW THRESHOLD
        </span>
      )}
    </div>
  );
}
