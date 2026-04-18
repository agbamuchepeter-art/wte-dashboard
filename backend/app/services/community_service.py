"""
Community Engagement Service.

Derives public approval rating from operational performance.
Supports plant filtering and date-range mode.
"""
import hashlib
import random
from datetime import date, timedelta
from typing import Optional

from app.config import settings
from app.models import CommunityData, RAGStatus
from app.services.data_service import load_data


def _seed_rng(target_date: date) -> random.Random:
    key = f"community-{target_date.isoformat()}"
    seed = int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def _rag_approval(rating: float) -> RAGStatus:
    if rating >= settings.community_approval_green:
        return RAGStatus.GREEN
    if rating >= settings.community_approval_amber:
        return RAGStatus.AMBER
    return RAGStatus.RED


def compute_community(
    target_date: Optional[date] = None,
    plant_id:    Optional[str]  = None,
    date_from:   Optional[date] = None,
    date_to:     Optional[date] = None,
    period:      Optional[str]  = None,
) -> CommunityData:
    """
    Compute community engagement.
    - plant_id: optional filter to a specific plant
    - period: "today"|"7d"|"30d" — resolved to date range from dataset
    - date_from / date_to: explicit rolling window
    """
    df = load_data()

    # Resolve period → date range
    if period and not (date_from and date_to):
        from app.services.kpi_engine import resolve_period
        date_from, date_to = resolve_period(period, df["date"].max().date())

    pid_label = plant_id if (plant_id and plant_id != "all") else None

    # Resolve reference date
    if date_from and date_to:
        ref_date = date_to
        window_df = df[(df["date"].dt.date >= date_from) & (df["date"].dt.date <= date_to)].copy()
    else:
        if target_date is None:
            target_date = df["date"].max().date()
        ref_date     = target_date
        window_start = target_date - timedelta(days=30)
        window_df = df[
            (df["date"].dt.date > window_start) &
            (df["date"].dt.date <= target_date)
        ].copy()

    if pid_label:
        window_df = window_df[window_df["plant_id"] == pid_label]

    avg_eff        = float(window_df["efficiency_pct"].mean()) if len(window_df) else 70.0
    downtime_days  = int((window_df["operational_status"] == "downtime").sum())
    downtime_penalty = min(15.0, downtime_days * 1.5)

    base_rating = 68.0 + (avg_eff - 50.0) * 0.40
    rng         = _seed_rng(ref_date)
    noise       = (rng.random() - 0.5) * 6.0
    raw_rating  = base_rating - downtime_penalty + noise
    rating      = round(max(40.0, min(98.0, raw_rating)), 1)

    # Trend: compare against prior period of equal length
    if date_from and date_to:
        span_days = max(1, (date_to - date_from).days)
        prev_to   = date_from - timedelta(days=1)
        prev_from = prev_to - timedelta(days=span_days)
        prev_df   = df[(df["date"].dt.date >= prev_from) & (df["date"].dt.date <= prev_to)]
    else:
        prev_start = ref_date - timedelta(days=60)
        prev_end   = ref_date - timedelta(days=31)
        prev_df    = df[(df["date"].dt.date > prev_start) & (df["date"].dt.date <= prev_end)]

    if pid_label:
        prev_df = prev_df[prev_df["plant_id"] == pid_label]

    prev_eff   = float(prev_df["efficiency_pct"].mean()) if len(prev_df) else avg_eff
    prev_base  = 68.0 + (prev_eff - 50.0) * 0.40
    prev_rng   = _seed_rng(ref_date - timedelta(days=30))
    prev_noise = (prev_rng.random() - 0.5) * 6.0
    prev_rating = round(max(40.0, min(98.0, prev_base + prev_noise)), 1)
    delta       = round(rating - prev_rating, 1)

    trend = "stable" if abs(delta) < 0.5 else ("up" if delta > 0 else "down")

    rng2       = _seed_rng(ref_date)
    engagement = round(55.0 + rng2.random() * 40.0, 1)
    complaints = max(0, int((100.0 - rating) / 5.0) + rng.randint(-2, 2))

    rag = _rag_approval(rating)
    if rag == RAGStatus.GREEN:
        narrative = (
            f"Public approval at {rating:.0f}% — community relations are strong. "
            f"Plant operations are well-received by local residents."
        )
    elif rag == RAGStatus.AMBER:
        narrative = (
            f"Public approval at {rating:.0f}% — below the {settings.community_approval_green:.0f}% target. "
            f"Recommend proactive engagement to address resident concerns."
        )
    else:
        narrative = (
            f"Public approval at {rating:.0f}% — below acceptable threshold. "
            f"Immediate community liaison action required to prevent escalation."
        )

    return CommunityData(
        date=ref_date.isoformat(),
        approval_rating=rating,
        trend=trend,
        trend_delta=delta,
        rag=rag,
        narrative=narrative,
        engagement_score=engagement,
        complaints_this_month=complaints,
    )
