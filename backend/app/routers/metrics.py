from datetime import datetime
from fastapi import APIRouter, Query
from typing import List, Optional

from app.models import KPISummary, TimeSeriesResponse, PlantComparisonItem, LiveReading
from app.services.data_service import (
    get_kpis,
    get_timeseries,
    get_comparison,
    get_live_readings,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])

VALID_METRICS = [
    "efficiency_pct",
    "energy_output_mwh",
    "weight_tons",
    "profit_per_ton",
    "energy_per_ton",
    "revenue_eur",
    "profit_eur",
]

VALID_GRANULARITIES = ["daily", "weekly", "monthly"]


@router.get("/kpis", response_model=KPISummary)
def kpis(
    plant_id: Optional[str] = Query(None, description="Filter by plant ID or 'all'"),
    date_from: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
):
    """Aggregated KPIs for the selected plant and date range."""
    return get_kpis(plant_id, date_from, date_to)


@router.get("/timeseries", response_model=TimeSeriesResponse)
def timeseries(
    metric: str = Query(..., description=f"One of: {VALID_METRICS}"),
    plant_id: Optional[str] = Query(None),
    granularity: str = Query("daily", description="daily | weekly | monthly"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    period: Optional[str] = Query(None, description="today | 7d | 30d"),
):
    """Time series data for any metric, optionally per plant."""
    if metric not in VALID_METRICS:
        from fastapi import HTTPException
        raise HTTPException(400, f"Invalid metric. Choose from: {VALID_METRICS}")
    if granularity not in VALID_GRANULARITIES:
        from fastapi import HTTPException
        raise HTTPException(400, f"Invalid granularity. Choose from: {VALID_GRANULARITIES}")

    # Resolve period → date range
    if period and not (date_from and date_to):
        from app.services.data_service import load_data
        from app.services.kpi_engine import resolve_period
        df = load_data()
        df_from, df_to = resolve_period(period, df["date"].max().date())
        date_from = df_from.isoformat()
        date_to   = df_to.isoformat()

    series = get_timeseries(metric, plant_id, granularity, date_from, date_to)
    return TimeSeriesResponse(metric=metric, granularity=granularity, series=series)


@router.get("/comparison", response_model=List[PlantComparisonItem])
def comparison(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    period:    Optional[str] = Query(None, description="today | 7d | 30d"),
):
    """Side-by-side comparison of all plants."""
    if period and not (date_from and date_to):
        from app.services.data_service import load_data
        from app.services.kpi_engine import resolve_period
        df = load_data()
        df_from, df_to = resolve_period(period, df["date"].max().date())
        date_from = df_from.isoformat()
        date_to   = df_to.isoformat()
    return get_comparison(date_from, date_to)


@router.get("/live", response_model=List[LiveReading])
def live():
    """Current simulated live readings for all plants."""
    return get_live_readings()


@router.get("/filter-diagnostic")
def filter_diagnostic(
    period:   Optional[str] = Query(None, description="today | 7d | 30d"),
    plant_id: Optional[str] = Query(None),
):
    """
    Diagnostic endpoint — returns every detail of how the time filter is applied.
    Used by the frontend debug panel. NOT cached; always reflects live state.
    """
    from datetime import date as date_type
    from app.services.data_service import load_data
    from app.services.kpi_engine import resolve_period, period_anchor
    import pandas as pd

    df = load_data()
    ds_latest  = df["date"].max().date()
    ds_earliest = df["date"].min().date()
    anchor     = period_anchor(ds_latest)
    today_machine = date_type.today()
    total_rows = int(len(df))

    PERIOD_LABELS = {"today": "Today", "7d": "Last 7 Days", "30d": "Last 30 Days"}
    period_label  = PERIOD_LABELS.get(period or "", "No period selected")

    # Resolve the date range
    if period:
        start_date, end_date = resolve_period(period, ds_latest)
    else:
        start_date = end_date = anchor

    # Step 1: plant filter
    after_plant = df.copy()
    plant_filter_applied = False
    if plant_id and plant_id != "all":
        after_plant = after_plant[after_plant["plant_id"] == plant_id]
        plant_filter_applied = True
    rows_after_plant = int(len(after_plant))

    # Step 2: date filter — check dtype then apply
    date_col_dtype = str(df["date"].dtype)
    date_col_sample = [str(v) for v in df["date"].head(3).tolist()]

    # Apply via .dt.date (correct for datetime64)
    date_mask = (
        (after_plant["date"].dt.date >= start_date) &
        (after_plant["date"].dt.date <= end_date)
    )
    after_date = after_plant[date_mask]
    rows_after_date = int(len(after_date))

    unique_dates = sorted(after_date["date"].dt.date.unique().tolist())
    sample_dates = [str(d) for d in unique_dates[:5]]

    filter_active   = rows_after_date != total_rows
    rows_changed    = rows_after_date != rows_after_plant
    expected_days   = {"today": 1, "7d": 7, "30d": 30}.get(period or "", 1)
    actual_days     = int(after_date["date"].dt.date.nunique())

    # Anomaly flags
    anomalies = []
    if not filter_active:
        anomalies.append("DATE FILTER HAS NO EFFECT — same rows before and after date filter")
    if period and actual_days < expected_days:
        anomalies.append(f"Fewer days than expected: got {actual_days}, expected {expected_days}")
    if rows_after_date == 0:
        anomalies.append("ZERO ROWS after date filter — no data in selected range")
    if str(date_col_dtype) == "object":
        anomalies.append("CRITICAL: date column dtype is 'object' (string) — date comparison will fail")

    return {
        "timestamp": datetime.now().isoformat(),
        "dataset": {
            "total_rows":       total_rows,
            "earliest_date":    str(ds_earliest),
            "latest_date":      str(ds_latest),
            "date_column_dtype": date_col_dtype,
            "date_column_sample": date_col_sample,
        },
        "machine": {
            "today":        str(today_machine),
            "anchor_date":  str(anchor),
            "anchor_note":  "min(dataset_latest, machine_today)",
        },
        "request": {
            "period":       period,
            "period_label": period_label,
            "plant_id":     plant_id or "all",
        },
        "resolved": {
            "start_date":    str(start_date),
            "end_date":      str(end_date),
            "expected_days": expected_days,
        },
        "filter_result": {
            "rows_before_any_filter":  total_rows,
            "rows_after_plant_filter": rows_after_plant,
            "rows_after_date_filter":  rows_after_date,
            "plant_filter_applied":    plant_filter_applied,
            "date_filter_applied":     filter_active,
            "unique_dates_in_window":  actual_days,
            "sample_dates_in_window":  sample_dates,
        },
        "validation": {
            "filter_is_working":  filter_active and rows_after_date > 0,
            "rows_changed":       rows_changed,
            "anomalies":          anomalies,
        },
    }


@router.get("/meta")
def meta():
    """Dataset metadata: date range, record count, plant IDs, and effective anchor date."""
    from app.services.data_service import load_data
    from app.services.kpi_engine import period_anchor
    df = load_data()
    ds_latest = df["date"].max().date()
    anchor    = period_anchor(ds_latest)
    return {
        "latest_date":   str(ds_latest),
        "earliest_date": str(df["date"].min().date()),
        "anchor_date":   str(anchor),   # effective "today" for period resolution
        "record_count":  int(len(df)),
        "plant_ids":     sorted(df["plant_id"].unique().tolist()),
    }


@router.get("/debug")
def debug(
    plant_id:  Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    period:    Optional[str] = Query(None, description="today | 7d | 30d"),
):
    """Debug: return filter metadata including anchor date, resolved range, and record count."""
    from app.services.data_service import load_data
    from app.services.kpi_engine import resolve_period, period_anchor
    import pandas as pd
    df = load_data()

    ds_latest  = df["date"].max().date()
    anchor     = period_anchor(ds_latest)

    if period and not (date_from and date_to):
        df_from, df_to = resolve_period(period, ds_latest)
        date_from = df_from.isoformat()
        date_to   = df_to.isoformat()

    filtered = df.copy()
    if plant_id and plant_id != "all":
        filtered = filtered[filtered["plant_id"] == plant_id]
    if date_from:
        filtered = filtered[filtered["date"] >= pd.Timestamp(date_from)]
    if date_to:
        filtered = filtered[filtered["date"] <= pd.Timestamp(date_to)]

    return {
        "plant_id":       plant_id or "all",
        "period":         period,
        "dataset_latest": str(ds_latest),
        "anchor_date":    str(anchor),
        "date_from":      date_from,
        "date_to":        date_to,
        "record_count":   int(len(filtered)),
        "date_range":     f"{str(filtered['date'].min().date())} → {str(filtered['date'].max().date())}" if len(filtered) else "no data",
    }
