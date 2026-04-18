"""
Alert Engine — rule-based alert generation with L2/L3/L4 escalation.

L2 = Warning (Amber)
L3 = Critical (Red)
L4 = Escalated — auto-triggered when an L3 is unacknowledged for >10 minutes.

Real alerts: derived from latest-day KPIs for each plant.
Simulated alerts: injected via POST endpoint, persist until cleared.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.config import settings
from app.models import DailyKPIs, RAGStatus, SystemAlert
from app.services.data_service import PLANT_NAMES, load_data
from app.services.kpi_engine import compute_daily_kpis

# ── In-memory stores ──────────────────────────────────────────────────────────

_simulated_alerts: List[SystemAlert] = []

# Track when each real alert was first seen for escalation timing
_alert_first_seen: Dict[str, datetime] = {}


# ── KPI → owner mapping ───────────────────────────────────────────────────────

KPI_OWNERS = {
    "waste_throughput": "Plant Manager",
    "efficiency":       "Energy Engineer",
    "downtime_hours":   "Operations Lead",
    "daily_profit":     "Finance Lead",
}

KPI_ACTIONS = {
    "waste_throughput": "Inspect feed hopper and crane operations; check waste intake schedule.",
    "efficiency":       "Review boiler parameters, check heat exchanger fouling, verify O₂ trim.",
    "downtime_hours":   "Assess cause of downtime event; initiate recovery checklist.",
    "daily_profit":     "Review revenue feed, energy pricing, and cost over-runs immediately.",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _severity_from_level(level: int) -> str:
    return {2: "warning", 3: "critical", 4: "escalated"}.get(level, "critical")


def _kpi_threshold_message(
    kpi_name: str, value: float, unit: str, rag: RAGStatus
) -> tuple[str, float]:
    """Return (human message, threshold value breached)."""
    th = {
        "waste_throughput": (
            f"Daily throughput {value:,.1f} {unit} "
            f"{'below target' if rag == RAGStatus.RED else 'below optimal'} "
            f"(target ≥ {settings.throughput_green:,.0f} t/day)",
            settings.throughput_amber if rag == RAGStatus.RED else settings.throughput_green,
        ),
        "efficiency": (
            f"Plant efficiency {value:.1f}% "
            f"{'critically low' if rag == RAGStatus.RED else 'below threshold'} "
            f"(threshold {settings.efficiency_green:.0f}%)",
            settings.efficiency_amber if rag == RAGStatus.RED else settings.efficiency_green,
        ),
        "downtime_hours": (
            f"Downtime {value:.1f} hrs — "
            f"{'exceeds maximum' if rag == RAGStatus.RED else 'elevated'} "
            f"(limit {settings.downtime_amber:.0f} hrs/day)",
            settings.downtime_amber if rag == RAGStatus.RED else settings.downtime_green,
        ),
        "daily_profit": (
            f"Daily profit EUR {value:,.0f} — "
            f"{'operating at a loss' if rag == RAGStatus.RED else 'near-zero margin'} "
            f"(target > EUR {settings.profit_green:,.0f})",
            settings.profit_amber if rag == RAGStatus.RED else settings.profit_green,
        ),
    }
    return th.get(kpi_name, (f"{kpi_name} is {rag.value}", 0.0))


def _alerts_from_kpis(kpis: DailyKPIs) -> List[SystemAlert]:
    """Generate L2/L3 alerts for all non-GREEN KPI values."""
    alerts: List[SystemAlert] = []
    plant_label = PLANT_NAMES.get(kpis.plant_id, kpis.plant_id)
    ts = datetime.now().isoformat()

    rag_kpis = [
        kpis.waste_throughput,
        kpis.efficiency,
        kpis.downtime_hours,
        kpis.daily_profit,
    ]

    for kpi in rag_kpis:
        if kpi.rag is None or kpi.rag == RAGStatus.GREEN:
            continue

        level = 3 if kpi.rag == RAGStatus.RED else 2
        msg, threshold = _kpi_threshold_message(kpi.name, kpi.value, kpi.unit, kpi.rag)
        prefix = f"[{plant_label}] " if kpis.plant_id != "all" else "[All Plants] "

        alert_id = f"{kpis.plant_id}-{kpis.date}-{kpi.name}"
        owner     = KPI_OWNERS.get(kpi.name, "Operations Lead")
        action    = KPI_ACTIONS.get(kpi.name, "Investigate and escalate as required.")

        alerts.append(SystemAlert(
            id=alert_id,
            plant_id=kpis.plant_id,
            kpi_name=kpi.name,
            kpi_label=kpi.label,
            alert_type=f"{kpi.name}_{'critical' if kpi.rag == RAGStatus.RED else 'warning'}",
            severity=_severity_from_level(level),
            alert_level=level,
            rag=kpi.rag,
            message=f"{prefix}{msg}",
            current_value=kpi.value,
            unit=kpi.unit,
            threshold_breached=threshold,
            owner=owner,
            timestamp=ts,
            action_required=action,
            simulated=False,
        ))

    return alerts


def _maybe_escalate(alert: SystemAlert) -> SystemAlert:
    """
    Upgrade an L3 alert to L4 if it has been active for longer than
    the configured escalation window without acknowledgment.
    """
    if alert.alert_level != 3 or alert.acknowledged or alert.simulated:
        return alert

    first_seen = _alert_first_seen.get(alert.id)
    now = datetime.now()

    if first_seen is None:
        _alert_first_seen[alert.id] = now
        return alert

    elapsed_minutes = (now - first_seen).total_seconds() / 60.0
    if elapsed_minutes >= settings.l3_escalation_minutes:
        return alert.model_copy(update={
            "alert_level": 4,
            "severity":    "escalated",
            "escalated_at": now.isoformat(),
            "message":      f"[L4 ESCALATED] {alert.message}",
            "action_required": (
                f"IMMEDIATE: Alert unacknowledged for {elapsed_minutes:.0f} min. "
                f"Escalate to Duty Manager. {alert.action_required}"
            ),
        })
    return alert


# ── Public API ────────────────────────────────────────────────────────────────

def get_active_alerts(plant_id: Optional[str] = None) -> List[SystemAlert]:
    """
    Return all active alerts (real + simulated), with L4 escalation applied.
    Sorted: level DESC (4→3→2), then timestamp DESC.
    """
    real_alerts: List[SystemAlert] = []

    df = load_data()
    latest_date = df["date"].max().date()

    plants = df["plant_id"].unique().tolist()
    for pid in plants:
        if plant_id and plant_id != "all" and pid != plant_id:
            continue
        kpis = compute_daily_kpis(plant_id=pid, target_date=latest_date)
        real_alerts.extend(_alerts_from_kpis(kpis))

    # Deduplicate
    seen: set = set()
    unique_real: List[SystemAlert] = []
    for a in real_alerts:
        if a.id not in seen:
            seen.add(a.id)
            unique_real.append(a)

    # Apply L4 escalation
    escalated = [_maybe_escalate(a) for a in unique_real]

    # Merge with simulated
    all_alerts = escalated + list(_simulated_alerts)

    return sorted(all_alerts, key=lambda a: (-a.alert_level, a.timestamp), reverse=False)


def acknowledge_alert(alert_id: str) -> bool:
    """Mark an alert as acknowledged (resets escalation timer)."""
    for a in _simulated_alerts:
        if a.id == alert_id:
            a.acknowledged = True
            _alert_first_seen.pop(alert_id, None)
            return True
    # For real alerts, mark in a transient ack set
    _alert_first_seen.pop(alert_id, None)
    return True


def add_simulated_alert(
    kpi_name: str = "efficiency",
    plant_id: str = "WTE_RTM_01",
    level: int = 3,
) -> SystemAlert:
    """Inject a simulated alert for testing. Level can be 2, 3, or 4."""
    plant_label = PLANT_NAMES.get(plant_id, plant_id)

    kpi_configs = {
        "efficiency":       ("Efficiency",       28.5,    "%",    settings.efficiency_amber),
        "waste_throughput": ("Daily Throughput",  650.0,   "t/day",settings.throughput_amber),
        "downtime_hours":   ("Downtime",          5.5,     "hrs",  settings.downtime_amber),
        "daily_profit":     ("Daily Profit",     -45_000.0,"EUR",  settings.profit_amber),
        "nox":              ("NOx Emissions",     195.0,   "mg/Nm³", 200.0),
        "so2":              ("SO₂ Emissions",     48.5,    "mg/Nm³", 50.0),
    }
    label, value, unit, threshold = kpi_configs.get(
        kpi_name, ("Efficiency", 28.5, "%", settings.efficiency_amber)
    )

    # Map level to value/rag
    if level == 2:
        rag       = RAGStatus.AMBER
        severity  = "warning"
        val_mult  = 0.85   # slightly degraded
    elif level == 4:
        rag       = RAGStatus.RED
        severity  = "escalated"
        val_mult  = 0.40   # severely degraded
    else:                  # level == 3
        rag       = RAGStatus.RED
        severity  = "critical"
        val_mult  = 0.60

    sim_value = round(value * val_mult, 2) if unit not in ("EUR",) else value

    action = KPI_ACTIONS.get(kpi_name, "Investigate and escalate as required.")
    if level == 4:
        action = f"IMMEDIATE L4: {action}"

    alert = SystemAlert(
        id=f"sim-{kpi_name}-{level}-{datetime.now().isoformat()}",
        plant_id=plant_id,
        kpi_name=kpi_name,
        kpi_label=label,
        alert_type="simulated",
        severity=severity,
        alert_level=level,
        rag=rag,
        message=(
            f"[SIMULATED L{level}] [{plant_label}] {label} = {sim_value} {unit} "
            f"— {'critically' if level >= 3 else 'below'} threshold ({threshold} {unit})"
        ),
        current_value=sim_value,
        unit=unit,
        threshold_breached=threshold,
        owner=KPI_OWNERS.get(kpi_name, "Operations Lead"),
        timestamp=datetime.now().isoformat(),
        action_required=action,
        simulated=True,
    )
    _simulated_alerts.append(alert)
    return alert


def clear_simulated_alerts() -> int:
    """Remove all simulated alerts. Returns count cleared."""
    count = len(_simulated_alerts)
    _simulated_alerts.clear()
    return count
