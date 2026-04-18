import clsx from "clsx";
import { Zap, Weight, TrendingUp, DollarSign } from "lucide-react";
import { EfficiencyGauge } from "./EfficiencyGauge";
import type { LiveReading } from "../types";

const STATUS_STYLE: Record<string, string> = {
  operational: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  maintenance: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
  downtime:    "bg-red-500/20 text-red-400 border border-red-500/40",
};

const EFFICIENCY_THRESHOLD = 65;

interface PlantStatusProps {
  reading: LiveReading;
  name: string;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

export function PlantStatus({ reading, name }: PlantStatusProps) {
  const isAlert = reading.alert_active;
  return (
    <div
      className={clsx(
        "rounded-xl bg-surface-800 p-5 shadow-lg border",
        isAlert ? "border-red-500/50" : "border-surface-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{reading.plant_id}</p>
          <h3 className="font-bold text-slate-100">{name}</h3>
          <p className="text-xs text-slate-400">{reading.location}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={clsx("rounded-full px-3 py-0.5 text-xs font-semibold capitalize", STATUS_STYLE[reading.status])}>
            {reading.status}
          </span>
          {isAlert && (
            <span className="text-xs text-red-400 animate-pulse font-medium">● ALERT</span>
          )}
        </div>
      </div>

      {/* Gauge */}
      <div className="flex justify-center mb-4">
        <EfficiencyGauge value={reading.efficiency_pct} threshold={EFFICIENCY_THRESHOLD} size={150} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 border-t border-surface-700 pt-4">
        <Stat icon={<Zap size={14} />} label="Energy Output" value={`${reading.energy_output_mwh.toLocaleString()} MWh`} />
        <Stat icon={<Weight size={14} />} label="Waste Input" value={`${reading.waste_input_tons.toLocaleString()} t`} />
        <Stat icon={<TrendingUp size={14} />} label="Energy / Ton" value={`${reading.energy_per_ton.toFixed(2)} MWh/t`} />
        <Stat icon={<DollarSign size={14} />} label="Profit / Ton" value={`EUR ${reading.profit_per_ton.toFixed(2)}`} />
      </div>

      {/* Timestamp */}
      <p className="mt-3 text-right text-xs text-slate-600 font-mono">
        {new Date(reading.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
