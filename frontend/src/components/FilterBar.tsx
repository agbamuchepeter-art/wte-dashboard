import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Wifi, WifiOff, ChevronDown, CalendarDays } from "lucide-react";
import { useFilters } from "../contexts/FilterContext";
import { api } from "../api/client";
import type { Period } from "../types";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today",       label: "Today" },
  { value: "7d",          label: "Last 7 Days" },
  { value: "30d",         label: "Last 30 Days" },
  { value: "90d",         label: "Last 90 Days" },
  { value: "this-month",  label: "This Month" },
  { value: "this-year",   label: "This Year" },
  { value: "custom",      label: "Custom Range" },
];

const PLANTS = [
  { value: "all",        label: "All Plants" },
  { value: "WTE_RTM_01", label: "WTE_RTM_01 — Port" },
  { value: "WTE_RTM_02", label: "WTE_RTM_02 — City" },
];

const INPUT_CLS =
  "rounded-lg bg-surface-800 border border-surface-700 text-slate-200 text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-green cursor-pointer";

export function FilterBar() {
  const {
    period, plantId, liveMode,
    customFrom, customTo,
    setPeriod, setPlantId, setLiveMode, setCustomRange,
  } = useFilters();

  const { data: meta } = useQuery({
    queryKey:  ["dataset-meta"],
    queryFn:   () => api.metrics.meta(),
    staleTime: 300_000,
  });

  const [pendingFrom, setPendingFrom] = useState(customFrom);
  const [pendingTo,   setPendingTo]   = useState(customTo);

  const earliest = meta?.earliest_date ?? "";
  const latest   = meta?.latest_date   ?? "";

  function handlePeriodChange(p: Period) {
    if (p !== "custom") {
      setPeriod(p);
    } else {
      // Pre-fill custom inputs with current range if empty
      if (!pendingFrom && latest) setPendingFrom(latest);
      if (!pendingTo   && latest) setPendingTo(latest);
      setPeriod("custom");
    }
  }

  function applyCustomRange() {
    if (pendingFrom && pendingTo) {
      setCustomRange(pendingFrom, pendingTo);
    }
  }

  const customReady = period === "custom" && pendingFrom && pendingTo;

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* Period selector */}
      <div className="relative flex items-center">
        <CalendarDays size={12} className="absolute left-3 text-slate-500 pointer-events-none" />
        <select
          value={period}
          onChange={e => handlePeriodChange(e.target.value as Period)}
          className={clsx(INPUT_CLS, "pl-8 pr-7")}
        >
          {PERIOD_OPTIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 text-slate-500 pointer-events-none" />
      </div>

      {/* Custom date inputs — only shown when "Custom Range" is selected */}
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={pendingFrom}
            min={earliest}
            max={pendingTo || latest}
            onChange={e => setPendingFrom(e.target.value)}
            className={INPUT_CLS}
          />
          <span className="text-slate-600 text-xs select-none">→</span>
          <input
            type="date"
            value={pendingTo}
            min={pendingFrom || earliest}
            max={latest}
            onChange={e => setPendingTo(e.target.value)}
            className={INPUT_CLS}
          />
          <button
            onClick={applyCustomRange}
            disabled={!customReady}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border",
              customReady
                ? "bg-brand-green text-black border-brand-green hover:bg-brand-green/90"
                : "bg-surface-800 border-surface-700 text-slate-600 cursor-not-allowed"
            )}
          >
            Apply
          </button>
        </div>
      )}

      {/* Plant filter */}
      <div className="relative flex items-center">
        <select
          value={plantId}
          onChange={e => setPlantId(e.target.value)}
          className={clsx(INPUT_CLS, "pr-7")}
        >
          {PLANTS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 text-slate-500 pointer-events-none" />
      </div>

      {/* Live mode toggle */}
      <button
        onClick={() => setLiveMode(!liveMode)}
        className={clsx(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors",
          liveMode
            ? "bg-brand-green/10 border-brand-green/40 text-brand-green"
            : "bg-surface-800 border-surface-700 text-slate-500 hover:text-slate-300"
        )}
      >
        {liveMode ? <Wifi size={12} /> : <WifiOff size={12} />}
        Live {liveMode ? "ON" : "OFF"}
      </button>
    </div>
  );
}
