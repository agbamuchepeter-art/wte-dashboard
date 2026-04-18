import { createContext, useContext, useState, useMemo } from "react";
import type { Period } from "../types";

export interface FilterApiParams {
  period?:    string;
  date_from?: string;
  date_to?:   string;
}

interface FilterState {
  period:     Period;
  plantId:    string;
  liveMode:   boolean;
  customFrom: string;
  customTo:   string;
  /** Human-readable label for the current period selection. */
  periodLabel: string;
  /** Params to spread into API calls — period string OR date_from/date_to for custom. */
  filterParams: FilterApiParams;
  /** Stable cache key for React Query queryKey arrays. */
  filterCacheKey: string;
  setPeriod:      (p: Period) => void;
  setPlantId:     (id: string) => void;
  setLiveMode:    (on: boolean) => void;
  setCustomRange: (from: string, to: string) => void;
}

const PERIOD_LABELS: Record<Period, string> = {
  today:        "Today",
  "7d":         "Last 7 Days",
  "30d":        "Last 30 Days",
  "90d":        "Last 90 Days",
  "this-month": "This Month",
  "this-year":  "This Year",
  custom:       "Custom Range",
};

const Ctx = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [period,     setPeriod]     = useState<Period>("today");
  const [plantId,    setPlantId]    = useState<string>("all");
  const [liveMode,   setLiveMode]   = useState<boolean>(true);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo,   setCustomTo]   = useState<string>("");

  function setCustomRange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
  }

  const periodLabel = useMemo(() => {
    if (period === "custom" && customFrom && customTo) {
      return `${customFrom} → ${customTo}`;
    }
    return PERIOD_LABELS[period];
  }, [period, customFrom, customTo]);

  const filterParams = useMemo<FilterApiParams>(() => {
    if (period === "custom") {
      return {
        date_from: customFrom || undefined,
        date_to:   customTo   || undefined,
      };
    }
    return { period };
  }, [period, customFrom, customTo]);

  const filterCacheKey = useMemo(() => {
    if (period === "custom") return `custom:${customFrom}..${customTo}`;
    return period;
  }, [period, customFrom, customTo]);

  return (
    <Ctx.Provider value={{
      period, plantId, liveMode, customFrom, customTo,
      periodLabel, filterParams, filterCacheKey,
      setPeriod, setPlantId, setLiveMode, setCustomRange,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFilters(): FilterState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be inside FilterProvider");
  return ctx;
}
