import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { DashboardFilters, MetricKey } from "../types";

const STALE = 30_000; // 30 s

export function usePlants() {
  return useQuery({
    queryKey: ["plants"],
    queryFn: api.plants.list,
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

export function useKPIs(filters: Partial<DashboardFilters>) {
  return useQuery({
    queryKey: ["kpis", filters],
    queryFn: () => api.metrics.kpis(filters),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

export function useTimeSeries(metric: MetricKey, filters: Partial<DashboardFilters>) {
  return useQuery({
    queryKey: ["timeseries", metric, filters],
    queryFn: () => api.metrics.timeseries(metric, filters),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

export function useComparison(filters: Partial<DashboardFilters>) {
  return useQuery({
    queryKey: ["comparison", filters],
    queryFn: () => api.metrics.comparison(filters),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

export function useAlerts(plant_id?: string) {
  return useQuery({
    queryKey: ["alerts", plant_id],
    queryFn: () => api.alerts.list(plant_id, 30),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}

export function useWasteBreakdown(plant_id: string) {
  return useQuery({
    queryKey: ["waste-breakdown", plant_id],
    queryFn: () => api.plants.wasteBreakdown(plant_id),
    staleTime: STALE,
    enabled: !!plant_id && plant_id !== "all",
  });
}
