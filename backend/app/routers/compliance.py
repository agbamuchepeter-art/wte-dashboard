from fastapi import APIRouter, Query
from typing import Optional
from datetime import date

from app.models import ComplianceStatus
from app.services.compliance_service import compute_compliance, get_compliance_per_plant

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("", response_model=ComplianceStatus)
def get_compliance(
    plant_id:    Optional[str]  = Query(None),
    target_date: Optional[date] = Query(None),
    date_from:   Optional[date] = Query(None),
    date_to:     Optional[date] = Query(None),
    period:      Optional[str]  = Query(None, description="today | 7d | 30d"),
):
    return compute_compliance(
        plant_id=plant_id,
        target_date=target_date,
        date_from=date_from,
        date_to=date_to,
        period=period,
    )


@router.get("/per-plant", response_model=list[ComplianceStatus])
def get_compliance_plants(
    target_date: Optional[date] = Query(None),
    date_from:   Optional[date] = Query(None),
    date_to:     Optional[date] = Query(None),
    period:      Optional[str]  = Query(None, description="today | 7d | 30d"),
):
    return get_compliance_per_plant(
        target_date=target_date,
        date_from=date_from,
        date_to=date_to,
        period=period,
    )
