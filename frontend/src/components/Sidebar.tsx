import clsx from "clsx";
import { Factory, Wifi, WifiOff } from "lucide-react";
import type { DashboardFilters, Granularity } from "../types";

interface SidebarProps {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
  wsConnected: boolean;
  lastUpdated: Date | null;
}

const PLANTS = [
  { id: "all",        label: "All Plants" },
  { id: "WTE_RTM_01", label: "WTE_RTM_01 — Port" },
  { id: "WTE_RTM_02", label: "WTE_RTM_02 — City" },
];

const DATE_PRESETS: { label: string; from: () => string; to: () => string }[] = [
  {
    label: "Last 30 days",
    from: () => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
    to:   () => new Date().toISOString().slice(0, 10),
  },
  {
    label: "Last 90 days",
    from: () => new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
    to:   () => new Date().toISOString().slice(0, 10),
  },
  {
    label: "YTD 2026",
    from: () => "2026-01-01",
    to:   () => new Date().toISOString().slice(0, 10),
  },
  {
    label: "Full Year 2026",
    from: () => "2026-01-01",
    to:   () => "2026-12-31",
  },
];

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "daily",   label: "Daily" },
  { id: "weekly",  label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">{title}</p>
      {children}
    </div>
  );
}

export function Sidebar({ filters, onChange, wsConnected, lastUpdated }: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-surface-700 bg-surface-900 p-5">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <Factory size={22} className="text-blue-400" />
        <div>
          <p className="text-sm font-bold text-slate-100">WTE Rotterdam</p>
          <p className="text-xs text-slate-500">Live Dashboard</p>
        </div>
      </div>

      {/* WS status */}
      <div className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
        wsConnected ? "bg-emerald-950/60 text-emerald-400" : "bg-red-950/60 text-red-400"
      )}>
        {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
        {wsConnected ? "Live stream active" : "Reconnecting…"}
      </div>

      {lastUpdated && (
        <p className="text-xs text-slate-600 font-mono -mt-4">
          Last: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <hr className="border-surface-700" />

      {/* Plant filter */}
      <Section title="Plant">
        {PLANTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange({ plant_id: p.id })}
            className={clsx(
              "rounded-lg px-3 py-2 text-left text-xs transition-colors",
              filters.plant_id === p.id
                ? "bg-blue-600/30 text-blue-300 font-semibold"
                : "text-slate-400 hover:bg-surface-700 hover:text-slate-200"
            )}
          >
            {p.label}
          </button>
        ))}
      </Section>

      <hr className="border-surface-700" />

      {/* Date presets */}
      <Section title="Date Range">
        {DATE_PRESETS.map((p) => {
          const from = p.from();
          const to = p.to();
          const active = filters.date_from === from && filters.date_to === to;
          return (
            <button
              key={p.label}
              onClick={() => onChange({ date_from: from, date_to: to })}
              className={clsx(
                "rounded-lg px-3 py-2 text-left text-xs transition-colors",
                active
                  ? "bg-blue-600/30 text-blue-300 font-semibold"
                  : "text-slate-400 hover:bg-surface-700 hover:text-slate-200"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </Section>

      <hr className="border-surface-700" />

      {/* Granularity */}
      <Section title="Chart Granularity">
        <div className="flex gap-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.id}
              onClick={() => onChange({ granularity: g.id })}
              className={clsx(
                "flex-1 rounded px-1 py-1.5 text-xs transition-colors",
                filters.granularity === g.id
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-surface-700 text-slate-400 hover:bg-surface-600"
              )}
            >
              {g.label.slice(0, 3)}
            </button>
          ))}
        </div>
      </Section>

      <div className="mt-auto text-xs text-slate-700">
        10x-Analyst v1.0.0
      </div>
    </aside>
  );
}
