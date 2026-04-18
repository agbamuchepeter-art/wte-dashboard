"""
Programme / Executive Summary Service.

Aggregates across all sub-systems to produce the top-level
programme RAG, key risks, and compliance + revenue health indicators.
Supports plant_id and date_from/date_to filtering.
"""
from datetime import datetime, date
from typing import List, Optional

from app.models import ExecutiveSummary, KeyRisk, RAGStatus
from app.services.alert_engine import get_active_alerts
from app.services.compliance_service import compute_compliance
from app.services.kpi_engine import compute_daily_kpis


def _worst(*rags: RAGStatus) -> RAGStatus:
    if RAGStatus.RED in rags:
        return RAGStatus.RED
    if RAGStatus.AMBER in rags:
        return RAGStatus.AMBER
    return RAGStatus.GREEN


def compute_executive_summary(
    plant_id:  Optional[str]  = None,
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
    period:    Optional[str]  = None,
) -> ExecutiveSummary:
    ts = datetime.now().isoformat()

    alerts         = get_active_alerts(plant_id=plant_id)
    active_count   = len(alerts)
    critical_count = sum(1 for a in alerts if a.alert_level == 3)
    l4_count       = sum(1 for a in alerts if a.alert_level == 4)

    pid = plant_id or "all"

    if period or (date_from and date_to):
        kpis       = compute_daily_kpis(plant_id=pid, date_from=date_from, date_to=date_to, period=period)
        compliance = compute_compliance(plant_id=pid, date_from=date_from, date_to=date_to, period=period)
    else:
        kpis       = compute_daily_kpis(plant_id=pid)
        compliance = compute_compliance(plant_id=pid)

    alert_rag = RAGStatus.GREEN
    if l4_count > 0 or critical_count >= 3:
        alert_rag = RAGStatus.RED
    elif critical_count > 0 or active_count >= 2:
        alert_rag = RAGStatus.AMBER

    programme_rag = _worst(
        kpis.efficiency.rag    or RAGStatus.GREEN,
        kpis.daily_profit.rag  or RAGStatus.GREEN,
        kpis.downtime_hours.rag or RAGStatus.GREEN,
        alert_rag,
    )
    compliance_rag = compliance.overall_rag
    revenue_health = _worst(
        kpis.daily_profit.rag    or RAGStatus.GREEN,
        kpis.waste_throughput.rag or RAGStatus.GREEN,
    )

    risks: List[KeyRisk] = []

    if l4_count > 0:
        risks.append(KeyRisk(rank=1, title=f"{l4_count} L4 escalated alert(s) — immediate action required",
            impact="High — operational continuity at risk", probability="Confirmed — active now", rag=RAGStatus.RED))
    elif critical_count > 0:
        risks.append(KeyRisk(rank=1, title=f"{critical_count} critical L3 alert(s) active — unacknowledged",
            impact="High — potential regulatory and revenue impact", probability="Confirmed — active now", rag=RAGStatus.RED))
    else:
        risks.append(KeyRisk(rank=1, title="Alert governance within tolerance — no critical alerts",
            impact="Low", probability="Monitor — review daily", rag=RAGStatus.GREEN))

    eff_rag = kpis.efficiency.rag or RAGStatus.GREEN
    if eff_rag == RAGStatus.RED:
        risks.append(KeyRisk(rank=2, title=f"Plant efficiency critically low at {kpis.efficiency.formatted}",
            impact="High — energy revenue loss and potential EU IED breach",
            probability="Confirmed — active measurement", rag=RAGStatus.RED))
    elif eff_rag == RAGStatus.AMBER:
        risks.append(KeyRisk(rank=2, title=f"Plant efficiency below target: {kpis.efficiency.formatted}",
            impact="Medium — reduced energy output and margin pressure",
            probability="Active — monitor for trend", rag=RAGStatus.AMBER))
    else:
        risks.append(KeyRisk(rank=2, title=f"Plant efficiency on target: {kpis.efficiency.formatted}",
            impact="Low", probability="Stable — continue monitoring", rag=RAGStatus.GREEN))

    if compliance_rag == RAGStatus.RED:
        risks.append(KeyRisk(rank=3, title="Emissions exceeding EU IED permit limits — regulatory risk",
            impact="Critical — potential permit suspension and fines",
            probability="Confirmed — breach detected", rag=RAGStatus.RED))
    elif revenue_health == RAGStatus.RED:
        risks.append(KeyRisk(rank=3, title=f"Daily profit negative: {kpis.daily_profit.formatted}",
            impact="High — cash flow and programme sustainability risk",
            probability="Confirmed — active measurement", rag=RAGStatus.RED))
    elif revenue_health == RAGStatus.AMBER:
        risks.append(KeyRisk(rank=3, title=f"Profit margin under pressure: {kpis.daily_profit.formatted}",
            impact="Medium — review cost allocation and energy pricing",
            probability="Active — monitor weekly", rag=RAGStatus.AMBER))
    else:
        risks.append(KeyRisk(rank=3, title="Financial performance stable — profit and throughput on target",
            impact="Low", probability="Monitor — review monthly", rag=RAGStatus.GREEN))

    if programme_rag == RAGStatus.GREEN:
        narrative = "All programme workstreams are performing within targets. No critical alerts active. Compliance, operations, and financials are stable."
    elif programme_rag == RAGStatus.AMBER:
        narrative = "Programme is operating with one or more metrics below target. Review active alerts and workstream status. Proactive action recommended."
    else:
        narrative = "PROGRAMME AT RISK — one or more critical issues detected. Immediate management attention required. Review L3/L4 alerts now."

    return ExecutiveSummary(
        timestamp=ts,
        programme_rag=programme_rag,
        compliance_rag=compliance_rag,
        revenue_health=revenue_health,
        key_risks=risks[:3],
        active_alerts_count=active_count,
        critical_alerts_count=critical_count,
        l4_escalations=l4_count,
        summary_narrative=narrative,
    )
