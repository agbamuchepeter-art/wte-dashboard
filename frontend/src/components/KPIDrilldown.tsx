import { X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import clsx from "clsx";
import type { TimeSeriesPoint, RAGStatus } from "../types";

const CHART = { grid: "#1e3354", text: "#64748b" };

const RAG_COLOR: Record<RAGStatus, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red:   "#ef4444",
};

interface KPIDrilldownProps {
  label:    string;
  value:    string;
  unit?:    string;
  rag:      RAGStatus | null;
  period:   string;
  series:   TimeSeriesPoint[];
  onClose:  () => void;
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface-900 border border-surface-600 p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1 font-mono">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value.toFixed(2)}</strong></p>
      ))}
    </div>
  );
}

export function KPIDrilldown({ label, value, unit, rag, period, series, onClose }: KPIDrilldownProps) {
  const color = rag ? RAG_COLOR[rag] : "#22c55e";

  const periodLabel: Record<string, string> = {
    today: "Today",
    "7d":  "Last 7 Days",
    "30d": "Last 30 Days",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface-800 border border-surface-600 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{periodLabel[period] ?? period} — trend view</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Current value */}
        <div className="px-5 pt-4 pb-2">
          <span
            className={clsx("text-4xl font-bold tabular-nums")}
            style={{ color }}
          >
            {value}
          </span>
          {unit && <span className="text-slate-500 text-sm ml-1.5">{unit}</span>}
        </div>

        {/* Chart */}
        <div className="px-5 pb-5">
          {series.length < 2 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-500">
              Not enough data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={series} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: CHART.text }}
                  tickFormatter={v => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: CHART.text }} />
                <Tooltip content={<ChartTip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={label}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
