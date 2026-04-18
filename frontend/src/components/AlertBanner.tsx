import { AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { SystemAlert, AlertSeverity } from "../types";

interface AlertBannerProps {
  alerts: SystemAlert[];
}

const SEV: Record<AlertSeverity, { bg: string; text: string; icon: JSX.Element }> = {
  escalated: {
    bg: "bg-purple-950/70 border-purple-700",
    text: "text-purple-300",
    icon: <XCircle size={15} className="text-purple-400 shrink-0" />,
  },
  critical: {
    bg: "bg-red-950/70 border-red-700",
    text: "text-red-300",
    icon: <XCircle size={15} className="text-red-400 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-950/70 border-amber-700",
    text: "text-amber-300",
    icon: <AlertTriangle size={15} className="text-amber-400 shrink-0" />,
  },
  info: {
    bg: "bg-blue-950/70 border-blue-700",
    text: "text-blue-300",
    icon: <Info size={15} className="text-blue-400 shrink-0" />,
  },
};

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts
    .filter((a) => !dismissed.has(a.id))
    .slice(0, 5);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-6 pt-4">
      {visible.map((a) => {
        const s = SEV[a.severity] ?? SEV.info;
        return (
          <div
            key={a.id}
            className={clsx(
              "flex items-center gap-3 rounded-lg border px-4 py-2 text-sm",
              s.bg
            )}
          >
            {s.icon}
            <span className={clsx("flex-1 font-medium", s.text)}>{a.message}</span>
            <span className="text-xs text-slate-500 shrink-0">{a.timestamp}</span>
            <button
              onClick={() => setDismissed((d) => new Set([...d, a.id]))}
              className="ml-2 text-slate-500 hover:text-slate-300 shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
