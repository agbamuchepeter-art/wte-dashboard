"""
Data service — loads, enriches, and caches the waste CSV.
All derived metrics (energy, efficiency, revenue, profit) are computed
once at startup and served from memory. Live readings add small noise
on top of same-day historical baselines.
"""
import hashlib
from datetime import datetime, date, timedelta
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.config import settings
from app.models import (
    Alert,
    KPISummary,
    LiveReading,
    PlantComparisonItem,
    PlantInfo,
    TimeSeriesPoint,
)

# ── Energy constants (MWh per ton) ───────────────────────────────────────────

ENERGY_RATES: Dict[str, float] = {
    "Plastic": 2.40,
    "Paper/Cardboard": 1.80,
    "Industrial Waste": 1.60,
    "Organic": 0.90,
    "Metal": 0.30,
}

THEORETICAL_MAX: Dict[str, float] = {
    "Plastic": 3.50,
    "Paper/Cardboard": 2.50,
    "Industrial Waste": 2.40,
    "Organic": 1.40,
    "Metal": 0.50,
}

PLANT_NAMES: Dict[str, str] = {
    "WTE_RTM_01": "WTE Rotterdam Port",
    "WTE_RTM_02": "WTE Rotterdam City",
}

# ── Deterministic seed per (plant, date) ─────────────────────────────────────

def _seed(plant_id: str, day: date) -> int:
    key = f"{plant_id}{day.isoformat()}"
    return int(hashlib.md5(key.encode()).hexdigest()[:8], 16)


def _plant_day_state(plant_id: str, day: date) -> Tuple[str, float]:
    """Return (status, efficiency_factor) for a plant on a given day."""
    rng = np.random.default_rng(_seed(plant_id, day))
    base_eff = float(rng.uniform(0.63, 0.84))
    r = float(rng.random())
    if r < 0.005:
        return "downtime", 0.0
    if r < 0.025:
        return "maintenance", float(rng.uniform(0.35, 0.55))
    return "operational", base_eff


# ── Load & enrich ─────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def load_data() -> pd.DataFrame:
    df = pd.read_csv(settings.data_path, parse_dates=["date"])

    # Standardise column names (already done, but be safe)
    df.columns = (
        df.columns.str.strip().str.lower().str.replace(r"[^a-z0-9]+", "_", regex=True)
    )

    # Ensure total_cost_eur exists
    if "total_cost_eur" not in df.columns:
        df["total_cost_eur"] = df["weight_tons"] * df["cost_per_ton_eur"]

    # Energy rates per waste type
    df["theoretical_max_mwh_per_ton"] = df["waste_type"].map(THEORETICAL_MAX).fillna(2.0)

    # Build per (plant, date) efficiency lookup
    unique_days = df[["plant_id", "date"]].drop_duplicates()
    state_map: Dict[Tuple[str, date], Tuple[str, float]] = {}
    for _, row in unique_days.iterrows():
        key = (row["plant_id"], row["date"].date())
        state_map[key] = _plant_day_state(row["plant_id"], row["date"].date())

    df["_key"] = list(zip(df["plant_id"], df["date"].dt.date))
    df["operational_status"] = df["_key"].map(lambda k: state_map[k][0])
    df["efficiency_factor"] = df["_key"].map(lambda k: state_map[k][1])
    df.drop(columns=["_key"], inplace=True)

    # Energy output
    df["energy_output_mwh"] = (
        df["weight_tons"] * df["theoretical_max_mwh_per_ton"] * df["efficiency_factor"]
    )
    df["efficiency_pct"] = df["efficiency_factor"] * 100

    # Financials
    df["revenue_eur"] = df["energy_output_mwh"] * settings.electricity_price_eur_mwh
    df["profit_eur"] = df["revenue_eur"] - df["total_cost_eur"]
    df["profit_per_ton"] = df["profit_eur"] / df["weight_tons"].clip(lower=0.001)
    df["energy_per_ton"] = df["energy_output_mwh"] / df["weight_tons"].clip(lower=0.001)

    return df


# ── Filters helper ────────────────────────────────────────────────────────────

def _apply_filters(
    df: pd.DataFrame,
    plant_id: Optional[str],
    date_from: Optional[str],
    date_to: Optional[str],
) -> pd.DataFrame:
    if plant_id and plant_id != "all":
        df = df[df["plant_id"] == plant_id]
    if date_from:
        df = df[df["date"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["date"] <= pd.Timestamp(date_to)]
    return df


# ── API-facing functions ──────────────────────────────────────────────────────

def get_plants() -> List[PlantInfo]:
    df = load_data()
    latest = df.groupby("plant_id").apply(lambda g: g.loc[g["date"].idxmax()])
    plants = []
    for _, row in latest.iterrows():
        plants.append(
            PlantInfo(
                plant_id=row["plant_id"],
                name=PLANT_NAMES.get(row["plant_id"], row["plant_id"]),
                location=row["location"],
                status=row["operational_status"],
                efficiency_pct=round(float(row["efficiency_pct"]), 1),
                last_updated=row["date"].date().isoformat(),
            )
        )
    return plants


def get_kpis(
    plant_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> KPISummary:
    df = _apply_filters(load_data(), plant_id, date_from, date_to)

    period_days = int((df["date"].max() - df["date"].min()).days) + 1 if len(df) else 0
    total_waste = float(df["weight_tons"].sum())
    total_energy = float(df["energy_output_mwh"].sum())
    total_revenue = float(df["revenue_eur"].sum())
    total_cost = float(df["total_cost_eur"].sum())

    return KPISummary(
        total_waste_tons=round(total_waste, 2),
        total_energy_mwh=round(total_energy, 2),
        overall_efficiency_pct=round(float(df["efficiency_pct"].mean()), 2) if len(df) else 0,
        avg_energy_per_ton=round(float(df["energy_per_ton"].mean()), 3) if len(df) else 0,
        avg_profit_per_ton=round(float(df["profit_per_ton"].mean()), 2) if len(df) else 0,
        total_revenue_eur=round(total_revenue, 2),
        total_cost_eur=round(total_cost, 2),
        total_profit_eur=round(total_revenue - total_cost, 2),
        period_days=period_days,
        records=len(df),
    )


def get_timeseries(
    metric: str,
    plant_id: Optional[str] = None,
    granularity: str = "daily",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[TimeSeriesPoint]:
    valid_metrics = {
        "efficiency_pct", "energy_output_mwh", "weight_tons",
        "profit_per_ton", "energy_per_ton", "revenue_eur", "profit_eur",
    }
    if metric not in valid_metrics:
        raise ValueError(f"Unknown metric '{metric}'. Valid: {valid_metrics}")

    df = _apply_filters(load_data(), plant_id, date_from, date_to)

    freq_map = {"daily": "D", "weekly": "W", "monthly": "ME"}
    freq = freq_map.get(granularity, "D")

    agg = "mean" if metric in ("efficiency_pct", "profit_per_ton", "energy_per_ton") else "sum"

    if plant_id and plant_id != "all":
        grouped = df.resample(freq, on="date")[metric].agg(agg).reset_index()
        return [
            TimeSeriesPoint(date=str(r["date"].date()), value=round(float(r[metric]), 3))
            for _, r in grouped.iterrows()
        ]
    else:
        points = []
        for pid in df["plant_id"].unique():
            sub = df[df["plant_id"] == pid].resample(freq, on="date")[metric].agg(agg).reset_index()
            for _, r in sub.iterrows():
                points.append(
                    TimeSeriesPoint(
                        date=str(r["date"].date()),
                        value=round(float(r[metric]), 3),
                        plant_id=pid,
                    )
                )
        return points


def get_comparison(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[PlantComparisonItem]:
    df = _apply_filters(load_data(), None, date_from, date_to)
    items = []
    for pid, grp in df.groupby("plant_id"):
        items.append(
            PlantComparisonItem(
                plant_id=str(pid),
                location=grp["location"].iloc[0],
                total_waste_tons=round(float(grp["weight_tons"].sum()), 2),
                total_energy_mwh=round(float(grp["energy_output_mwh"].sum()), 2),
                avg_efficiency_pct=round(float(grp["efficiency_pct"].mean()), 2),
                avg_energy_per_ton=round(float(grp["energy_per_ton"].mean()), 3),
                avg_profit_per_ton=round(float(grp["profit_per_ton"].mean()), 2),
                total_revenue_eur=round(float(grp["revenue_eur"].sum()), 2),
                total_cost_eur=round(float(grp["total_cost_eur"].sum()), 2),
                total_profit_eur=round(float(grp["profit_eur"].sum()), 2),
                operational_days=int((grp["operational_status"] == "operational").sum()),
                downtime_records=int((grp["operational_status"] == "downtime").sum()),
                maintenance_records=int((grp["operational_status"] == "maintenance").sum()),
                status=grp.loc[grp["date"].idxmax(), "operational_status"],
            )
        )
    return items


def get_alerts(
    plant_id: Optional[str] = None,
    active_only: bool = False,
    limit: int = 50,
) -> List[Alert]:
    df = _apply_filters(load_data(), plant_id, None, None)

    # Look at last 30 days only for alerts
    cutoff = df["date"].max() - timedelta(days=30)
    df = df[df["date"] >= cutoff]

    alerts: List[Alert] = []

    for _, row in df.iterrows():
        ts = str(row["date"].date())
        pid = row["plant_id"]

        if row["operational_status"] == "downtime":
            alerts.append(Alert(
                id=f"{pid}-{ts}-downtime",
                plant_id=pid,
                alert_type="downtime",
                severity="critical",
                message=f"{PLANT_NAMES.get(pid, pid)} was offline on {ts}",
                timestamp=ts,
                metric_value=0.0,
                threshold=100.0,
            ))
        elif row["operational_status"] == "maintenance":
            alerts.append(Alert(
                id=f"{pid}-{ts}-maintenance",
                plant_id=pid,
                alert_type="maintenance",
                severity="warning",
                message=f"{PLANT_NAMES.get(pid, pid)} in maintenance on {ts} "
                        f"(efficiency {row['efficiency_pct']:.1f}%)",
                timestamp=ts,
                metric_value=round(float(row["efficiency_pct"]), 1),
                threshold=settings.efficiency_threshold,
            ))
        elif row["efficiency_pct"] < settings.efficiency_threshold:
            alerts.append(Alert(
                id=f"{pid}-{ts}-eff",
                plant_id=pid,
                alert_type="efficiency_low",
                severity="warning",
                message=f"{PLANT_NAMES.get(pid, pid)} efficiency {row['efficiency_pct']:.1f}% "
                        f"below {settings.efficiency_threshold}% threshold on {ts}",
                timestamp=ts,
                metric_value=round(float(row["efficiency_pct"]), 1),
                threshold=settings.efficiency_threshold,
            ))

        if row["profit_per_ton"] < settings.loss_threshold:
            alerts.append(Alert(
                id=f"{pid}-{ts}-loss",
                plant_id=pid,
                alert_type="loss",
                severity="warning",
                message=f"{PLANT_NAMES.get(pid, pid)} loss of EUR {abs(row['profit_per_ton']):.2f}/ton on {ts}",
                timestamp=ts,
                metric_value=round(float(row["profit_per_ton"]), 2),
                threshold=settings.loss_threshold,
            ))

    # Deduplicate by id and sort newest first
    seen: set = set()
    unique: List[Alert] = []
    for a in sorted(alerts, key=lambda x: x.timestamp, reverse=True):
        if a.id not in seen:
            seen.add(a.id)
            unique.append(a)

    return unique[:limit]


def get_live_readings() -> List[LiveReading]:
    """Simulate current plant readings with small noise on today's baseline."""
    df = load_data()
    today = date.today()

    # Use today's data if available, else latest available day
    today_df = df[df["date"].dt.date == today]
    if today_df.empty:
        latest_date = df["date"].max().date()
        today_df = df[df["date"].dt.date == latest_date]

    readings: List[LiveReading] = []
    for pid in df["plant_id"].unique():
        plant_df = today_df[today_df["plant_id"] == pid]
        if plant_df.empty:
            continue

        # Deterministic noise based on current minute so it changes ~each minute
        noise_seed = int(hashlib.md5(
            f"{pid}{datetime.now().strftime('%Y%m%d%H%M')}".encode()
        ).hexdigest()[:8], 16)
        rng = np.random.default_rng(noise_seed)
        noise = float(rng.uniform(0.97, 1.03))

        eff = float(plant_df["efficiency_pct"].mean()) * noise
        eff = round(min(eff, 100.0), 1)
        energy = round(float(plant_df["energy_output_mwh"].sum()) * noise, 2)
        waste = round(float(plant_df["weight_tons"].sum()) * noise, 2)
        energy_per_ton = round(energy / waste if waste > 0 else 0, 3)
        revenue = round(energy * settings.electricity_price_eur_mwh, 2)
        cost = round(float(plant_df["total_cost_eur"].sum()) * noise, 2)
        profit_per_ton = round((revenue - cost) / waste if waste > 0 else 0, 2)
        status = plant_df["operational_status"].mode().iloc[0]

        readings.append(LiveReading(
            plant_id=str(pid),
            location=plant_df["location"].iloc[0],
            timestamp=datetime.now().isoformat(),
            status=status,
            efficiency_pct=eff,
            energy_output_mwh=energy,
            waste_input_tons=waste,
            energy_per_ton=energy_per_ton,
            profit_per_ton=profit_per_ton,
            revenue_eur=revenue,
            alert_active=eff < settings.efficiency_threshold or status != "operational",
        ))

    return readings
