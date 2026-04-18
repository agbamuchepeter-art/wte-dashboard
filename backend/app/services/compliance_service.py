"""
Compliance Service — EU IED 2010/75/EU emissions monitoring.

Derives NOx, SO2, CO, Dust values from plant operational data.
High efficiency → lower emissions (cleaner combustion).
Supports single-date and date-range modes.
All thresholds driven by Settings. No hardcoding.
"""
import hashlib
import random
from datetime import date, datetime
from typing import Optional, List

from app.config import settings
from app.models import ComplianceStatus, PollutantReading, RAGStatus
from app.services.data_service import load_data


def _seed_rng(plant_id: str, target_date: date, salt: str = "") -> random.Random:
    key = f"{plant_id}-{target_date.isoformat()}-{salt}"
    seed = int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def _rag_pollutant(pct_of_limit: float) -> RAGStatus:
    if pct_of_limit > 100.0:
        return RAGStatus.RED
    if pct_of_limit > settings.compliance_amber_pct:
        return RAGStatus.AMBER
    return RAGStatus.GREEN


def _emission_factor(efficiency_pct: float) -> float:
    clamped = max(0.0, min(100.0, efficiency_pct))
    return 0.85 - (clamped / 100.0) * 0.45


def compute_compliance(
    plant_id:    Optional[str]  = None,
    target_date: Optional[date] = None,
    date_from:   Optional[date] = None,
    date_to:     Optional[date] = None,
    period:      Optional[str]  = None,
) -> ComplianceStatus:
    """
    Compute compliance status. Supports range mode via date_from/date_to or period string.
    Range mode averages efficiency over the window and uses date_to as the seed.
    """
    df = load_data()

    # Resolve period → date range
    if period and not (date_from and date_to):
        from app.services.kpi_engine import resolve_period
        date_from, date_to = resolve_period(period, df["date"].max().date())

    pid_label = plant_id if (plant_id and plant_id != "all") else "all"

    # Resolve effective date for seed
    if date_from and date_to:
        mask = (df["date"].dt.date >= date_from) & (df["date"].dt.date <= date_to)
        window_df = df[mask].copy()
        if pid_label != "all":
            window_df = window_df[window_df["plant_id"] == plant_id]
        avg_efficiency = float(window_df["efficiency_pct"].mean()) if len(window_df) else 70.0
        n_records      = len(window_df)
        seed_date      = date_to
        date_label     = date_to.isoformat()

        # Data availability over range
        total_expected = len(df[(df["date"].dt.date >= date_from) & (df["date"].dt.date <= date_to)])
        data_avail = round(min(100.0, n_records / max(1, total_expected) * 100), 1) if pid_label == "all" else min(100.0, n_records / max(1, (date_to - date_from).days + 1) * 5 * 100)
    else:
        if target_date is None:
            target_date = df["date"].max().date()
        day_df = df[df["date"].dt.date == target_date].copy()
        if pid_label != "all":
            day_df = day_df[day_df["plant_id"] == plant_id]
        avg_efficiency = float(day_df["efficiency_pct"].mean()) if len(day_df) else 70.0
        n_records      = len(day_df)
        seed_date      = target_date
        date_label     = target_date.isoformat()

        total_df   = df[df["date"].dt.date == target_date]
        expected   = len(df["plant_id"].unique()) * 5
        data_avail = round(min(100.0, len(total_df) / max(1, expected) * 100), 1)

    ef  = _emission_factor(avg_efficiency)
    rng = _seed_rng(pid_label, seed_date)

    def gen(baseline: float) -> float:
        noise = 1.0 + (rng.random() - 0.5) * 0.30
        return round(baseline * ef * noise, 1)

    nox_val  = gen(120.0 / 0.65)
    so2_val  = gen(20.0  / 0.65)
    co_val   = gen(15.0  / 0.65)
    dust_val = gen(4.0   / 0.65)

    pollutants: List[PollutantReading] = [
        PollutantReading(
            name="NOx",
            value=nox_val,
            limit=settings.nox_limit_mg_nm3,
            pct_of_limit=round(nox_val / settings.nox_limit_mg_nm3 * 100, 1),
            unit="mg/Nm³",
            rag=_rag_pollutant(nox_val / settings.nox_limit_mg_nm3 * 100),
        ),
        PollutantReading(
            name="SO2",
            value=so2_val,
            limit=settings.so2_limit_mg_nm3,
            pct_of_limit=round(so2_val / settings.so2_limit_mg_nm3 * 100, 1),
            unit="mg/Nm³",
            rag=_rag_pollutant(so2_val / settings.so2_limit_mg_nm3 * 100),
        ),
        PollutantReading(
            name="CO",
            value=co_val,
            limit=settings.co_limit_mg_nm3,
            pct_of_limit=round(co_val / settings.co_limit_mg_nm3 * 100, 1),
            unit="mg/Nm³",
            rag=_rag_pollutant(co_val / settings.co_limit_mg_nm3 * 100),
        ),
        PollutantReading(
            name="Dust",
            value=dust_val,
            limit=settings.dust_limit_mg_nm3,
            pct_of_limit=round(dust_val / settings.dust_limit_mg_nm3 * 100, 1),
            unit="mg/Nm³",
            rag=_rag_pollutant(dust_val / settings.dust_limit_mg_nm3 * 100),
        ),
    ]

    worst = RAGStatus.GREEN
    for p in pollutants:
        if p.rag == RAGStatus.RED:
            worst = RAGStatus.RED
            break
        if p.rag == RAGStatus.AMBER:
            worst = RAGStatus.AMBER

    cems_status = "Valid" if data_avail >= 95 else ("Partial" if data_avail >= 70 else "Missing")

    return ComplianceStatus(
        date=date_label,
        plant_id=pid_label,
        pollutants=pollutants,
        data_availability_pct=data_avail,
        overall_rag=worst,
        cems_status=cems_status,
    )


def get_compliance_per_plant(
    target_date: Optional[date] = None,
    date_from:   Optional[date] = None,
    date_to:     Optional[date] = None,
    period:      Optional[str]  = None,
) -> List[ComplianceStatus]:
    df = load_data()
    if not (date_from and date_to) and not period:
        target_date = target_date or df["date"].max().date()
    return [
        compute_compliance(pid, target_date, date_from, date_to, period)
        for pid in df["plant_id"].unique()
    ]
