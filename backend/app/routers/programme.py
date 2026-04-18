from fastapi import APIRouter, Query
from typing import List, Optional
from datetime import date

from app.models import ExecutiveSummary, WorkstreamItem, DataTrust
from app.services.programme_service import compute_executive_summary
from app.services.workstream_service import compute_workstreams
from app.services.data_trust_service import compute_data_trust

router = APIRouter(prefix="/programme", tags=["programme"])


@router.get("/summary", response_model=ExecutiveSummary)
def get_executive_summary(
    plant_id:  Optional[str]  = Query(None),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    period:    Optional[str]  = Query(None, description="today | 7d | 30d"),
):
    return compute_executive_summary(plant_id=plant_id, date_from=date_from, date_to=date_to, period=period)


@router.get("/workstreams", response_model=List[WorkstreamItem])
def get_workstreams(
    plant_id:  Optional[str]  = Query(None),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    period:    Optional[str]  = Query(None, description="today | 7d | 30d"),
):
    return compute_workstreams(plant_id=plant_id, date_from=date_from, date_to=date_to, period=period)


@router.get("/data-trust", response_model=DataTrust)
def get_data_trust():
    return compute_data_trust()
