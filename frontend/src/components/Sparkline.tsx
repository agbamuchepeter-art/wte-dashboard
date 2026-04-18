import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { TimeSeriesPoint } from "../types";

interface SparklineProps {
  data: TimeSeriesPoint[];
  color?: string;
}

export function Sparkline({ data, color = "#22c55e" }: SparklineProps) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
