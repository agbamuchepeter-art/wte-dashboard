import { useState } from "react";
import clsx from "clsx";
import {
  LayoutDashboard, Factory, Zap, TrendingUp,
  ShieldCheck, Users, Network, GitBranch, Bell,
  Wifi, WifiOff, RefreshCw, Database,
  ChevronDown, ChevronUp, X, BellRing,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { GreenGridLogo }            from "../components/GreenGridLogo";
import { RAGKPICard }               from "../components/RAGKPICard";
import { FilterBar }                from "../components/FilterBar";
import { KPIDrilldown }             from "../components/KPIDrilldown";
import { DebugPanel }               from "../components/DebugPanel";
import { FilterDiagnosticPanel }    from "../components/FilterDiagnosticPanel";

function DevPanels({ recordCount }: { recordCount?: number }) {
  return (
    <div className="pt-3 space-y-0">
      <FilterDiagnosticPanel />
      <DebugPanel recordCount={recordCount} />
    </div>
  );
}
import { ExecutiveSummaryPanel }    from "../components/ExecutiveSummary";
import { WorkstreamGrid }           from "../components/WorkstreamGrid";
import { CompliancePanel }          from "../components/CompliancePanel";
import { CommunityPanel }           from "../components/CommunityPanel";
import { IntegrationHealthPanel }   from "../components/IntegrationHealth";
import { DeliveryTrackingPanel }    from "../components/DeliveryTracking";
import { DataTrustPanel }           from "../components/DataTrustPanel";
import { TestingControls }          from "../components/TestingControls";
import { SimulateAlertControls }    from "../components/AlertPanel";

import { FilterProvider, useFilters } from "../contexts/FilterContext";
import { useLiveData }               from "../hooks/useLiveData";
import {
  useFilteredDailyKPIs,
  useFilteredPerPlantKPIs,
  useFilteredAlerts,
} from "../hooks/useKPIs";
import {
  useExecutiveSummary, useWorkstreams, useCompliance,
  useCommunity, useIntegration, useDelivery, useDataTrust,
  useAcknowledgeAlert,
} from "../hooks/useProgramme";
import { useQuery }   from "@tanstack/react-query";
import { api }        from "../api/client";
import type { DashboardTab, RAGStatus, SystemAlert } from "../types";

// ── Shared ─────────────────────────────────────────────────────────────────────

const CHART = { green: "#22c55e", blue: "#60a5fa", grid: "#1e3354", text: "#64748b" };

const RAG_PILL: Record<RAGStatus, string> = {
  green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  red:   "bg-red-500/20 text-red-300 border-red-500/40",
};

const TABS: { id: DashboardTab; label: string; Icon: React.ElementType }[] = [
  { id: "overview",    label: "Overview",    Icon: LayoutDashboard },
  { id: "operations",  label: "Operations",  Icon: Factory },
  { id: "energy",      label: "Energy",      Icon: Zap },
  { id: "financials",  label: "Financials",  Icon: TrendingUp },
  { id: "compliance",  label: "Compliance",  Icon: ShieldCheck },
  { id: "community",   label: "Community",   Icon: Users },
  { id: "integration", label: "Integration", Icon: Network },
  { id: "delivery",    label: "Delivery",    Icon: GitBranch },
  { id: "alerts",      label: "Alerts",      Icon: Bell },
];

function Section({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function LoadSkel() {
  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-3 animate-pulse">
      <div className="h-4 w-32 rounded bg-surface-700" />
      <div className="h-8 w-24 rounded bg-surface-700" />
      <div className="h-3 w-48 rounded bg-surface-700" />
    </div>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-surface-900 border border-surface-600 p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5 font-mono">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value.toFixed(1)}</strong></p>
      ))}
    </div>
  );
}

// ── Period label helper ────────────────────────────────────────────────────────

function PeriodSub() {
  const { periodLabel, plantId } = useFilters();
  const plant = plantId === "all" ? "All plants" : plantId;
  return <span className="text-xs text-slate-500">{periodLabel} · {plant}</span>;
}

// ── Header alert dropdown ──────────────────────────────────────────────────────

function HeaderAlerts({ alerts, criticalCount }: { alerts: SystemAlert[]; criticalCount: number }) {
  const [open, setOpen] = useState(false);
  const ack = useAcknowledgeAlert();
  const count = alerts.length;
  const l4 = alerts.some(a => a.alert_level >= 4);

  const SEV: Record<string,{row:string;badge:string;text:string}> = {
    escalated:{row:"border-l-2 border-purple-500 bg-purple-950/30",badge:"bg-purple-500/20 text-purple-300 border border-purple-500/40",text:"text-purple-300"},
    critical: {row:"border-l-2 border-red-500 bg-red-950/30",      badge:"bg-red-500/20 text-red-300 border border-red-500/40",        text:"text-red-300"},
    warning:  {row:"border-l-2 border-amber-500 bg-amber-950/20",  badge:"bg-amber-500/20 text-amber-300 border border-amber-500/40",  text:"text-amber-300"},
    info:     {row:"border-l-2 border-blue-500 bg-blue-950/20",    badge:"bg-blue-500/20 text-blue-300 border border-blue-500/40",     text:"text-blue-300"},
  };

  const ago = (ts: string) => {
    try {
      const d = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
      if (d < 60) return `${d}s ago`;
      if (d < 3600) return `${Math.floor(d / 60)}m ago`;
      return `${Math.floor(d / 3600)}h ago`;
    } catch { return ts.slice(0, 10); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          l4            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse" :
          criticalCount ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse" :
          count         ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                          "bg-surface-700 text-slate-400 border border-surface-600"
        )}
      >
        {criticalCount ? <BellRing size={15} /> : <Bell size={15} />}
        <span>{count} Alert{count !== 1 ? "s" : ""}</span>
        {criticalCount > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">{criticalCount}</span>}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-surface-600 bg-surface-800 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
            <span className="text-sm font-semibold text-slate-200">Active Alerts</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
          </div>
          {count === 0
            ? <div className="px-4 py-6 text-center text-sm text-slate-500">All systems nominal</div>
            : (
              <div className="max-h-96 overflow-y-auto divide-y divide-surface-700/50">
                {alerts.map(a => {
                  const s = SEV[a.severity] ?? SEV.info;
                  return (
                    <div key={a.id} className={clsx("px-4 py-3", s.row)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={clsx("rounded px-1.5 py-0.5 text-xs font-bold uppercase", s.badge)}>L{a.alert_level} {a.severity}</span>
                            {a.simulated && <span className="rounded px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40">SIM</span>}
                          </div>
                          <p className={clsx("text-xs leading-snug", s.text)}>{a.message}</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-slate-600 font-mono">{ago(a.timestamp)}</span>
                            <span className="text-xs text-slate-600">{a.owner}</span>
                          </div>
                          {a.action_required && <p className="text-xs text-slate-500 mt-1 italic">{a.action_required.slice(0, 60)}…</p>}
                        </div>
                        {!a.acknowledged && a.alert_level >= 3 && (
                          <button onClick={() => ack.mutate(a.id)} className="shrink-0 text-xs px-2 py-1 rounded bg-surface-700 hover:bg-surface-600 text-slate-400 border border-surface-600">Ack</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}

// ── KPI Drilldown state ────────────────────────────────────────────────────────

interface DrilldownTarget {
  label:  string;
  value:  string;
  unit?:  string;
  rag:    RAGStatus | null;
  metric: string;
}

// ── Tab panels ─────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: summary,     isLoading: sl } = useExecutiveSummary();
  const { data: workstreams, isLoading: wl } = useWorkstreams();
  const { periodLabel, plantId } = useFilters();
  const plant = plantId === "all" ? "All plants" : plantId;
  return (
    <div className="space-y-5">
      <Section
        title="Programme Executive Summary"
        sub={`${periodLabel} · ${plant} · Auto-generated from live system data`}
      >
        {sl || !summary ? <LoadSkel /> : <ExecutiveSummaryPanel data={summary} />}
      </Section>
      <Section
        title="Programme Workstreams"
        sub={`12 workstreams — RAG driven by live KPIs · ${periodLabel} · ${plant}`}
      >
        {wl || !workstreams
          ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{Array.from({length:12}).map((_,i)=><LoadSkel key={i}/>)}</div>
          : <WorkstreamGrid workstreams={workstreams} />}
      </Section>
    </div>
  );
}

function OperationsTab({ onDrilldown }: { onDrilldown: (t: DrilldownTarget) => void }) {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  const { data: kpis } = useFilteredDailyKPIs();
  const { data: perPlant } = useFilteredPerPlantKPIs();
  const { data: tsThroughput } = useQuery({
    queryKey: ["ts","weight_tons", plantId, filterCacheKey],
    queryFn:  () => api.metrics.timeseries("weight_tons", { plant_id: plantId, granularity:"daily", ...filterParams }),
    staleTime: 60_000,
  });

  const sparkThroughput = (tsThroughput?.series ?? []).filter(p => !p.plant_id || p.plant_id === plantId || plantId === "all");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis ? <>
          <RAGKPICard
            label={kpis.waste_throughput.label} value={kpis.waste_throughput.formatted} unit="" rag={kpis.waste_throughput.rag} icon={<Factory size={15}/>}
            sub={<PeriodSub />} thresholdNote="Target >= 1,370 t/day"
            sparklineData={sparkThroughput}
            onClick={() => onDrilldown({ label: kpis.waste_throughput.label, value: kpis.waste_throughput.formatted, rag: kpis.waste_throughput.rag, metric:"weight_tons" })}
          />
          <RAGKPICard label={kpis.downtime_hours.label} value={kpis.downtime_hours.formatted} unit="" rag={kpis.downtime_hours.rag} icon={<RefreshCw size={15}/>} thresholdNote="Target < 1h/day" />
          <RAGKPICard label={kpis.cumulative_waste_ytd.label} value={kpis.cumulative_waste_ytd.formatted} unit="" rag={null} icon={<Database size={15}/>} sub="Cumulative year-to-date" />
          <RAGKPICard label={kpis.data_latency.label} value={kpis.data_latency.formatted} unit="" rag={null} icon={<Wifi size={15}/>} sub="Since last data sync" />
        </> : Array.from({length:4}).map((_,i)=><LoadSkel key={i}/>)}
      </div>
      {/* Per-plant breakdown — hide when a specific plant is selected (redundant) */}
      {perPlant && plantId === "all" && (
        <Section title="Per-Plant Status" sub="KPI averages per plant for selected period">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {perPlant.map(p => (
              <div key={p.plant_id} className="rounded-lg bg-surface-900/50 border border-surface-700/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">{p.plant_id}</h4>
                  <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border", RAG_PILL[p.efficiency.rag ?? "green"])}>{p.efficiency.formatted}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {([["Throughput",p.waste_throughput.formatted],["Downtime",p.downtime_hours.formatted],["Profit",p.daily_profit.formatted],["Energy",p.energy_output.formatted]] as [string,string][]).map(([l,v])=>(
                    <div key={l} className="flex justify-between"><span className="text-slate-500">{l}</span><span className="text-slate-200 font-mono">{v}</span></div>
                  ))}
                </div>
                {p.record_count ? <div className="text-xs text-slate-600">{p.record_count} records</div> : null}
              </div>
            ))}
          </div>
        </Section>
      )}
      {tsThroughput?.series?.length ? (
        <Section title="Throughput Trend" sub={<PeriodSub />}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tsThroughput.series.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="date" tick={{fontSize:10,fill:CHART.text}} tickFormatter={v=>v.slice(5)} />
              <YAxis tick={{fontSize:10,fill:CHART.text}} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="value" name="Throughput (t)" stroke={CHART.green} fill={CHART.green+"22"} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      ) : null}
    </div>
  );
}

function EnergyTab({ onDrilldown }: { onDrilldown: (t: DrilldownTarget) => void }) {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  const { data: kpis } = useFilteredDailyKPIs();
  const { data: tsEnergy } = useQuery({
    queryKey: ["ts","energy_output_mwh", plantId, filterCacheKey],
    queryFn:  () => api.metrics.timeseries("energy_output_mwh", { plant_id: plantId, granularity:"daily", ...filterParams }),
    staleTime: 60_000,
  });
  const { data: tsEff } = useQuery({
    queryKey: ["ts","efficiency_pct", plantId, filterCacheKey],
    queryFn:  () => api.metrics.timeseries("efficiency_pct", { plant_id: plantId, granularity:"daily", ...filterParams }),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis ? <>
          <RAGKPICard
            label={kpis.efficiency.label} value={kpis.efficiency.formatted} unit="" rag={kpis.efficiency.rag} icon={<Zap size={15}/>}
            thresholdNote="Target >= 65%" sub={<PeriodSub />}
            sparklineData={tsEff?.series}
            onClick={() => onDrilldown({ label: kpis.efficiency.label, value: kpis.efficiency.formatted, rag: kpis.efficiency.rag, metric:"efficiency_pct" })}
          />
          <RAGKPICard
            label={kpis.energy_output.label} value={kpis.energy_output.formatted} unit="" rag={null} icon={<Zap size={15}/>}
            sub={<PeriodSub />}
            sparklineData={tsEnergy?.series}
            onClick={() => onDrilldown({ label: kpis.energy_output.label, value: kpis.energy_output.formatted, rag: null, metric:"energy_output_mwh" })}
          />
          <RAGKPICard label={kpis.downtime_hours.label} value={kpis.downtime_hours.formatted} unit="" rag={kpis.downtime_hours.rag} icon={<RefreshCw size={15}/>} />
        </> : Array.from({length:3}).map((_,i)=><LoadSkel key={i}/>)}
      </div>
      {tsEnergy?.series?.length ? (
        <Section title="Energy Generation Trend" sub={<PeriodSub />}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tsEnergy.series.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="date" tick={{fontSize:10,fill:CHART.text}} tickFormatter={v=>v.slice(5)} />
              <YAxis tick={{fontSize:10,fill:CHART.text}} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="value" name="Energy (MWh)" stroke={CHART.blue} fill={CHART.blue+"22"} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      ) : null}
      {tsEff?.series?.length ? (
        <Section title="Efficiency Trend" sub={<PeriodSub />}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tsEff.series.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="date" tick={{fontSize:10,fill:CHART.text}} tickFormatter={v=>v.slice(5)} />
              <YAxis tick={{fontSize:10,fill:CHART.text}} domain={[0,100]} />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="value" name="Efficiency (%)" stroke={CHART.green} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      ) : null}
    </div>
  );
}

function FinancialsTab({ onDrilldown }: { onDrilldown: (t: DrilldownTarget) => void }) {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  const { data: kpis } = useFilteredDailyKPIs();
  const { data: tsPpt } = useQuery({
    queryKey: ["ts","profit_per_ton", plantId, filterCacheKey],
    queryFn:  () => api.metrics.timeseries("profit_per_ton", { plant_id: plantId, granularity:"daily", ...filterParams }),
    staleTime: 60_000,
  });
  const { data: tsProfit } = useQuery({
    queryKey: ["ts","profit_eur", plantId, filterCacheKey],
    queryFn:  () => api.metrics.timeseries("profit_eur", { plant_id: plantId, granularity:"daily", ...filterParams }),
    staleTime: 60_000,
  });
  const { data: comparison } = useQuery({
    queryKey: ["comparison", filterCacheKey],
    queryFn:  () => api.metrics.comparison({ ...filterParams }),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis ? <>
          <RAGKPICard
            label={kpis.daily_profit.label} value={kpis.daily_profit.formatted} unit="" rag={kpis.daily_profit.rag} icon={<TrendingUp size={15}/>}
            thresholdNote="Target > EUR 10,000" sub={<PeriodSub />}
            sparklineData={tsProfit?.series}
            onClick={() => onDrilldown({ label: kpis.daily_profit.label, value: kpis.daily_profit.formatted, rag: kpis.daily_profit.rag, metric:"profit_eur" })}
          />
          <RAGKPICard label={kpis.waste_throughput.label} value={kpis.waste_throughput.formatted} unit="" rag={kpis.waste_throughput.rag} icon={<Factory size={15}/>} sub="Revenue driver" />
          <RAGKPICard label={kpis.cumulative_waste_ytd.label} value={kpis.cumulative_waste_ytd.formatted} unit="" rag={null} icon={<Database size={15}/>} sub="Year-to-date tonnage" />
        </> : Array.from({length:3}).map((_,i)=><LoadSkel key={i}/>)}
      </div>
      {tsPpt?.series?.length ? (
        <Section title="Profit per Tonne Trend" sub={<PeriodSub />}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tsPpt.series.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="date" tick={{fontSize:10,fill:CHART.text}} tickFormatter={v=>v.slice(5)} />
              <YAxis tick={{fontSize:10,fill:CHART.text}} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="value" name="Profit/t (EUR)" stroke={CHART.green} fill={CHART.green+"22"} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      ) : null}
      {comparison?.length ? (
        <Section title="Plant Financial Comparison" sub={<PeriodSub />}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-700 text-slate-500 text-left">
                  {["Plant","Revenue","Cost","Profit","Efficiency","Status"].map(h=><th key={h} className="pb-2 pr-4 font-semibold uppercase tracking-wider">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {comparison.map(p=>(
                  <tr key={p.plant_id} className="hover:bg-surface-800 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-white">{p.plant_id}</td>
                    <td className="py-2.5 pr-4 text-emerald-300 font-mono">€{p.total_revenue_eur.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    <td className="py-2.5 pr-4 text-red-300 font-mono">€{p.total_cost_eur.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    <td className={clsx("py-2.5 pr-4 font-mono font-bold",p.total_profit_eur>0?"text-emerald-300":"text-red-300")}>€{p.total_profit_eur.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{p.avg_efficiency_pct.toFixed(1)}%</td>
                    <td className="py-2.5"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold",p.status==="operational"?"bg-emerald-500/20 text-emerald-300":p.status==="maintenance"?"bg-amber-500/20 text-amber-300":"bg-red-500/20 text-red-300")}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function ComplianceTab() {
  const { data: comp, isLoading } = useCompliance();
  const { periodLabel, plantId } = useFilters();
  return (
    <div className="space-y-5">
      <Section
        title="EU IED Emissions Compliance"
        sub={`EU Industrial Emissions Directive 2010/75/EU · ${periodLabel} · ${plantId === "all" ? "All plants" : plantId}`}
      >
        {isLoading || !comp ? <LoadSkel /> : <CompliancePanel data={comp} />}
      </Section>
    </div>
  );
}

function CommunityTab() {
  const { data: community, isLoading } = useCommunity();
  const { periodLabel, plantId } = useFilters();
  return (
    <div className="space-y-5">
      <Section
        title="Community Engagement"
        sub={`Public approval rating · ${periodLabel} · ${plantId === "all" ? "All plants" : plantId}`}
      >
        {isLoading || !community ? <LoadSkel /> : <CommunityPanel data={community} />}
      </Section>
    </div>
  );
}

function IntegrationTab() {
  const { data: integration, isLoading: il } = useIntegration();
  const { data: dataTrust,   isLoading: dl } = useDataTrust();
  return (
    <div className="space-y-5">
      <Section title="System Integration Health" sub="Real-time connectivity — current system state (not period-filtered)">
        {il || !integration ? <LoadSkel /> : <IntegrationHealthPanel data={integration} />}
      </Section>
      <Section title="Data Trust & Pipeline Visibility" sub="CSV source to dashboard — end-to-end pipeline health">
        {dl || !dataTrust ? <LoadSkel /> : <DataTrustPanel data={dataTrust} />}
      </Section>
    </div>
  );
}

function DeliveryTab() {
  const { data: delivery, isLoading } = useDelivery();
  return (
    <div className="space-y-5">
      <Section title="Sprint Delivery Tracking" sub="Sprint-based tracking — not period-filtered">
        {isLoading || !delivery ? <LoadSkel /> : <DeliveryTrackingPanel data={delivery} />}
      </Section>
    </div>
  );
}

function AlertsTab({ alerts }: { alerts: SystemAlert[] }) {
  const ack = useAcknowledgeAlert();
  const { periodLabel, plantId } = useFilters();

  const SEV: Record<string,{row:string;badge:string;text:string}> = {
    escalated:{row:"border-l-2 border-purple-500 bg-purple-950/30",badge:"bg-purple-500/20 text-purple-300 border border-purple-500/40",text:"text-purple-300"},
    critical: {row:"border-l-2 border-red-500 bg-red-950/30",      badge:"bg-red-500/20 text-red-300 border border-red-500/40",        text:"text-red-300"},
    warning:  {row:"border-l-2 border-amber-500 bg-amber-950/20",  badge:"bg-amber-500/20 text-amber-300 border border-amber-500/40",  text:"text-amber-300"},
    info:     {row:"border-l-2 border-blue-500 bg-blue-950/20",    badge:"bg-blue-500/20 text-blue-300 border border-blue-500/40",     text:"text-blue-300"},
  };
  const ago = (ts:string) => { try { const d=Math.round((Date.now()-new Date(ts).getTime())/1000); if(d<60)return`${d}s ago`; if(d<3600)return`${Math.floor(d/60)}m ago`; return`${Math.floor(d/3600)}h ago`; } catch { return ts.slice(0,10); } };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="Advanced Alert Simulation" sub="Test L2/L3/L4 across all KPIs and emissions"><TestingControls /></Section>
        <Section title="Quick Controls" sub="Fast single-KPI simulate and clear"><SimulateAlertControls /></Section>
      </div>
      <Section
        title="Active Alert Log"
        sub={`${alerts.length} alert(s) · ${periodLabel} · ${plantId === "all" ? "All plants" : plantId} · L2 Warning | L3 Critical | L4 Escalated`}
      >
        {alerts.length === 0
          ? <div className="py-8 text-center text-sm text-slate-500">No alerts for selected filter</div>
          : (
            <div className="space-y-2">
              {alerts.map(a=>{
                const s=SEV[a.severity]??SEV.info;
                return (
                  <div key={a.id} className={clsx("rounded-lg px-4 py-3",s.row)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={clsx("rounded px-1.5 py-0.5 text-xs font-bold uppercase",s.badge)}>L{a.alert_level} {a.severity}</span>
                          <span className="text-xs text-slate-500 font-semibold">{a.kpi_label}</span>
                          {a.simulated&&<span className="rounded px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40">SIMULATED</span>}
                          {a.escalated_at&&<span className="rounded px-1.5 py-0.5 text-xs font-bold bg-purple-600/30 text-purple-200 border border-purple-500/40">ESCALATED</span>}
                        </div>
                        <p className={clsx("text-sm font-medium leading-snug",s.text)}>{a.message}</p>
                        {a.action_required&&<p className="text-xs text-slate-500 mt-1 italic">{a.action_required}</p>}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
                          <span>Value: <strong className="text-slate-400">{a.current_value} {a.unit}</strong></span>
                          <span>Threshold: <strong className="text-slate-400">{a.threshold_breached} {a.unit}</strong></span>
                          <span>Owner: <strong className="text-slate-400">{a.owner}</strong></span>
                          <span className="font-mono">{ago(a.timestamp)}</span>
                        </div>
                      </div>
                      {!a.acknowledged&&a.alert_level>=3&&(
                        <button onClick={()=>ack.mutate(a.id)} className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-300 border border-surface-600 font-medium">Acknowledge</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Section>
    </div>
  );
}

// ── Root (inner — inside FilterProvider) ──────────────────────────────────────

function DashboardInner() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [drilldown, setDrilldown] = useState<DrilldownTarget | null>(null);

  const { liveMode, plantId, filterParams, filterCacheKey } = useFilters();
  const devMode = new URLSearchParams(window.location.search).has("dev");

  // WS: only for connection state + real-time alerts signal
  const { readings, connected, lastUpdated } = useLiveData(liveMode);

  // Always use filtered REST KPIs (header strip + all tabs)
  const { data: filteredKPIs } = useFilteredDailyKPIs();

  // Filtered alerts (honours plant + date range)
  const { data: filteredAlerts = [] } = useFilteredAlerts();

  const alertCount    = filteredAlerts.length;
  const criticalCount = filteredAlerts.filter(a => a.alert_level >= 3).length;
  const l4Count       = filteredAlerts.filter(a => a.alert_level >= 4).length;

  // Drilldown timeseries
  const { data: drillData } = useQuery({
    queryKey: ["drilldown", drilldown?.metric, plantId, filterCacheKey],
    queryFn:  () => api.metrics.timeseries(
      drilldown!.metric as import("../types").MetricKey,
      { plant_id: plantId, granularity:"daily", ...filterParams }
    ),
    enabled:  !!drilldown,
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#060d1b 0%,#0a1628 50%,#0f2040 100%)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-surface-700/60" style={{ background:"rgba(6,13,27,0.96)", backdropFilter:"blur(12px)" }}>
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <GreenGridLogo height={36} showText />
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <FilterBar />
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {connected
                ? <><Wifi size={12} className="text-brand-green"/><span className="text-brand-green">LIVE</span></>
                : liveMode
                  ? <><WifiOff size={12} className="text-red-400"/><span className="text-red-400">OFFLINE</span></>
                  : <><WifiOff size={12} className="text-slate-500"/><span className="text-slate-500">PAUSED</span></>
              }
              {lastUpdated && <span className="text-slate-600 hidden sm:inline ml-1">{lastUpdated.toLocaleTimeString()}</span>}
            </div>
            <HeaderAlerts alerts={filteredAlerts} criticalCount={criticalCount + l4Count} />
          </div>
        </div>

        {/* ── General Summary strip ─────────────────────────────────────────── */}
        {filteredKPIs && (
          <div className="max-w-screen-2xl mx-auto px-6 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <RAGKPICard label={filteredKPIs.waste_throughput.label} value={filteredKPIs.waste_throughput.formatted} unit="" rag={filteredKPIs.waste_throughput.rag} icon={<Factory size={13}/>} />
              <RAGKPICard label={filteredKPIs.efficiency.label}       value={filteredKPIs.efficiency.formatted}       unit="" rag={filteredKPIs.efficiency.rag}       icon={<Zap size={13}/>} />
              <RAGKPICard label={filteredKPIs.downtime_hours.label}   value={filteredKPIs.downtime_hours.formatted}   unit="" rag={filteredKPIs.downtime_hours.rag}   icon={<RefreshCw size={13}/>} />
              <RAGKPICard label={filteredKPIs.daily_profit.label}     value={filteredKPIs.daily_profit.formatted}     unit="" rag={filteredKPIs.daily_profit.rag}     icon={<TrendingUp size={13}/>} />
            </div>
          </div>
        )}
      </header>

      {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-[var(--h,104px)] z-30 border-b border-surface-700/40" style={{ background:"rgba(10,22,40,0.92)", backdropFilter:"blur(8px)" }}>
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx("flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all shrink-0",
                  activeTab===id ? "border-brand-green text-brand-green" : "border-transparent text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon size={12} />
                {label}
                {id==="alerts" && alertCount>0 && (
                  <span className={clsx("rounded-full px-1.5 py-0.5 text-xs font-bold text-white",
                    l4Count>0?"bg-purple-600 animate-pulse":criticalCount>0?"bg-red-500 animate-pulse":"bg-amber-500"
                  )}>{alertCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Developer diagnostic panels — hidden by default, enable via ?dev=1 ── */}
      {devMode && (
        <DevPanels recordCount={filteredKPIs?.record_count} />
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-6 py-3">
        {activeTab==="overview"    && <OverviewTab />}
        {activeTab==="operations"  && <OperationsTab  onDrilldown={setDrilldown} />}
        {activeTab==="energy"      && <EnergyTab      onDrilldown={setDrilldown} />}
        {activeTab==="financials"  && <FinancialsTab  onDrilldown={setDrilldown} />}
        {activeTab==="compliance"  && <ComplianceTab />}
        {activeTab==="community"   && <CommunityTab />}
        {activeTab==="integration" && <IntegrationTab />}
        {activeTab==="delivery"    && <DeliveryTab />}
        {activeTab==="alerts"      && <AlertsTab alerts={filteredAlerts} />}
      </main>

      <footer className="border-t border-surface-700/30 py-4 px-6 mt-8">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>GreenGrid Urban Solutions — WTE Rotterdam Programme Dashboard v2.0</span>
          <span className="font-mono">{readings.length} live feeds | {lastUpdated?.toLocaleString() ?? "—"}</span>
        </div>
      </footer>

      {/* ── KPI Drilldown modal ──────────────────────────────────────────────── */}
      {drilldown && (
        <KPIDrilldown
          label={drilldown.label}
          value={drilldown.value}
          unit={drilldown.unit}
          rag={drilldown.rag}
          period={filterParams.period ?? "custom"}
          series={drillData?.series ?? []}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}

// ── Root (exported) ────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <FilterProvider>
      <DashboardInner />
    </FilterProvider>
  );
}
