from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_name: str = "GreenGrid Urban Solutions — WTE Rotterdam"
    app_version: str = "2.0.0"

    # Data
    data_path: str = (
        "../../10x-analyst-master/output/waste-data/"
        "cleaned-data/cleaned_waste_output.csv"
    )

    # Energy economics
    electricity_price_eur_mwh: float = 145.0

    # ── RAG thresholds: Waste Throughput (tons/day, combined plants) ──────────
    throughput_green: float = 1370.0
    throughput_amber: float = 1000.0

    # ── RAG thresholds: Efficiency (%) ───────────────────────────────────────
    efficiency_green: float = 65.0
    efficiency_amber: float = 50.0

    # ── RAG thresholds: Downtime (hours/day) ─────────────────────────────────
    downtime_green: float = 1.0
    downtime_amber: float = 2.0

    # ── RAG thresholds: Daily Profit (EUR) ───────────────────────────────────
    profit_green: float = 10_000.0
    profit_amber: float = 0.0

    # ── Compliance thresholds (EU IED 2010/75/EU for WTE plants) ─────────────
    nox_limit_mg_nm3: float = 200.0      # NOx daily average limit mg/Nm³
    so2_limit_mg_nm3: float = 50.0       # SO2 daily average limit mg/Nm³
    co_limit_mg_nm3: float = 50.0        # CO daily average limit mg/Nm³
    dust_limit_mg_nm3: float = 10.0      # Dust daily average limit mg/Nm³
    compliance_amber_pct: float = 90.0   # >90% of limit → Amber; >100% → Red

    # ── Community engagement ──────────────────────────────────────────────────
    community_approval_green: float = 80.0   # ≥80% → Green
    community_approval_amber: float = 70.0   # ≥70% → Amber; <70% → Red + Alert

    # ── Data quality / freshness ──────────────────────────────────────────────
    data_freshness_green_hours: float = 24.0   # <24h stale → Green
    data_freshness_amber_hours: float = 48.0   # <48h stale → Amber; ≥48h → Red
    data_completeness_green: float = 98.0       # ≥98% → Green
    data_completeness_amber: float = 90.0       # ≥90% → Amber; <90% → Red

    # ── Alert escalation ─────────────────────────────────────────────────────
    l3_escalation_minutes: int = 10    # L3 unacknowledged → L4 after N minutes

    # Downtime estimation per plant-status record
    downtime_hours_per_event: float = 6.0
    maintenance_hours_per_event: float = 1.5

    # Legacy threshold (backward compat)
    efficiency_threshold: float = 65.0
    loss_threshold: float = 0.0

    # Real-time refresh
    live_refresh_seconds: int = 5

    # CORS (JSON array in .env)
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
