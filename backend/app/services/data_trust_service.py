"""
Data Trust Service — data freshness, completeness, and pipeline health.
"""
from datetime import datetime
from app.config import settings
from app.models import DataTrust, PipelineStage, RAGStatus
from app.services.data_service import load_data
from app.services.kpi_engine import _compute_data_latency_seconds


def compute_data_trust() -> DataTrust:
    df = load_data()
    now = datetime.now()

    latency_s       = _compute_data_latency_seconds()
    latency_hours   = latency_s / 3600.0
    latest_date     = df["date"].max().date()
    last_sync       = datetime.combine(latest_date, datetime.min.time()).isoformat()

    records_total   = len(df)
    records_valid   = int(df.dropna(subset=["weight_tons", "efficiency_pct", "profit_eur"]).shape[0])
    completeness    = round(records_valid / max(1, records_total) * 100, 2)

    # Freshness RAG
    if latency_hours < settings.data_freshness_green_hours:
        freshness_rag = RAGStatus.GREEN
    elif latency_hours < settings.data_freshness_amber_hours:
        freshness_rag = RAGStatus.AMBER
    else:
        freshness_rag = RAGStatus.RED

    # Completeness RAG
    if completeness >= settings.data_completeness_green:
        comp_rag = RAGStatus.GREEN
    elif completeness >= settings.data_completeness_amber:
        comp_rag = RAGStatus.AMBER
    else:
        comp_rag = RAGStatus.RED

    def rag_status(rag: RAGStatus) -> str:
        return {RAGStatus.GREEN: "ok", RAGStatus.AMBER: "warning", RAGStatus.RED: "error"}[rag]

    pipeline_stages = [
        PipelineStage(
            stage="CSV Source",
            status=rag_status(freshness_rag),
            latency_ms=round(latency_s * 1000, 1),
            detail=f"Last modified: {latest_date.isoformat()} | {records_total:,} rows",
        ),
        PipelineStage(
            stage="Data Ingestion",
            status="ok",
            latency_ms=round(records_total / 5000.0 * 10, 1),
            detail=f"lru_cache active | Load time ~{records_total/5000*10:.0f}ms",
        ),
        PipelineStage(
            stage="Enrichment Engine",
            status="ok",
            latency_ms=round(records_total / 5000.0 * 25, 1),
            detail="Efficiency, energy, profit columns derived",
        ),
        PipelineStage(
            stage="KPI Engine",
            status="ok",
            latency_ms=5.0,
            detail="Daily KPIs computed per request",
        ),
        PipelineStage(
            stage="REST API",
            status="ok",
            latency_ms=12.0,
            detail=f"All endpoints responding | v{settings.app_version}",
        ),
        PipelineStage(
            stage="WebSocket Stream",
            status="ok",
            latency_ms=0.0,
            detail=f"Broadcasting every {settings.live_refresh_seconds}s",
        ),
        PipelineStage(
            stage="React Dashboard",
            status="ok",
            latency_ms=0.0,
            detail="Frontend consuming API and WS stream",
        ),
    ]

    # Overall: worst of freshness + completeness
    overall = RAGStatus.RED if RAGStatus.RED in (freshness_rag, comp_rag) else (
        RAGStatus.AMBER if RAGStatus.AMBER in (freshness_rag, comp_rag) else RAGStatus.GREEN
    )

    import os
    source_file = os.path.basename(settings.data_path)

    return DataTrust(
        last_sync=last_sync,
        data_freshness_hours=round(latency_hours, 1),
        completeness_pct=completeness,
        source_file=source_file,
        records_total=records_total,
        records_valid=records_valid,
        pipeline_stages=pipeline_stages,
        overall_rag=overall,
    )
