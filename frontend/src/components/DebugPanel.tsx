import { useState } from "react";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import { useFilters } from "../contexts/FilterContext";
import { useDebugInfo } from "../hooks/useKPIs";

const PERIOD_LABEL: Record<string, string> = {
  today: "Today",
  "7d":  "Last 7 Days",
  "30d": "Last 30 Days",
};

export function DebugPanel({ recordCount }: { recordCount?: number }) {
  const [open, setOpen] = useState(false);
  const { period, plantId, liveMode } = useFilters();
  const { data: debugInfo } = useDebugInfo();

  const records   = debugInfo?.record_count ?? recordCount ?? "—";
  const dateFrom  = debugInfo?.date_from  ?? "—";
  const dateTo    = debugInfo?.date_to    ?? "—";
  const anchor    = debugInfo?.anchor_date    ?? "—";
  const dsLatest  = debugInfo?.dataset_latest ?? "—";

  return (
    <div className="mx-6 mb-3 rounded-lg border border-surface-700/50 bg-surface-900/60 text-xs overflow-hidden">
      {/* Always-visible summary line */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-slate-500 hover:text-slate-400 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Bug size={11} />
          <span className="font-mono font-semibold uppercase tracking-wider">Time Filter Debug</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{PERIOD_LABEL[period]}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{plantId === "all" ? "All Plants" : plantId}</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400 font-mono font-semibold">anchor: {anchor}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 font-mono">{dateFrom} → {dateTo}</span>
          <span className="text-slate-600">·</span>
          <span className="text-brand-green font-semibold">{records} records</span>
        </div>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {/* Expanded detail grid */}
      {open && (
        <div className="px-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-surface-700/50">
          {[
            ["Period",          PERIOD_LABEL[period]],
            ["Plant",           plantId === "all" ? "All Plants" : plantId],
            ["Dataset Latest",  dsLatest],
            ["Anchor (Today)",  anchor],
            ["Resolved From",   dateFrom],
            ["Resolved To",     dateTo],
            ["Record Count",    String(records)],
            ["Live Mode",       liveMode ? "ON" : "OFF"],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-slate-600 uppercase tracking-widest" style={{ fontSize: "9px" }}>{label}</div>
              <div className="text-slate-300 font-mono mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
