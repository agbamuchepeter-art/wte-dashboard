from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


# ── Shared enums ─────────────────────────────────────────────────────────────

class RAGStatus(str, Enum):
    GREEN = "green"
    AMBER = "amber"
    RED   = "red"


class AlertLevel(int, Enum):
    WARNING   = 2   # Amber
    CRITICAL  = 3   # Red
    ESCALATED = 4   # L4 — auto-escalated after timeout


# ── Plants ───────────────────────────────────────────────────────────────────

class PlantInfo(BaseModel):
    plant_id: str
    name: str
    location: str
    status: str                 # operational | maintenance | downtime
    efficiency_pct: float
    last_updated: str


# ── KPI value with RAG ────────────────────────────────────────────────────────

class KPIValue(BaseModel):
    name: str
    label: str
    value: float
    unit: str
    rag: Optional[RAGStatus] = None
    formatted: str


# ── Daily KPI snapshot ────────────────────────────────────────────────────────

class DailyKPIs(BaseModel):
    date: str
    plant_id: str
    record_count: int = 0
    waste_throughput: KPIValue
    energy_output: KPIValue
    efficiency: KPIValue
    downtime_hours: KPIValue
    daily_profit: KPIValue
    cumulative_waste_ytd: KPIValue
    data_latency: KPIValue


# ── Aggregated KPI summary ────────────────────────────────────────────────────

class KPISummary(BaseModel):
    total_waste_tons: float
    total_energy_mwh: float
    overall_efficiency_pct: float
    avg_energy_per_ton: float
    avg_profit_per_ton: float
    total_revenue_eur: float
    total_cost_eur: float
    total_profit_eur: float
    period_days: int
    records: int


# ── Time series ──────────────────────────────────────────────────────────────

class TimeSeriesPoint(BaseModel):
    date: str
    value: float
    plant_id: Optional[str] = None


class TimeSeriesResponse(BaseModel):
    metric: str
    granularity: str
    series: List[TimeSeriesPoint]


# ── Comparison ───────────────────────────────────────────────────────────────

class PlantComparisonItem(BaseModel):
    plant_id: str
    location: str
    total_waste_tons: float
    total_energy_mwh: float
    avg_efficiency_pct: float
    avg_energy_per_ton: float
    avg_profit_per_ton: float
    total_revenue_eur: float
    total_cost_eur: float
    total_profit_eur: float
    operational_days: int
    downtime_records: int
    maintenance_records: int
    status: str


# ── System alert ──────────────────────────────────────────────────────────────

class SystemAlert(BaseModel):
    id: str
    plant_id: str
    kpi_name: str
    kpi_label: str
    alert_type: str
    severity: str                # "warning" (L2) | "critical" (L3) | "escalated" (L4)
    alert_level: int             # 2 | 3 | 4
    rag: RAGStatus
    message: str
    current_value: float
    unit: str
    threshold_breached: float
    owner: str = "Operations Lead"
    timestamp: str
    escalated_at: Optional[str] = None
    acknowledged: bool = False
    action_required: str = ""
    simulated: bool = False


# ── Legacy alert (backward compat) ───────────────────────────────────────────

class Alert(BaseModel):
    id: str
    plant_id: str
    alert_type: str
    severity: str
    message: str
    timestamp: str
    metric_value: float
    threshold: float


# ── Live readings ─────────────────────────────────────────────────────────────

class LiveReading(BaseModel):
    plant_id: str
    location: str
    timestamp: str
    status: str
    efficiency_pct: float
    energy_output_mwh: float
    waste_input_tons: float
    energy_per_ton: float
    profit_per_ton: float
    revenue_eur: float
    alert_active: bool


# ── Compliance ────────────────────────────────────────────────────────────────

class PollutantReading(BaseModel):
    name: str            # "NOx" | "SO2" | "CO" | "Dust"
    value: float         # measured value in mg/Nm³
    limit: float         # EU IED limit
    pct_of_limit: float  # (value / limit) * 100
    unit: str
    rag: RAGStatus


class ComplianceStatus(BaseModel):
    date: str
    plant_id: str
    pollutants: List[PollutantReading]
    data_availability_pct: float
    overall_rag: RAGStatus
    cems_status: str     # "Valid" | "Invalid" | "Missing"


# ── Integration Health ────────────────────────────────────────────────────────

class IntegrationComponent(BaseModel):
    name: str
    status: str          # "Connected"|"Failed"|"Live"|"Delayed"|"Valid"|"Healthy"|"Failing"
    latency_ms: Optional[float] = None
    last_sync: str
    rag: RAGStatus
    detail: str = ""


class IntegrationHealth(BaseModel):
    timestamp: str
    components: List[IntegrationComponent]
    overall_rag: RAGStatus
    data_latency_seconds: float


# ── Workstream ────────────────────────────────────────────────────────────────

class WorkstreamItem(BaseModel):
    id: str
    name: str
    status: RAGStatus
    linked_kpi: str
    owner: str
    last_updated: str
    detail: str = ""


# ── Community ─────────────────────────────────────────────────────────────────

class CommunityData(BaseModel):
    date: str
    approval_rating: float       # 0–100%
    trend: str                   # "up" | "down" | "stable"
    trend_delta: float           # pp change vs last period
    rag: RAGStatus
    narrative: str
    engagement_score: float
    complaints_this_month: int


# ── Delivery / Sprint ─────────────────────────────────────────────────────────

class SprintFeature(BaseModel):
    name: str
    status: str          # "completed" | "in_progress" | "blocked"
    assignee: str
    story_points: int = 0


class DeliveryTracking(BaseModel):
    sprint_name: str
    sprint_number: int
    start_date: str
    end_date: str
    velocity: int
    target_velocity: int
    completion_pct: float
    features_completed: int
    features_in_progress: int
    features_blocked: int
    features: List[SprintFeature]
    rag: RAGStatus


# ── Data Trust ────────────────────────────────────────────────────────────────

class PipelineStage(BaseModel):
    stage: str
    status: str          # "ok" | "warning" | "error"
    latency_ms: float
    detail: str = ""


class DataTrust(BaseModel):
    last_sync: str
    data_freshness_hours: float
    completeness_pct: float
    source_file: str
    records_total: int
    records_valid: int
    pipeline_stages: List[PipelineStage]
    overall_rag: RAGStatus


# ── Executive Summary ─────────────────────────────────────────────────────────

class KeyRisk(BaseModel):
    rank: int
    title: str
    impact: str
    probability: str
    rag: RAGStatus


class ExecutiveSummary(BaseModel):
    timestamp: str
    programme_rag: RAGStatus
    compliance_rag: RAGStatus
    revenue_health: RAGStatus
    key_risks: List[KeyRisk]
    active_alerts_count: int
    critical_alerts_count: int
    l4_escalations: int
    summary_narrative: str


# ── WebSocket broadcast payload ───────────────────────────────────────────────

class WSPayload(BaseModel):
    live_readings: List[LiveReading]
    daily_kpis: Optional[DailyKPIs] = None
    active_alerts: List[SystemAlert] = []
    alert_count: int = 0
    critical_count: int = 0
    integration_health: Optional[IntegrationHealth] = None
    executive_summary: Optional[ExecutiveSummary] = None
