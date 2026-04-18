import clsx from "clsx";
import { Users, TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";
import type { CommunityData, RAGStatus } from "../types";

const RAG_RING: Record<RAGStatus, string> = {
  green: "stroke-emerald-500",
  amber: "stroke-amber-500",
  red:   "stroke-red-500",
};
const RAG_TEXT: Record<RAGStatus, string> = {
  green: "text-emerald-300",
  amber: "text-amber-300",
  red:   "text-red-300",
};
const RAG_BG: Record<RAGStatus, string> = {
  green: "bg-emerald-500/10 border-emerald-500/40",
  amber: "bg-amber-500/10 border-amber-500/40",
  red:   "bg-red-500/10 border-red-500/40",
};

function ApprovalGauge({ rating, rag }: { rating: number; rag: RAGStatus }) {
  const radius = 54;
  const circum = 2 * Math.PI * radius;
  const arc    = circum * 0.75; // 270° arc
  const filled = arc * (rating / 100);
  const offset = circum * 0.125; // start at 7 o'clock

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 140 }}>
      <svg width={160} height={140} viewBox="0 0 160 140">
        {/* Background arc */}
        <circle cx={80} cy={86} r={radius} fill="none" strokeWidth={12}
          stroke="#1e3354" strokeDasharray={`${arc} ${circum - arc}`}
          strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(0 80 86)" />
        {/* Filled arc */}
        <circle cx={80} cy={86} r={radius} fill="none" strokeWidth={12}
          className={RAG_RING[rag]}
          strokeDasharray={`${filled} ${circum - filled}`}
          strokeDashoffset={-offset} strokeLinecap="round" transform="rotate(0 80 86)"
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-2">
        <span className={clsx("text-3xl font-black tabular-nums", RAG_TEXT[rag])}>
          {rating.toFixed(0)}%
        </span>
        <span className="text-xs text-slate-500 font-medium">Approval</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up")   return <TrendingUp size={14} className="text-emerald-400" />;
  if (trend === "down") return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-slate-400" />;
}

interface Props {
  data: CommunityData;
}

export function CommunityPanel({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <ApprovalGauge rating={data.approval_rating} rag={data.rag} />
          <div className="flex items-center gap-1.5 text-sm">
            <TrendIcon trend={data.trend} />
            <span className={clsx("font-semibold", data.trend_delta >= 0 ? "text-emerald-300" : "text-red-300")}>
              {data.trend_delta >= 0 ? "+" : ""}{data.trend_delta.toFixed(1)} pp
            </span>
            <span className="text-slate-500">vs last period</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-1 space-y-3">
          <div className={clsx("rounded-lg border p-4", RAG_BG[data.rag])}>
            <div className="flex items-start gap-2">
              <Users size={15} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">{data.narrative}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-center">
              <div className="text-2xl font-bold text-brand-green">{data.engagement_score.toFixed(0)}%</div>
              <div className="text-xs text-slate-500 mt-0.5">Engagement Score</div>
            </div>
            <div className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-center">
              <div className={clsx("text-2xl font-bold", data.complaints_this_month > 10 ? "text-amber-300" : "text-slate-200")}>
                {data.complaints_this_month}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Complaints (Month)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert threshold */}
      <div className="rounded-lg bg-surface-900/50 border border-surface-700/50 p-3 flex items-center gap-2 text-xs text-slate-500">
        <MessageSquare size={13} className="text-brand-muted shrink-0" />
        Alert triggered if approval falls below 70% (current threshold). Community Manager notified automatically.
      </div>
    </div>
  );
}
