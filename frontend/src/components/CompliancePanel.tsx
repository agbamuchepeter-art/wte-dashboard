import clsx from "clsx";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { ComplianceStatus, PollutantReading, RAGStatus } from "../types";

const RAG_BAR: Record<RAGStatus, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red:   "bg-red-500",
};
const RAG_TEXT: Record<RAGStatus, string> = {
  green: "text-emerald-300",
  amber: "text-amber-300",
  red:   "text-red-300",
};
const RAG_BADGE: Record<RAGStatus, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  red:   "bg-red-500/20 text-red-300 border-red-500/40",
};

function PollutantBar({ p }: { p: PollutantReading }) {
  const pct = Math.min(p.pct_of_limit, 120);
  const display = Math.min(pct, 100);
  return (
    <div className="rounded-lg bg-surface-900/50 p-4 border border-surface-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{p.name}</span>
          <span className="text-xs text-slate-500">EU IED limit: {p.limit} {p.unit}</span>
        </div>
        <span className={clsx("text-xs font-bold", RAG_TEXT[p.rag])}>
          {p.value.toFixed(1)} {p.unit}
        </span>
      </div>
      {/* Progress bar */}
      <div className="relative h-3 rounded-full bg-surface-700 overflow-visible">
        <div
          className={clsx("h-3 rounded-full transition-all", RAG_BAR[p.rag])}
          style={{ width: `${display}%` }}
        />
        {/* 90% amber threshold marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-amber-400/60"
          style={{ left: "90%" }}
          title="Amber threshold (90% of limit)"
        />
        {/* 100% limit marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-red-500/80"
          style={{ left: "100%" }}
          title="EU IED Limit (100%)"
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-slate-600">{p.pct_of_limit.toFixed(1)}% of limit</span>
        <span className={clsx("text-xs font-semibold", RAG_TEXT[p.rag])}>
          {p.rag === "green" ? "Compliant" : p.rag === "amber" ? "Near Limit" : "BREACH"}
        </span>
      </div>
    </div>
  );
}

interface Props {
  data: ComplianceStatus;
}

export function CompliancePanel({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.overall_rag === "red"
            ? <ShieldAlert size={18} className="text-red-400" />
            : <ShieldCheck size={18} className="text-brand-green" />
          }
          <div>
            <h3 className="text-sm font-semibold text-white">EU IED 2010/75/EU Compliance</h3>
            <p className="text-xs text-slate-500">Daily emissions vs. permit limits — {data.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right text-xs">
          <div className={clsx("rounded-full px-2.5 py-1 font-bold border", RAG_BADGE[data.overall_rag])}>
            {data.overall_rag.toUpperCase()}
          </div>
          <div className="rounded-full px-2.5 py-1 border border-surface-700 text-slate-400 font-medium">
            CEMS: {data.cems_status}
          </div>
          <div className="rounded-full px-2.5 py-1 border border-surface-700 text-slate-400 font-medium">
            Data: {data.data_availability_pct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Pollutant bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.pollutants.map(p => <PollutantBar key={p.name} p={p} />)}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Amber ≥90% of limit</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-500" /> Red ≥100% (breach)</span>
      </div>
    </div>
  );
}
