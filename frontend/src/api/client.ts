import type {
  ComplianceStatus,
  CommunityData,
  DailyKPIs,
  DashboardFilters,
  DatasetMeta,
  DataTrust,
  DeliveryTracking,
  ExecutiveSummary,
  IntegrationHealth,
  KPISummary,
  LiveReading,
  MetricKey,
  PlantComparisonItem,
  PlantInfo,
  SystemAlert,
  TimeSeriesResponse,
  WorkstreamItem,
  WSPayload,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "";

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") p.set(k, v);
  }
  return p.toString() ? `?${p.toString()}` : "";
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API DELETE ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Shared filter params type ─────────────────────────────────────────────────

export interface FilterParams {
  plant_id?:  string;
  date_from?: string;
  date_to?:   string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const api = {
  plants: {
    list: () => get<PlantInfo[]>("/api/v1/plants"),
    get:  (id: string) => get<PlantInfo>(`/api/v1/plants/${id}`),
    wasteBreakdown: (id: string) => get<Record<string, unknown>[]>(`/api/v1/plants/${id}/waste-breakdown`),
  },

  kpis: {
    daily: (plant_id?: string, date?: string, date_from?: string, date_to?: string, period?: string) =>
      get<DailyKPIs>(`/api/v1/kpis${qs({ plant_id, date, date_from, date_to, period })}`),
    perPlant: (date?: string, date_from?: string, date_to?: string, period?: string) =>
      get<DailyKPIs[]>(`/api/v1/kpis/per-plant${qs({ date, date_from, date_to, period })}`),
  },

  metrics: {
    kpis: (f: Partial<DashboardFilters>) =>
      get<KPISummary>(`/api/v1/metrics/kpis${qs({ plant_id: f.plant_id, date_from: f.date_from, date_to: f.date_to })}`),
    timeseries: (metric: MetricKey, f: Partial<DashboardFilters> & { period?: string }) =>
      get<TimeSeriesResponse>(`/api/v1/metrics/timeseries${qs({ metric, plant_id: f.plant_id, granularity: f.granularity, date_from: f.date_from, date_to: f.date_to, period: f.period })}`),
    comparison: (f: Partial<DashboardFilters> & { period?: string }) =>
      get<PlantComparisonItem[]>(`/api/v1/metrics/comparison${qs({ date_from: f.date_from, date_to: f.date_to, period: f.period })}`),
    live: () => get<LiveReading[]>("/api/v1/metrics/live"),
    meta: () => get<DatasetMeta>("/api/v1/metrics/meta"),
    filterDiagnostic: (period?: string, plant_id?: string) =>
      get<{
        timestamp: string;
        dataset: {
          total_rows: number; earliest_date: string; latest_date: string;
          date_column_dtype: string; date_column_sample: string[];
        };
        machine: { today: string; anchor_date: string; anchor_note: string };
        request: { period: string|null; period_label: string; plant_id: string };
        resolved: { start_date: string; end_date: string; expected_days: number };
        filter_result: {
          rows_before_any_filter: number; rows_after_plant_filter: number;
          rows_after_date_filter: number; plant_filter_applied: boolean;
          date_filter_applied: boolean; unique_dates_in_window: number;
          sample_dates_in_window: string[];
        };
        validation: { filter_is_working: boolean; rows_changed: boolean; anomalies: string[] };
      }>(`/api/v1/metrics/filter-diagnostic${qs({ period, plant_id })}`),
    debug: (f: FilterParams & { period?: string }) =>
      get<{
        plant_id: string; period: string|null;
        dataset_latest: string; anchor_date: string;
        date_from: string|null; date_to: string|null;
        record_count: number; date_range: string;
      }>(
        `/api/v1/metrics/debug${qs({ plant_id: f.plant_id, date_from: f.date_from, date_to: f.date_to, period: f.period })}`
      ),
  },

  alerts: {
    list: (plant_id?: string, limit = 50, date_from?: string, date_to?: string, period?: string) =>
      get<SystemAlert[]>(`/api/v1/alerts${qs({ plant_id, limit: String(limit), date_from, date_to, period })}`),
    simulate:    (kpi_name = "efficiency", plant_id = "WTE_RTM_01", level = 3) =>
      post<SystemAlert>("/api/v1/alerts/simulate-alert", { kpi_name, plant_id, level }),
    clear:       () => del<{ cleared: number }>("/api/v1/alerts/simulate-alert"),
    acknowledge: (alert_id: string) =>
      post<{ acknowledged: boolean; alert_id: string }>(`/api/v1/alerts/acknowledge/${alert_id}`, {}),
  },

  compliance: {
    get:      (plant_id?: string, date_from?: string, date_to?: string, period?: string) =>
      get<ComplianceStatus>(`/api/v1/compliance${qs({ plant_id, date_from, date_to, period })}`),
    perPlant: (date_from?: string, date_to?: string, period?: string) =>
      get<ComplianceStatus[]>(`/api/v1/compliance/per-plant${qs({ date_from, date_to, period })}`),
  },

  community: {
    get: (plant_id?: string, date_from?: string, date_to?: string, period?: string) =>
      get<CommunityData>(`/api/v1/community${qs({ plant_id, date_from, date_to, period })}`),
  },

  integration: {
    get: () => get<IntegrationHealth>("/api/v1/integration"),
  },

  delivery: {
    get: () => get<DeliveryTracking>("/api/v1/delivery"),
  },

  programme: {
    summary:    (plant_id?: string, date_from?: string, date_to?: string, period?: string) =>
      get<ExecutiveSummary>(`/api/v1/programme/summary${qs({ plant_id, date_from, date_to, period })}`),
    workstreams:(plant_id?: string, date_from?: string, date_to?: string, period?: string) =>
      get<WorkstreamItem[]>(`/api/v1/programme/workstreams${qs({ plant_id, date_from, date_to, period })}`),
    dataTrust:  () => get<DataTrust>("/api/v1/programme/data-trust"),
  },
};

// ── WebSocket helper ──────────────────────────────────────────────────────────

export function createLiveSocket(
  onMessage: (payload: WSPayload) => void,
  onError?: (e: Event) => void,
): WebSocket {
  const wsBase = (import.meta.env.VITE_API_URL ?? "http://localhost:8000")
    .replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBase}/ws/live`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data) as WSPayload); }
    catch { /* ignore parse errors */ }
  };
  ws.onerror = onError ?? (() => {});
  return ws;
}
