"""
Programme Workstream Service.

Derives RAG status for each of the 12 programme workstreams.
Supports plant_id and date_from/date_to filtering.
"""
from datetime import datetime, date
from typing import List, Optional

from app.models import RAGStatus, WorkstreamItem
from app.services.data_service import load_data
from app.services.kpi_engine import compute_daily_kpis, _compute_data_latency_seconds


def _worst(*rags: RAGStatus) -> RAGStatus:
    if RAGStatus.RED in rags:
        return RAGStatus.RED
    if RAGStatus.AMBER in rags:
        return RAGStatus.AMBER
    return RAGStatus.GREEN


def compute_workstreams(
    plant_id:  Optional[str]  = None,
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
    period:    Optional[str]  = None,
) -> List[WorkstreamItem]:
    df  = load_data()
    ts  = datetime.now().strftime("%Y-%m-%d %H:%M")
    pid = plant_id or "all"

    if period or (date_from and date_to):
        kpis_all = compute_daily_kpis(plant_id=pid, date_from=date_from, date_to=date_to, period=period)
        kpis_p1  = compute_daily_kpis(plant_id="WTE_RTM_01", date_from=date_from, date_to=date_to, period=period)
        kpis_p2  = compute_daily_kpis(plant_id="WTE_RTM_02", date_from=date_from, date_to=date_to, period=period)
        # Resolve actual date range for completeness check
        if period and not (date_from and date_to):
            from app.services.kpi_engine import resolve_period
            date_from, date_to = resolve_period(period, df["date"].max().date())
        mask = (df["date"].dt.date >= date_from) & (df["date"].dt.date <= date_to)
        window_df = df[mask]
        n_records   = len(window_df)
        n_days      = max(1, window_df["date"].dt.date.nunique())
        completeness = min(100.0, n_records / max(1, len(df["plant_id"].unique()) * 5 * n_days) * 100)
    else:
        kpis_all = compute_daily_kpis(plant_id=pid)
        kpis_p1  = compute_daily_kpis(plant_id="WTE_RTM_01")
        kpis_p2  = compute_daily_kpis(plant_id="WTE_RTM_02")
        latest_date  = df["date"].max().date()
        today_df     = df[df["date"].dt.date == latest_date]
        n_records    = len(today_df)
        completeness = min(100.0, n_records / max(1, len(df["plant_id"].unique()) * 5) * 100)

    latency_s = _compute_data_latency_seconds()
    latency_rag = (
        RAGStatus.GREEN if latency_s < 86_400
        else (RAGStatus.AMBER if latency_s < 172_800 else RAGStatus.RED)
    )
    data_rag = (
        RAGStatus.GREEN if completeness >= 98
        else (RAGStatus.AMBER if completeness >= 90 else RAGStatus.RED)
    )

    items: List[WorkstreamItem] = []

    items.append(WorkstreamItem(id="plant_infra", name="Plant Infrastructure",
        status=_worst(kpis_all.downtime_hours.rag or RAGStatus.GREEN),
        linked_kpi=f"Downtime: {kpis_all.downtime_hours.formatted}", owner="Plant Manager", last_updated=ts,
        detail=f"Both plants reporting — downtime {kpis_all.downtime_hours.formatted}"))

    items.append(WorkstreamItem(id="energy_gen", name="Energy Generation",
        status=_worst(kpis_all.efficiency.rag or RAGStatus.GREEN),
        linked_kpi=f"Efficiency: {kpis_all.efficiency.formatted}", owner="Energy Engineer", last_updated=ts,
        detail=f"Output: {kpis_all.energy_output.formatted} | Efficiency: {kpis_all.efficiency.formatted}"))

    items.append(WorkstreamItem(id="scada", name="SCADA & Integration",
        status=latency_rag,
        linked_kpi=f"Data Latency: {kpis_all.data_latency.formatted}", owner="SCADA Engineer", last_updated=ts,
        detail=f"Latency: {kpis_all.data_latency.formatted} | Pipeline: {'OK' if latency_s < 86_400 else 'Delayed'}"))

    items.append(WorkstreamItem(id="monitoring", name="Monitoring Platform",
        status=RAGStatus.GREEN if latency_s < 86_400 else RAGStatus.AMBER,
        linked_kpi="WS Stream: active | Refresh: 5s", owner="Data Engineer", last_updated=ts,
        detail="WebSocket live stream active — 5s refresh cycle"))

    items.append(WorkstreamItem(id="reporting", name="Automated Reporting",
        status=data_rag,
        linked_kpi=f"Data completeness: {completeness:.0f}%", owner="Reporting Analyst", last_updated=ts,
        detail=f"CSV pipeline: {len(df):,} records | Completeness: {completeness:.0f}%"))

    items.append(WorkstreamItem(id="compliance", name="Regulatory Compliance",
        status=kpis_all.efficiency.rag or RAGStatus.GREEN,
        linked_kpi=f"Efficiency (proxy): {kpis_all.efficiency.formatted}", owner="Compliance Officer", last_updated=ts,
        detail="EU IED 2010/75/EU — see Compliance tab for full breakdown"))

    items.append(WorkstreamItem(id="community", name="Community Engagement",
        status=RAGStatus.GREEN,
        linked_kpi="See Community tab for approval rating", owner="Community Manager", last_updated=ts,
        detail="Monthly community survey active — see Community tab"))

    items.append(WorkstreamItem(id="financials", name="Financial Performance",
        status=kpis_all.daily_profit.rag or RAGStatus.GREEN,
        linked_kpi=f"Daily Profit: {kpis_all.daily_profit.formatted}", owner="Finance Lead", last_updated=ts,
        detail=f"Revenue health: profit {kpis_all.daily_profit.formatted} | Throughput {kpis_all.waste_throughput.formatted}"))

    items.append(WorkstreamItem(id="grid", name="Grid Integration",
        status=_worst(kpis_all.efficiency.rag or RAGStatus.GREEN),
        linked_kpi=f"Energy Output: {kpis_all.energy_output.formatted}", owner="Grid Integration Lead", last_updated=ts,
        detail=f"Total generation: {kpis_all.energy_output.formatted}"))

    items.append(WorkstreamItem(id="data_quality", name="Data Quality",
        status=data_rag,
        linked_kpi=f"Completeness: {completeness:.0f}%", owner="Data Analyst", last_updated=ts,
        detail=f"{len(df):,} valid records | YTD waste: {kpis_all.cumulative_waste_ytd.formatted}"))

    items.append(WorkstreamItem(id="alerts", name="Alerts & Escalation",
        status=RAGStatus.GREEN,
        linked_kpi="See Alerts tab for live count", owner="Operations Lead", last_updated=ts,
        detail="L2/L3/L4 engine active — 10-min L4 escalation rule"))

    items.append(WorkstreamItem(id="delivery", name="Delivery / Sprint",
        status=RAGStatus.GREEN,
        linked_kpi="Sprint 3 in progress", owner="Programme Manager", last_updated=ts,
        detail="See Delivery tab for sprint burndown"))

    return items
