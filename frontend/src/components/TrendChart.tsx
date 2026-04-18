import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TimeSeriesPoint } from "../types";
import { format, parseISO } from "date-fns";

interface TrendChartProps {
  series: TimeSeriesPoint[];
  title: string;
  yLabel?: string;
  type?: "line" | "bar";
  color?: string;
  formatter?: (v: number) => string;
}

const PLANT_COLORS: Record<string, string> = {
  WTE_RTM_01: "#3b82f6",
  WTE_RTM_02: "#f97316",
};
const DEFAULT_COLOR = "#3b82f6";

function shortDate(d: string) {
  try { return format(parseISO(d), "dd MMM"); } catch { return d; }
}

const CustomTooltip = ({
  active, payload, label, formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-600 bg-surface-800 p-3 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-slate-300">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{formatter ? formatter(p.value) : p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export function TrendChart({
  series,
  title,
  yLabel,
  type = "line",
  color = DEFAULT_COLOR,
  formatter,
}: TrendChartProps) {
  // Detect multi-plant series
  const plants = [...new Set(series.map((p) => p.plant_id).filter(Boolean))];
  const isMulti = plants.length > 1;

  // Pivot multi-plant into {date, WTE_RTM_01, WTE_RTM_02}
  const data: Record<string, number | string>[] = [];
  if (isMulti) {
    const byDate: Record<string, Record<string, number>> = {};
    for (const pt of series) {
      const d = shortDate(pt.date);
      if (!byDate[d]) byDate[d] = {};
      byDate[d][pt.plant_id!] = pt.value;
    }
    for (const [date, vals] of Object.entries(byDate)) {
      data.push({ date, ...vals });
    }
  } else {
    for (const pt of series) {
      data.push({ date: shortDate(pt.date), value: pt.value });
    }
  }

  const Chart = type === "bar" ? BarChart : LineChart;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-800 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {yLabel && <span className="text-xs text-slate-500">{yLabel}</span>}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatter ? formatter(v) : v.toLocaleString()}
            width={55}
          />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          {isMulti && <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />}

          {isMulti
            ? plants.map((pid) =>
                type === "bar" ? (
                  <Bar key={pid} dataKey={pid!} fill={PLANT_COLORS[pid!] ?? DEFAULT_COLOR} radius={[3, 3, 0, 0]} maxBarSize={24} />
                ) : (
                  <Line
                    key={pid}
                    type="monotone"
                    dataKey={pid!}
                    stroke={PLANT_COLORS[pid!] ?? DEFAULT_COLOR}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )
              )
            : type === "bar"
            ? <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={24} />
            : <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          }
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
