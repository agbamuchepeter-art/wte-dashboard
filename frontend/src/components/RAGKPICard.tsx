import { type ReactNode } from "react";
import clsx from "clsx";
import { ZoomIn } from "lucide-react";
import type { RAGStatus, TimeSeriesPoint } from "../types";
import { Sparkline } from "./Sparkline";

interface RAGKPICardProps {
  label: string;
  value: string;
  unit?: string;
  rag: RAGStatus | null;
  icon: ReactNode;
  sub?: ReactNode;
  thresholdNote?: string;
  loading?: boolean;
  sparklineData?: TimeSeriesPoint[];
  onClick?: () => void;
}

const RAG_STYLES: Record<string, {
  border: string;
  badge: string;
  badgeText: string;
  value: string;
  glow: string;
  dot: string;
  spark: string;
}> = {
  green: {
    border:    "border-emerald-500",
    badge:     "bg-emerald-500/20 border border-emerald-500/50",
    badgeText: "text-emerald-300",
    value:     "text-emerald-300",
    glow:      "shadow-emerald-900/30",
    dot:       "bg-emerald-400",
    spark:     "#22c55e",
  },
  amber: {
    border:    "border-amber-500",
    badge:     "bg-amber-500/20 border border-amber-500/50",
    badgeText: "text-amber-300",
    value:     "text-amber-300",
    glow:      "shadow-amber-900/30",
    dot:       "bg-amber-400 animate-pulse",
    spark:     "#f59e0b",
  },
  red: {
    border:    "border-red-500",
    badge:     "bg-red-500/20 border border-red-500/50",
    badgeText: "text-red-300",
    value:     "text-red-300",
    glow:      "shadow-red-900/30",
    dot:       "bg-red-500 animate-pulse",
    spark:     "#ef4444",
  },
};

const RAG_LABEL: Record<string, string> = {
  green: "GREEN",
  amber: "AMBER",
  red:   "RED",
};

export function RAGKPICard({
  label,
  value,
  unit,
  rag,
  icon,
  sub,
  thresholdNote,
  loading,
  sparklineData,
  onClick,
}: RAGKPICardProps) {
  const s = rag ? RAG_STYLES[rag] : RAG_STYLES.green;

  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative flex flex-col gap-2 rounded-xl bg-surface-800 p-5 border-l-4 shadow-lg transition-colors",
        s.border,
        s.glow,
        onClick ? "cursor-pointer hover:bg-surface-700" : ""
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {rag && (
            <span className={clsx("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold", s.badge)}>
              <span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />
              <span className={s.badgeText}>{RAG_LABEL[rag]}</span>
            </span>
          )}
          {onClick && <ZoomIn size={12} className="text-slate-600" />}
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-9 w-32 animate-pulse rounded bg-surface-700" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className={clsx("text-3xl font-bold tabular-nums", rag ? s.value : "text-slate-200")}>
            {value}
          </span>
          {unit && <span className="text-sm text-slate-500">{unit}</span>}
        </div>
      )}

      {/* Sub / threshold note */}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {thresholdNote && (
        <p className={clsx("text-xs font-medium", rag ? s.badgeText : "text-slate-500")}>
          {thresholdNote}
        </p>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-1 -mx-1">
          <Sparkline data={sparklineData} color={s.spark} />
        </div>
      )}
    </div>
  );
}
