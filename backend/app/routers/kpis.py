from fastapi import APIRouter, Query
from typing import Optional
from datetime import date as date_type

from app.models import DailyKPIs
from app.services.kpi_engine import compute_daily_kpis

router = APIRouter(prefix="/kpis", tags=["kpis"])


@router.get("", response_model=DailyKPIs)
def get_daily_kpis(
    plant_id:  Optional[str]       = Query(None, description="Plant ID or 'all' (default: all plants)"),
    date:      Optional[str]       = Query(None, description="ISO date YYYY-MM-DD (single-day mode)"),
    date_from: Optional[date_type] = Query(None, description="Range start YYYY-MM-DD"),
    date_to:   Optional[date_type] = Query(None, description="Range end YYYY-MM-DD"),
    period:    Optional[str]       = Query(None, description="today | 7d | 30d"),
):
    """
    Daily operational KPIs with RAG status.

    Period mode: pass ?period=today|7d|30d → backend resolves date range from dataset.
    Range mode: pass ?date_from=...&date_to=... → returns daily averages over the period.
    Single-date mode: pass ?date=YYYY-MM-DD (default: latest available date).
    """
    target = date_type.fromisoformat(date) if date else None

    if period or (date_from and date_to):
        return compute_daily_kpis(plant_id=plant_id or "all", date_from=date_from, date_to=date_to, period=period)

    return compute_daily_kpis(plant_id=plant_id or "all", target_date=target)


@router.get("/per-plant", response_model=list[DailyKPIs])
def get_kpis_per_plant(
    date:      Optional[str]       = Query(None, description="ISO date YYYY-MM-DD"),
    date_from: Optional[date_type] = Query(None),
    date_to:   Optional[date_type] = Query(None),
    period:    Optional[str]       = Query(None, description="today | 7d | 30d"),
):
    """Return KPIs separately for every plant (supports range mode)."""
    from app.services.data_service import load_data
    df = load_data()

    if period or (date_from and date_to):
        plants = df["plant_id"].unique().tolist()
        return [compute_daily_kpis(plant_id=pid, date_from=date_from, date_to=date_to, period=period) for pid in plants]

    target = date_type.fromisoformat(date) if date else df["date"].max().date()
    plants = df["plant_id"].unique().tolist()
    return [compute_daily_kpis(plant_id=pid, target_date=target) for pid in plants]
