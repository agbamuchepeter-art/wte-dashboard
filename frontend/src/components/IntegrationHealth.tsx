import clsx from "clsx";
import { Network, CheckCircle2, XCircle, Clock, Wifi } from "lucide-react";
import type { IntegrationHealth, IntegrationComponent, RAGStatus } from "../types";

const RAG_ROW: Record<RAGStatus, string> = {
  green: "border-l-emerald-500 bg-emerald-950/10",
  amber: "border-l-amber-500 bg-amber-950/10",
  red:   "border-l-red-500 bg-red-950/10",
};
const RAG_BADGE: Record<RAGStatus, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  red:   "bg-red-500/20 text-red-300 border-red-500/40",
};
const RAG_DOT: Record<RAGStatus, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400 animate-pulse",
  red:   "bg-red-500 animate-pulse",
};
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  Connected: CheckCircle2,
  Live:      CheckCircle2,
  Valid:     CheckCircle2,
  Healthy:   CheckCircle2,
  ok:        CheckCircle2,
};

function ComponentRow({ c }: { c: IntegrationComponent }) {
  const Icon = STATUS_ICON[c.status] ?? XCircle;
  const iconClass = c.rag === "green" ? "text-emerald-400" : c.rag === "amber" ? "text-amber-400" : "text-red-400";

  return (
    <div className={clsx("flex items-center gap-4 px-4 py-3 rounded-lg border-l-2", RAG_ROW[c.rag])}>
      <Icon size={16} className={clsx("shrink-0", iconClass)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{c.name}</span>
          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border", RAG_BADGE[c.rag])}>
            {c.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">{c.detail}</p>
      </div>
      <div className="text-right text-xs text-slate-500 shrink-0">
        {c.latency_ms !== null && c.latency_ms !== undefined ? (
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span>{c.latency_ms.toFixed(0)}ms</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface Props {
  data: IntegrationHealth;
}

export function IntegrationHealthPanel({ data }: Props) {
  const lastSeen = new Date(data.timestamp).toLocaleTimeString();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network size={16} className="text-brand-muted" />
          <h3 className="text-sm font-semibold text-white">System Integration Health</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={clsx("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold border", RAG_BADGE[data.overall_rag])}>
            <span className={clsx("h-1.5 w-1.5 rounded-full", RAG_DOT[data.overall_rag])} />
            {data.overall_rag.toUpperCase()}
          </span>
          <span className="text-slate-500 font-mono">{lastSeen}</span>
        </div>
      </div>

      {/* Components */}
      <div className="space-y-2">
        {data.components.map(c => <ComponentRow key={c.name} c={c} />)}
      </div>

      {/* Data latency summary */}
      <div className="rounded-lg bg-surface-900/50 border border-surface-700/50 p-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Wifi size={13} className="text-brand-muted" />
          <span>End-to-end data latency</span>
        </div>
        <span className={clsx("font-mono font-bold",
          data.data_latency_seconds < 86400 ? "text-emerald-300" :
          data.data_latency_seconds < 172800 ? "text-amber-300" : "text-red-300"
        )}>
          {data.data_latency_seconds >= 3600
            ? `${(data.data_latency_seconds / 3600).toFixed(1)}h`
            : data.data_latency_seconds >= 60
            ? `${(data.data_latency_seconds / 60).toFixed(0)}m`
            : `${data.data_latency_seconds.toFixed(0)}s`
          }
        </span>
      </div>
    </div>
  );
}
