import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useFilters } from "../contexts/FilterContext";

const SLOW = 60_000;
const FAST = 10_000;

export function useExecutiveSummary() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["executive-summary", plantId, filterCacheKey],
    queryFn:   () => api.programme.summary(plantId, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: FAST,
    refetchInterval: FAST,
  });
}

export function useWorkstreams() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["workstreams", plantId, filterCacheKey],
    queryFn:   () => api.programme.workstreams(plantId, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: SLOW,
    refetchInterval: SLOW,
  });
}

export function useDataTrust() {
  return useQuery({
    queryKey:  ["data-trust"],
    queryFn:   () => api.programme.dataTrust(),
    staleTime: SLOW,
    refetchInterval: SLOW,
  });
}

export function useCompliance() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["compliance", plantId, filterCacheKey],
    queryFn:   () => api.compliance.get(plantId, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: SLOW,
    refetchInterval: SLOW,
  });
}

export function useCompliancePerPlant() {
  const { filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["compliance-per-plant", filterCacheKey],
    queryFn:   () => api.compliance.perPlant(filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: SLOW,
    refetchInterval: SLOW,
  });
}

export function useCommunity() {
  const { plantId, filterParams, filterCacheKey } = useFilters();
  return useQuery({
    queryKey:  ["community", plantId, filterCacheKey],
    queryFn:   () => api.community.get(plantId, filterParams.date_from, filterParams.date_to, filterParams.period),
    staleTime: SLOW,
    refetchInterval: SLOW,
  });
}

export function useIntegration() {
  return useQuery({
    queryKey:  ["integration"],
    queryFn:   () => api.integration.get(),
    staleTime: FAST,
    refetchInterval: FAST,
  });
}

export function useDelivery() {
  return useQuery({
    queryKey:  ["delivery"],
    queryFn:   () => api.delivery.get(),
    staleTime: SLOW,
    refetchInterval: SLOW,
  });
}

export function useSimulateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kpi_name, plant_id, level }: { kpi_name: string; plant_id: string; level: number }) =>
      api.alerts.simulate(kpi_name, plant_id, level),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-alerts"] });
      qc.invalidateQueries({ queryKey: ["system-alerts-filtered"] });
      qc.invalidateQueries({ queryKey: ["executive-summary"] });
      qc.invalidateQueries({ queryKey: ["workstreams"] });
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
      qc.invalidateQueries({ queryKey: ["executive-summary"] });
    },
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alert_id: string) => api.alerts.acknowledge(alert_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-alerts"] });
      qc.invalidateQueries({ queryKey: ["system-alerts-filtered"] });
    },
  });
}
