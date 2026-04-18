import { type ReactNode } from "react";
import clsx from "clsx";

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
  color?: "blue" | "green" | "amber" | "red" | "purple";
}

const colorMap = {
  blue:   { border: "border-blue-500",   icon: "text-blue-400",   value: "text-blue-300" },
  green:  { border: "border-emerald-500", icon: "text-emerald-400", value: "text-emerald-300" },
  amber:  { border: "border-amber-500",  icon: "text-amber-400",  value: "text-amber-300" },
  red:    { border: "border-red-500",    icon: "text-red-400",    value: "text-red-300" },
  purple: { border: "border-purple-500", icon: "text-purple-400", value: "text-purple-300" },
};

export function KPICard({
  label,
  value,
  sub,
  icon,
  trend,
  alert,
  color = "blue",
}: KPICardProps) {
  const c = colorMap[color];
  return (
    <div
      className={clsx(
        "relative flex flex-col gap-2 rounded-xl bg-surface-800 p-5 border-l-4 shadow-lg",
        c.border,
        alert && "ring-1 ring-red-500/40"
      )}
    >
      {alert && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className="flex items-center gap-2">
        <span className={clsx("opacity-80", c.icon)}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
      <p className={clsx("text-3xl font-bold", c.value)}>{value}</p>
      {sub && (
        <p className="text-xs text-slate-500">
          {trend === "up" && <span className="text-emerald-400 mr-1">▲</span>}
          {trend === "down" && <span className="text-red-400 mr-1">▼</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
