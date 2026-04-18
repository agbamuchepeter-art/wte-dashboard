// ── Enums ────────────────────────────────────────────────────────────────────

export type PlantStatus    = "operational" | "maintenance" | "downtime";
export type AlertSeverity  = "critical" | "warning" | "info" | "escalated";
export type AlertType      = "efficiency_low" | "downtime" | "maintenance" | "loss"
                           | "simulated" | "throughput_low" | string;
export type Granularity    = "daily" | "weekly" | "monthly";
export type RAGStatus      = "green" | "amber" | "red";
export type MetricKey      =
  | "efficiency_pct"
  | "energy_output_mwh"
  | "weight_tons"
  | "profit_per_ton"
  | "energy_per_ton"
  | "revenue_eur"
  | "profit_eur";
export type DashboardTab   =
  | "overview"
  | "operations"
  | "energy"
  | "financials"
  | "compliance"
  | "community"
  | "integration"
  | "delivery"
  | "alerts";
export type TrendDir = "up" | "down" | "stable";
export type Period   = "today" | "7d" | "30d" | "90d" | "this-month" | "this-year" | "custom";

export interface DatasetMeta {
  latest_date: string;
  earliest_date: string;
  record_count: number;
  plant_ids: string[];
}

// ── KPI value with RAG ────────────────────────────────────────────────────────

export interface KPIValue {
  name: string;
  label: string;
  value: number;
  unit: string;
  rag: RAGStatus | null;
  formatted: string;
}

export interface DailyKPIs {
  date: string;
  plant_id: string;
  record_count?: number;
  waste_throughput: KPIValue;
  energy_output: KPIValue;
  efficiency: KPIValue;
  downtime_hours: KPIValue;
  daily_profit: KPIValue;
  cumulative_waste_ytd: KPIValue;
  data_latency: KPIValue;
}

// ── System alert ──────────────────────────────────────────────────────────────

export interface SystemAlert {
  id: string;
  plant_id: string;
  kpi_name: string;
  kpi_label: string;
  alert_type: string;
  severity: AlertSeverity;
  alert_level: 2 | 3 | 4;
  rag: RAGStatus;
  message: string;
  current_value: number;
  unit: string;
  threshold_breached: number;
  owner: string;
  timestamp: string;
  escalated_at?: string | null;
  acknowledged: boolean;
  action_required: string;
  simulated: boolean;
}

// ── WebSocket broadcast payload ───────────────────────────────────────────────

export interface WSPayload {
  live_readings: LiveReading[];
  daily_kpis: DailyKPIs | null;
  active_alerts: SystemAlert[];
  alert_count: number;
  critical_count: number;
  integration_health?: IntegrationHealth | null;
  executive_summary?: ExecutiveSummary | null;
}

// ── Compliance ────────────────────────────────────────────────────────────────

export interface PollutantReading {
  name: string;
  value: number;
  limit: number;
  pct_of_limit: number;
  unit: string;
  rag: RAGStatus;
}

export interface ComplianceStatus {
  date: string;
  plant_id: string;
  pollutants: PollutantReading[];
  data_availability_pct: number;
  overall_rag: RAGStatus;
  cems_status: string;
}

// ── Integration Health ────────────────────────────────────────────────────────

export interface IntegrationComponent {
  name: string;
  status: string;
  latency_ms?: number | null;
  last_sync: string;
  rag: RAGStatus;
  detail: string;
}

export interface IntegrationHealth {
  timestamp: string;
  components: IntegrationComponent[];
  overall_rag: RAGStatus;
  data_latency_seconds: number;
}

// ── Workstream ────────────────────────────────────────────────────────────────

export interface WorkstreamItem {
  id: string;
  name: string;
  status: RAGStatus;
  linked_kpi: string;
  owner: string;
  last_updated: string;
  detail: string;
}

// ── Community ─────────────────────────────────────────────────────────────────

export interface CommunityData {
  date: string;
  approval_rating: number;
  trend: TrendDir;
  trend_delta: number;
  rag: RAGStatus;
  narrative: string;
  engagement_score: number;
  complaints_this_month: number;
}

// ── Delivery / Sprint ─────────────────────────────────────────────────────────

export interface SprintFeature {
  name: string;
  status: "completed" | "in_progress" | "blocked";
  assignee: string;
  story_points: number;
}

export interface DeliveryTracking {
  sprint_name: string;
  sprint_number: number;
  start_date: string;
  end_date: string;
  velocity: number;
  target_velocity: number;
  completion_pct: number;
  features_completed: number;
  features_in_progress: number;
  features_blocked: number;
  features: SprintFeature[];
  rag: RAGStatus;
}

// ── Data Trust ────────────────────────────────────────────────────────────────

export interface PipelineStage {
  stage: string;
  status: "ok" | "warning" | "error";
  latency_ms: number;
  detail: string;
}

export interface DataTrust {
  last_sync: string;
  data_freshness_hours: number;
  completeness_pct: number;
  source_file: string;
  records_total: number;
  records_valid: number;
  pipeline_stages: PipelineStage[];
  overall_rag: RAGStatus;
}

// ── Executive Summary ─────────────────────────────────────────────────────────

export interface KeyRisk {
  rank: number;
  title: string;
  impact: string;
  probability: string;
  rag: RAGStatus;
}

export interface ExecutiveSummary {
  timestamp: string;
  programme_rag: RAGStatus;
  compliance_rag: RAGStatus;
  revenue_health: RAGStatus;
  key_risks: KeyRisk[];
  active_alerts_count: number;
  critical_alerts_count: number;
  l4_escalations: number;
  summary_narrative: string;
}

// ── Plants ────────────────────────────────────────────────────────────────────

export interface PlantInfo {
  plant_id: string;
  name: string;
  location: string;
  status: PlantStatus;
  efficiency_pct: number;
  last_updated: string;
}

// ── Aggregated KPIs ───────────────────────────────────────────────────────────

export interface KPISummary {
  total_waste_tons: number;
  total_energy_mwh: number;
  overall_efficiency_pct: number;
  avg_energy_per_ton: number;
  avg_profit_per_ton: number;
  total_revenue_eur: number;
  total_cost_eur: number;
  total_profit_eur: number;
  period_days: number;
  records: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  plant_id?: string;
}

export interface TimeSeriesResponse {
  metric: string;
  granularity: string;
  series: TimeSeriesPoint[];
}

export interface PlantComparisonItem {
  plant_id: string;
  location: string;
  total_waste_tons: number;
  total_energy_mwh: number;
  avg_efficiency_pct: number;
  avg_energy_per_ton: number;
  avg_profit_per_ton: number;
  total_revenue_eur: number;
  total_cost_eur: number;
  total_profit_eur: number;
  operational_days: number;
  downtime_records: number;
  maintenance_records: number;
  status: PlantStatus;
}

export interface LiveReading {
  plant_id: string;
  location: string;
  timestamp: string;
  status: PlantStatus;
  efficiency_pct: number;
  energy_output_mwh: number;
  waste_input_tons: number;
  energy_per_ton: number;
  profit_per_ton: number;
  revenue_eur: number;
  alert_active: boolean;
}

export interface DashboardFilters {
  plant_id: string;
  date_from: string;
  date_to: string;
  granularity: Granularity;
}
