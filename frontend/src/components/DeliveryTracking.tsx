import clsx from "clsx";
import { GitBranch, CheckCircle2, Loader2, AlertOctagon } from "lucide-react";
import type { DeliveryTracking, SprintFeature, RAGStatus } from "../types";

const RAG_BADGE: Record<RAGStatus, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  red:   "bg-red-500/20 text-red-300 border-red-500/40",
};

const STATUS_STYLE: Record<SprintFeature["status"], { icon: typeof CheckCircle2; color: string; bg: string }> = {
  completed:   { icon: CheckCircle2,   color: "text-emerald-400", bg: "bg-emerald-500/10" },
  in_progress: { icon: Loader2,        color: "text-blue-400",    bg: "bg-blue-500/10" },
  blocked:     { icon: AlertOctagon,   color: "text-red-400",     bg: "bg-red-500/10" },
};

function FeatureRow({ f }: { f: SprintFeature }) {
  const s = STATUS_STYLE[f.status];
  const Icon = s.icon;
  return (
    <div className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg", s.bg)}>
      <Icon size={14} className={clsx("shrink-0", s.color, f.status === "in_progress" && "animate-spin")} />
      <span className="flex-1 text-sm text-slate-200 leading-snug">{f.name}</span>
      <div className="text-right text-xs text-slate-500 shrink-0">
        <div>{f.assignee}</div>
        <div className="font-mono text-brand-muted">{f.story_points}pts</div>
      </div>
    </div>
  );
}

interface Props {
  data: DeliveryTracking;
}

export function DeliveryTrackingPanel({ data }: Props) {
  const pct = Math.min(data.completion_pct, 100);

  return (
    <div className="space-y-5">
      {/* Sprint header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <GitBranch size={15} className="text-brand-muted" />
            <h3 className="text-sm font-bold text-white">{data.sprint_name}</h3>
            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border", RAG_BADGE[data.rag])}>
              {data.rag.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">{data.start_date} → {data.end_date}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-brand-green">{pct.toFixed(0)}%</div>
          <div className="text-xs text-slate-500">Complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Sprint progress</span>
          <span className="font-mono">{data.velocity} / {data.target_velocity} pts</span>
        </div>
        <div className="h-3 rounded-full bg-surface-700 overflow-hidden">
          <div
            className="h-3 rounded-full bg-brand-green transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Completed",   value: data.features_completed,   color: "text-emerald-300" },
          { label: "In Progress", value: data.features_in_progress, color: "text-blue-300" },
          { label: "Blocked",     value: data.features_blocked,     color: data.features_blocked > 0 ? "text-red-300" : "text-slate-400" },
        ].map(item => (
          <div key={item.label} className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-center">
            <div className={clsx("text-2xl font-bold", item.color)}>{item.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Feature list */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {data.features.map((f, i) => <FeatureRow key={i} f={f} />)}
      </div>
    </div>
  );
}
