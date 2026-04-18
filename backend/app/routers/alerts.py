from fastapi import APIRouter, Query, Body
from typing import List, Optional
from datetime import date

from app.models import Alert, SystemAlert
from app.services.alert_engine import (
    add_simulated_alert,
    clear_simulated_alerts,
    get_active_alerts,
    acknowledge_alert,
)
from app.services.data_service import get_alerts as get_legacy_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=List[SystemAlert])
def list_alerts(
    plant_id:  Optional[str]  = Query(None),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    period:    Optional[str]  = Query(None, description="today | 7d | 30d"),
    limit:     int            = Query(50, ge=1, le=200),
):
    # Resolve period → date range
    if period and not (date_from and date_to):
        from app.services.data_service import load_data
        from app.services.kpi_engine import resolve_period
        df = load_data()
        date_from, date_to = resolve_period(period, df["date"].max().date())

    alerts = get_active_alerts(plant_id=plant_id)

    # Filter by timestamp if date range provided
    if date_from or date_to:
        filtered = []
        for a in alerts:
            try:
                alert_date = date.fromisoformat(a.timestamp[:10])
                if date_from and alert_date < date_from:
                    continue
                if date_to and alert_date > date_to:
                    continue
                filtered.append(a)
            except Exception:
                filtered.append(a)
        alerts = filtered

    return alerts[:limit]


@router.post("/simulate-alert", response_model=SystemAlert)
def simulate_alert(
    kpi_name: str = Body(default="efficiency", embed=True),
    plant_id: str = Body(default="WTE_RTM_01", embed=True),
    level: int    = Body(default=3, embed=True,
                         description="Alert level: 2=Warning, 3=Critical, 4=Escalated"),
):
    return add_simulated_alert(kpi_name=kpi_name, plant_id=plant_id, level=level)


@router.delete("/simulate-alert")
def clear_simulated():
    count = clear_simulated_alerts()
    return {"cleared": count, "message": f"Removed {count} simulated alert(s)"}


@router.post("/acknowledge/{alert_id}")
def ack_alert(alert_id: str):
    success = acknowledge_alert(alert_id)
    return {"acknowledged": success, "alert_id": alert_id}


@router.get("/legacy", response_model=List[Alert])
def list_legacy_alerts(
    plant_id:   Optional[str]  = Query(None),
    active_only: bool          = Query(False),
    limit:       int           = Query(50, ge=1, le=200),
):
    return get_legacy_alerts(plant_id, active_only, limit)
