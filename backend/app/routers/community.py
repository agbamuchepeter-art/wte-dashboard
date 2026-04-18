from fastapi import APIRouter, Query
from typing import Optional
from datetime import date

from app.models import CommunityData
from app.services.community_service import compute_community

router = APIRouter(prefix="/community", tags=["community"])


@router.get("", response_model=CommunityData)
def get_community(
    target_date: Optional[date] = Query(None),
    plant_id:    Optional[str]  = Query(None),
    date_from:   Optional[date] = Query(None),
    date_to:     Optional[date] = Query(None),
    period:      Optional[str]  = Query(None, description="today | 7d | 30d"),
):
    return compute_community(
        target_date=target_date,
        plant_id=plant_id,
        date_from=date_from,
        date_to=date_to,
        period=period,
    )
