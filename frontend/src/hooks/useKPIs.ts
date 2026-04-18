import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useFilters } from "../contexts/FilterContext";
import type { SystemAlert } from "../types";

const STALE = 30_000;

/** Daily KPIs respecting the current global filters (period + plant). */
export function useFilteredDailyKPIs() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["daily-kpis-filtered", plantId, filterCacheKey],
    queryFn:   () => api.kpis.daily(plantId, undefined, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

/** Daily KPIs with RAG for the specified plant/date (raw — no filter context). */
export function useDailyKPIs(plant_id?: string, date?: string) {
  return useQuery({
    queryKey: ["daily-kpis", plant_id, date],
    queryFn:  () => api.kpis.daily(plant_id, date),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

/** Per-plant KPIs respecting the current global filters. */
export function useFilteredPerPlantKPIs() {
  const { filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["per-plant-kpis-filtered", filterCacheKey],
    queryFn:   () => api.kpis.perPlant(undefined, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

/** Daily KPIs broken out per plant (raw). */
export function usePerPlantKPIs(date?: string) {
  return useQuery({
    queryKey:  ["per-plant-kpis", date],
    queryFn:   () => api.kpis.perPlant(date),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

/** Active system alerts filtered by current global filters. */
export function useFilteredAlerts() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["system-alerts-filtered", plantId, filterCacheKey],
    queryFn:   () => api.alerts.list(plantId, 100, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}

/** Active system alerts (raw, no filter context). */
export function useSystemAlerts(plant_id?: string) {
  return useQuery({
    queryKey:  ["system-alerts", plant_id],
    queryFn:   () => api.alerts.list(plant_id, 50),
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}

/** Full filter diagnostic — zero stale time, always fresh. Used by FilterDiagnosticPanel. */
export function useFilterDiagnostic() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["filter-diagnostic", plantId, filterCacheKey],
    queryFn:   () => api.metrics.filterDiagnostic(filterParams.period, plantId),
    staleTime: 0,
    gcTime:    5_000,
  });
}

/** Debug record count for current filters. */
export function useDebugInfo() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["debug-info", plantId, filterCacheKey],
    queryFn:   () => api.metrics.debug({ plant_id: plantId, ...filterParams }),
    staleTime: 60_000,
  });
}

export function useSimulateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kpi_name, plant_id }: { kpi_name: string; plant_id: string }) =>
      api.alerts.simulate(kpi_name, plant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-alerts"] });
      qc.invalidateQueries({ queryKey: ["system-alerts-filtered"] });
    },
  });
}

export function useClearSimulated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.alerts.clear(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-alerts"] });
      qc.invalidateQueries({ queryKey: ["system-alerts-filtered"] });
    },
  });
}
