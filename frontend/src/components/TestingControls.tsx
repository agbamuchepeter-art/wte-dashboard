import { useState } from "react";
import { Zap, Trash2, FlaskConical } from "lucide-react";
import clsx from "clsx";
import { useSimulateAlert, useClearSimulated } from "../hooks/useProgramme";

type KPI     = "efficiency" | "waste_throughput" | "downtime_hours" | "daily_profit" | "nox" | "so2";
type Plant   = "WTE_RTM_01" | "WTE_RTM_02";
type Level   = 2 | 3 | 4;

const KPI_OPTIONS: { value: KPI; label: string }[] = [
  { value: "efficiency",       label: "Efficiency" },
  { value: "waste_throughput", label: "Throughput" },
  { value: "downtime_hours",   label: "Downtime" },
  { value: "daily_profit",     label: "Profit" },
  { value: "nox",              label: "NOx Emissions" },
  { value: "so2",              label: "SO2 Emissions" },
];

const PLANT_OPTIONS: { value: Plant; label: string }[] = [
  { value: "WTE_RTM_01", label: "WTE_RTM_01 — Port" },
  { value: "WTE_RTM_02", label: "WTE_RTM_02 — City" },
];

const LEVEL_CONFIG = {
  2: { label: "Simulate Amber (L2)",  bg: "bg-amber-600 hover:bg-amber-500", icon: "text-amber-100" },
  3: { label: "Simulate Red (L3)",    bg: "bg-red-600 hover:bg-red-500",     icon: "text-red-100" },
  4: { label: "Simulate L4 Escalation", bg: "bg-purple-700 hover:bg-purple-600", icon: "text-purple-100" },
};

export function TestingControls() {
  const simulate = useSimulateAlert();
  const clear    = useClearSimulated();

  const [kpi,   setKpi]   = useState<KPI>("efficiency");
  const [plant, setPlant] = useState<Plant>("WTE_RTM_01");

  const selectClass = "w-full rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-green";

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical size={16} className="text-brand-muted" />
        <h3 className="text-sm font-semibold text-slate-200">Alert Simulation Controls (UAT)</h3>
      </div>
      <p className="text-xs text-slate-500">
        Inject test alerts at L2 (Warning), L3 (Critical), or L4 (Escalated) to verify
        the alert engine, dashboard UI, and escalation routing.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">KPI / Metric</label>
          <select value={kpi} onChange={e => setKpi(e.target.value as KPI)} className={selectClass}>
            {KPI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Plant</label>
          <select value={plant} onChange={e => setPlant(e.target.value as Plant)} className={selectClass}>
            {PLANT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Level buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {([2, 3, 4] as Level[]).map(lvl => {
          const cfg = LEVEL_CONFIG[lvl];
          return (
            <button
              key={lvl}
              onClick={() => simulate.mutate({ kpi_name: kpi, plant_id: plant, level: lvl })}
              disabled={simulate.isPending}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-lg text-white text-xs font-semibold py-2.5 px-3 transition-colors disabled:opacity-50",
                cfg.bg
              )}
            >
              <Zap size={12} className={cfg.icon} />
              {simulate.isPending ? "…" : cfg.label}
            </button>
          );
        })}
      </div>

      {/* Clear */}
      <button
        onClick={() => clear.mutate()}
        disabled={clear.isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-50 text-slate-300 text-xs font-medium py-2.5 px-4 transition-colors border border-surface-600"
      >
        <Trash2 size={13} />
        {clear.isPending ? "Clearing…" : "Clear All Simulated Alerts"}
      </button>

      {simulate.isSuccess && (
        <p className="text-xs text-emerald-400 font-medium">
          Alert injected: {String(simulate.data?.message ?? "").slice(0, 70)}
        </p>
      )}
    </div>
  );
}
