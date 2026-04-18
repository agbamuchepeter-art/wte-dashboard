import clsx from "clsx";
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, XCircle, AlertOctagon } from "lucide-react";
import type { ExecutiveSummary, RAGStatus } from "../types";

const RAG_BG: Record<RAGStatus, string> = {
  green: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
  amber: "bg-amber-500/10 border-amber-500/40 text-amber-300",
  red:   "bg-red-500/10 border-red-500/40 text-red-300",
};
const RAG_PILL: Record<RAGStatus, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  red:   "bg-red-500/20 text-red-300 border-red-500/40",
};
const RAG_DOT: Record<RAGStatus, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400 animate-pulse",
  red:   "bg-red-500 animate-pulse",
};
const RAG_LABEL: Record<RAGStatus, string> = {
  green: "GREEN",
  amber: "AMBER",
  red:   "RED",
};

function RAGBadge({ rag, label }: { rag: RAGStatus; label: string }) {
  return (
    <span className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border", RAG_PILL[rag])}>
      <span className={clsx("h-2 w-2 rounded-full", RAG_DOT[rag])} />
      {label}: {RAG_LABEL[rag]}
    </span>
  );
}

function RiskIcon({ rag }: { rag: RAGStatus }) {
  if (rag === "red")   return <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />;
  if (rag === "amber") return <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />;
  return <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />;
}

interface Props {
  data: ExecutiveSummary;
}

export function ExecutiveSummaryPanel({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* Top status bar */}
      <div className={clsx(
        "rounded-xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4",
        RAG_BG[data.programme_rag]
      )}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon size={18} className="shrink-0" />
            <h2 className="text-sm font-black uppercase tracking-widest">Programme Status</h2>
          </div>
          <p className="text-sm leading-relaxed opacity-90">{data.summary_narrative}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <RAGBadge rag={data.programme_rag}  label="Programme" />
          <RAGBadge rag={data.compliance_rag} label="Compliance" />
          <RAGBadge rag={data.revenue_health} label="Revenue" />
        </div>
      </div>

      {/* Metric pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Alerts",  value: data.active_alerts_count,  color: data.active_alerts_count > 0 ? "text-amber-300" : "text-emerald-300" },
          { label: "Critical (L3)",  value: data.critical_alerts_count, color: data.critical_alerts_count > 0 ? "text-red-300" : "text-emerald-300" },
          { label: "L4 Escalated",  value: data.l4_escalations,        color: data.l4_escalations > 0 ? "text-red-400 animate-pulse" : "text-emerald-300" },
          { label: "Systems",        value: "All Online",               color: "text-brand-green" },
        ].map(item => (
          <div key={item.label} className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-center">
            <div className={clsx("text-2xl font-bold tabular-nums", item.color)}>{item.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Key Risks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={15} className="text-brand-muted" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Top 3 Programme Risks</h3>
        </div>
        <div className="space-y-2">
          {data.key_risks.map(risk => (
            <div
              key={risk.rank}
              className={clsx("rounded-lg border p-4 flex items-start gap-3", RAG_BG[risk.rag])}
            >
              <RiskIcon rag={risk.rag} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">Risk {risk.rank}</span>
                </div>
                <p className="text-sm font-semibold leading-snug">{risk.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-4 text-xs opacity-70">
                  <span><strong>Impact:</strong> {risk.impact}</span>
                  <span><strong>Likelihood:</strong> {risk.probability}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
