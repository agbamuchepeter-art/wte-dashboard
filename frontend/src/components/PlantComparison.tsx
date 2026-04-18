import clsx from "clsx";
import type { PlantComparisonItem } from "../types";

interface PlantComparisonProps {
  data: PlantComparisonItem[];
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function EffBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = value >= 75 ? "bg-emerald-500" : value >= 65 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-surface-700">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-mono text-slate-300">{value.toFixed(1)}%</span>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  operational: "bg-emerald-500",
  maintenance: "bg-amber-500",
  downtime: "bg-red-500",
};

export function PlantComparison({ data }: PlantComparisonProps) {
  if (!data.length) return null;

  const maxEff = Math.max(...data.map((d) => d.avg_efficiency_pct));

  const rows: { label: string; render: (d: PlantComparisonItem) => string | React.ReactNode }[] = [
    { label: "Status", render: (d) => (
      <span className="flex items-center gap-1.5 capitalize">
        <span className={clsx("h-2 w-2 rounded-full", STATUS_DOT[d.status] ?? "bg-slate-500")} />
        {d.status}
      </span>
    )},
    { label: "Avg Efficiency", render: (d) => <EffBar value={d.avg_efficiency_pct} max={maxEff} /> },
    { label: "Total Waste (tons)", render: (d) => fmt(d.total_waste_tons) },
    { label: "Total Energy (MWh)", render: (d) => fmt(d.total_energy_mwh) },
    { label: "Avg Energy / Ton", render: (d) => `${d.avg_energy_per_ton.toFixed(3)} MWh/t` },
    { label: "Total Revenue", render: (d) => `EUR ${fmt(d.total_revenue_eur)}` },
    { label: "Total Cost", render: (d) => `EUR ${fmt(d.total_cost_eur)}` },
    { label: "Total Profit", render: (d) => (
      <span className={d.total_profit_eur >= 0 ? "text-emerald-400" : "text-red-400"}>
        EUR {fmt(d.total_profit_eur)}
      </span>
    )},
    { label: "Avg Profit / Ton", render: (d) => (
      <span className={d.avg_profit_per_ton >= 0 ? "text-emerald-400" : "text-red-400"}>
        EUR {d.avg_profit_per_ton.toFixed(2)}
      </span>
    )},
    { label: "Operational Records", render: (d) => fmt(d.operational_days) },
    { label: "Maintenance Records", render: (d) => (
      <span className="text-amber-400">{fmt(d.maintenance_records)}</span>
    )},
    { label: "Downtime Records", render: (d) => (
      <span className={d.downtime_records > 0 ? "text-red-400" : "text-slate-400"}>
        {fmt(d.downtime_records)}
      </span>
    )},
  ];

  return (
    <div className="rounded-xl bg-surface-800 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-slate-200">Plant Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-500 w-44">
                Metric
              </th>
              {data.map((d) => (
                <th key={d.plant_id} className="px-5 py-3 text-left text-xs font-semibold text-slate-300">
                  <p className="text-slate-500 font-mono text-xs">{d.plant_id}</p>
                  <p>{d.location}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={clsx("border-b border-surface-700/50", i % 2 === 0 ? "bg-surface-800" : "bg-surface-900/30")}
              >
                <td className="px-5 py-3 text-xs text-slate-500 font-medium">{row.label}</td>
                {data.map((d) => (
                  <td key={d.plant_id} className="px-5 py-3 text-slate-200">
                    {row.render(d)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
