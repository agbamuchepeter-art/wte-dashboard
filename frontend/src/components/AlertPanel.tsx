import { useState } from "react";
import { Bell, BellRing, X, ChevronDown, ChevronUp, Zap, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { SystemAlert } from "../types";
import { useClearSimulated, useSimulateAlert } from "../hooks/useKPIs";

interface AlertPanelProps {
  alerts: SystemAlert[];
  criticalCount: number;
}

const SEV_STYLE: Record<string, { row: string; badge: string; text: string }> = {
  critical: {
    row:   "border-l-2 border-red-500 bg-red-950/30",
    badge: "bg-red-500/20 text-red-300 border border-red-500/40",
    text:  "text-red-300",
  },
  warning: {
    row:   "border-l-2 border-amber-500 bg-amber-950/20",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    text:  "text-amber-300",
  },
  info: {
    row:   "border-l-2 border-blue-500 bg-blue-950/20",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    text:  "text-blue-300",
  },
};

function timeAgo(ts: string): string {
  try {
    const diff = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  } catch {
    return ts.slice(0, 10);
  }
}

/** Compact alert panel — sits in top-right of the header. */
export function AlertPanel({ alerts, criticalCount }: AlertPanelProps) {
  const [open, setOpen] = useState(false);
  const hasCritical = criticalCount > 0;
  const count = alerts.length;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasCritical
            ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
            : count > 0
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            : "bg-surface-700 text-slate-400 border border-surface-600"
        )}
      >
        {hasCritical ? <BellRing size={15} /> : <Bell size={15} />}
        <span>{count} Alert{count !== 1 ? "s" : ""}</span>
        {hasCritical && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
            {criticalCount} CRIT
          </span>
        )}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-surface-600 bg-surface-800 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
            <span className="text-sm font-semibold text-slate-200">Active Alerts</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              All systems nominal
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-surface-700/50">
              {alerts.map((a) => {
                const s = SEV_STYLE[a.severity] ?? SEV_STYLE.info;
                return (
                  <div key={a.id} className={clsx("px-4 py-3", s.row)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={clsx("rounded px-1.5 py-0.5 text-xs font-bold uppercase", s.badge)}>
                            L{a.alert_level} {a.severity}
                          </span>
                          {a.simulated && (
                            <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              SIM
                            </span>
                          )}
                        </div>
                        <p className={clsx("text-xs leading-snug", s.text)}>{a.message}</p>
                        <p className="text-xs text-slate-600 mt-0.5 font-mono">{timeAgo(a.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Simulate Alert button + Clear button for the Alerts section. */
export function SimulateAlertControls() {
  const simulate = useSimulateAlert();
  const clear    = useClearSimulated();

  const [kpi, setKpi] = useState("efficiency");
  const [plant, setPlant] = useState("WTE_RTM_01");

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Alert Simulation (UAT)</h3>
      </div>
      <p className="text-xs text-slate-500">
        Inject a Level 3 Critical RED alert for any KPI. The alert persists until cleared.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">KPI</label>
          <select
            value={kpi}
            onChange={(e) => setKpi(e.target.value)}
            className="w-full rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="efficiency">Efficiency</option>
            <option value="waste_throughput">Waste Throughput</option>
            <option value="downtime_hours">Downtime</option>
            <option value="daily_profit">Profit</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Plant</label>
          <select
            value={plant}
            onChange={(e) => setPlant(e.target.value)}
            className="w-full rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="WTE_RTM_01">WTE_RTM_01 — Port</option>
            <option value="WTE_RTM_02">WTE_RTM_02 — City</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => simulate.mutate({ kpi_name: kpi, plant_id: plant })}
          disabled={simulate.isPending}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition-colors"
        >
          <Zap size={14} />
          {simulate.isPending ? "Triggering…" : "Simulate RED Alert"}
        </button>
        <button
          onClick={() => clear.mutate()}
          disabled={clear.isPending}
          className="flex items-center justify-center gap-2 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-50 text-slate-300 text-sm py-2.5 px-4 transition-colors"
        >
          <Trash2 size={14} />
          {clear.isPending ? "Clearing…" : "Clear Simulated"}
        </button>
      </div>

      {simulate.isSuccess && (
        <p className="text-xs text-red-400 font-medium">
          Alert injected: {simulate.data?.message?.slice(0, 60)}…
        </p>
      )}
    </div>
  );
}
