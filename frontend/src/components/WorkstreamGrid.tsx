import clsx from "clsx";
import type { WorkstreamItem, RAGStatus } from "../types";

const RAG_STYLES: Record<RAGStatus, { border: string; badge: string; dot: string }> = {
  green: { border: "border-emerald-500/40", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", dot: "bg-emerald-400" },
  amber: { border: "border-amber-500/40",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",   dot: "bg-amber-400 animate-pulse" },
  red:   { border: "border-red-500/40",     badge: "bg-red-500/20 text-red-300 border-red-500/40",         dot: "bg-red-500 animate-pulse" },
};

interface Props {
  workstreams: WorkstreamItem[];
}

export function WorkstreamGrid({ workstreams }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {workstreams.map((ws) => {
        const s = RAG_STYLES[ws.status];
        return (
          <div
            key={ws.id}
            className={clsx(
              "rounded-xl bg-surface-800 border p-4 flex flex-col gap-2 hover:bg-surface-750 transition-colors",
              s.border
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-white leading-tight">{ws.name}</h3>
              <span className={clsx("shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border", s.badge)}>
                <span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />
                {ws.status.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-brand-green font-medium font-mono">{ws.linked_kpi}</p>

            {ws.detail && (
              <p className="text-xs text-slate-500 leading-relaxed">{ws.detail}</p>
            )}

            <div className="flex items-center justify-between mt-1 pt-2 border-t border-surface-700/50">
              <span className="text-xs text-slate-600">
                <span className="text-slate-500 font-medium">{ws.owner}</span>
              </span>
              <span className="text-xs text-slate-600 font-mono">{ws.last_updated}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
