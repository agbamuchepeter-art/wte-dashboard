import clsx from "clsx";
import { Database, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import type { DataTrust, PipelineStage, RAGStatus } from "../types";

const RAG_BADGE: Record<RAGStatus, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  red:   "bg-red-500/20 text-red-300 border-red-500/40",
};

function StageNode({ stage, isLast }: { stage: PipelineStage; isLast: boolean }) {
  const icon =
    stage.status === "ok"      ? <CheckCircle2 size={14} className="text-emerald-400" /> :
    stage.status === "warning" ? <AlertTriangle size={14} className="text-amber-400" /> :
                                  <XCircle size={14} className="text-red-400" />;
  const bg =
    stage.status === "ok"      ? "bg-emerald-500/10 border-emerald-500/30" :
    stage.status === "warning" ? "bg-amber-500/10 border-amber-500/30" :
                                  "bg-red-500/10 border-red-500/30";

  return (
    <div className="flex items-center gap-2">
      <div className={clsx("rounded-lg border px-3 py-2 flex items-center gap-2 min-w-0", bg)}>
        {icon}
        <div>
          <div className="text-xs font-semibold text-white whitespace-nowrap">{stage.stage}</div>
          {stage.latency_ms > 0 && (
            <div className="text-xs text-slate-500 font-mono">{stage.latency_ms.toFixed(0)}ms</div>
          )}
        </div>
      </div>
      {!isLast && <ArrowRight size={14} className="text-surface-600 shrink-0" />}
    </div>
  );
}

interface Props {
  data: DataTrust;
}

export function DataTrustPanel({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Completeness",
            value: `${data.completeness_pct.toFixed(1)}%`,
            rag: data.completeness_pct >= 98 ? "green" : data.completeness_pct >= 90 ? "amber" : "red",
          },
          {
            label: "Freshness",
            value: data.data_freshness_hours < 24 ? `${data.data_freshness_hours.toFixed(0)}h` : `${(data.data_freshness_hours / 24).toFixed(1)}d`,
            rag: data.data_freshness_hours < 24 ? "green" : data.data_freshness_hours < 48 ? "amber" : "red",
          },
          {
            label: "Total Records",
            value: data.records_total.toLocaleString(),
            rag: "green",
          },
          {
            label: "Valid Records",
            value: data.records_valid.toLocaleString(),
            rag: data.records_valid >= data.records_total * 0.98 ? "green" : "amber",
          },
        ].map(item => (
          <div key={item.label} className="rounded-lg bg-surface-800 border border-surface-700 p-3">
            <div className={clsx("text-xl font-bold tabular-nums", {
              "text-emerald-300": item.rag === "green",
              "text-amber-300":   item.rag === "amber",
              "text-red-300":     item.rag === "red",
            })}>{item.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Source info */}
      <div className="rounded-lg bg-surface-900/50 border border-surface-700/50 p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Database size={13} className="text-brand-muted" />
          <span>Source: <span className="font-mono text-slate-200">{data.source_file}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx("rounded-full px-2 py-0.5 font-bold border", RAG_BADGE[data.overall_rag])}>
            {data.overall_rag.toUpperCase()}
          </span>
          <span className="text-slate-500 font-mono">{data.last_sync.slice(0, 10)}</span>
        </div>
      </div>

      {/* Pipeline flow */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Data Pipeline: CSV → Dashboard
        </h4>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 pb-2 min-w-max">
            {data.pipeline_stages.map((stage, i) => (
              <StageNode key={stage.stage} stage={stage} isLast={i === data.pipeline_stages.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
