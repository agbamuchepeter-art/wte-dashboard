"""
KPI Engine — computes daily operational KPIs with RAG classification.

Date resolution priority (highest to lowest):
  1. period param  ("today" | "7d" | "30d") — resolved from dataset's own latest date
  2. date_from + date_to range
  3. target_date   (single day)
  4. no params     → latest available date

In range / period mode all KPIs represent daily averages over the window.
All thresholds are driven by Settings (config.py). No hardcoding.
"""
from datetime import date, datetime, timedelta
from typing import Optional

import pandas as pd

from app.config import settings
from app.models import DailyKPIs, KPIValue, RAGStatus
from app.services.data_service import PLANT_NAMES, load_data

# ── RAG classifiers ───────────────────────────────────────────────────────────

def _rag_throughput(v: float) -> RAGStatus:
    if v >= settings.throughput_green:  return RAGStatus.GREEN
    if v >= settings.throughput_amber:  return RAGStatus.AMBER
    return RAGStatus.RED

def _rag_efficiency(v: float) -> RAGStatus:
    if v >= settings.efficiency_green:  return RAGStatus.GREEN
    if v >= settings.efficiency_amber:  return RAGStatus.AMBER
    return RAGStatus.RED

def _rag_downtime(v: float) -> RAGStatus:
    if v < settings.downtime_green:     return RAGStatus.GREEN
    if v <= settings.downtime_amber:    return RAGStatus.AMBER
    return RAGStatus.RED

def _rag_profit(v: float) -> RAGStatus:
    if v > settings.profit_green:       return RAGStatus.GREEN
    if v >= settings.profit_amber:      return RAGStatus.AMBER
    return RAGStatus.RED

# ── Formatters ────────────────────────────────────────────────────────────────

def _fmt_tons(v: float) -> str:    return f"{v:,.1f} t"
def _fmt_mwh(v: float) -> str:     return f"{v:,.1f} MWh"
def _fmt_pct(v: float) -> str:     return f"{v:.1f}%"
def _fmt_hours(v: float) -> str:   return f"{v:.1f} hrs"
def _fmt_eur(v: float) -> str:
    sign = "-" if v < 0 else ""
    return f"{sign}EUR {abs(v):,.0f}"
def _fmt_seconds(v: float) -> str:
    if v < 60:    return f"{v:.0f}s"
    if v < 3600:  return f"{v/60:.0f}m"
    return f"{v/3600:.1f}h"

# ── Period resolver ───────────────────────────────────────────────────────────

def period_anchor(df_latest: date) -> date:
    """
    Return the effective 'today' for period resolution.

    The dataset may contain future-dated rows (pre-generated full-year CSVs).
    We anchor to today's real date if it falls within the dataset, otherwise
    to the dataset's latest date.  This ensures "Today" = actual today, not
    some future date that happens to be the CSV's last row.
    """
    return min(df_latest, datetime.now().date())


def resolve_period(period: str, df_latest: date) -> tuple[date, date]:
    """Convert period string to (date_from, date_to) anchored at effective today."""
    anchor = period_anchor(df_latest)
    if period == "today":
        return anchor, anchor
    if period == "7d":
        return anchor - timedelta(days=6), anchor
    if period == "30d":
        return anchor - timedelta(days=29), anchor
    if period == "90d":
        return anchor - timedelta(days=89), anchor
    if period == "this-month":
        return anchor.replace(day=1), anchor
    if period == "this-year":
        return anchor.replace(month=1, day=1), anchor
    return anchor, anchor   # fallback

# ── Data latency ──────────────────────────────────────────────────────────────

def _compute_data_latency_seconds() -> float:
    df = load_data()
    anchor: date = period_anchor(df["date"].max().date())
    delta = datetime.now() - datetime.combine(anchor, datetime.min.time())
    return max(0.0, delta.total_seconds())

# ── Core KPI calculation ──────────────────────────────────────────────────────

def compute_daily_kpis(
    plant_id:    Optional[str]  = None,
    target_date: Optional[date] = None,
    date_from:   Optional[date] = None,
    date_to:     Optional[date] = None,
    period:      Optional[str]  = None,
) -> DailyKPIs:
    """
    Calculate KPIs with this priority:
      1. period  → resolves to date range from dataset latest
      2. date_from + date_to  → explicit range
      3. target_date  → single day
      4. nothing  → latest available day
    """
    df = load_data()
    pid_label = plant_id if (plant_id and plant_id != "all") else "all"
    latest = df["date"].max().date()

    # Priority 1: period overrides everything
    if period:
        date_from, date_to = resolve_period(period, latest)

    # ── Range mode ───────────────────────────────────────────────────────────
    if date_from and date_to:
        mask = (df["date"].dt.date >= date_from) & (df["date"].dt.date <= date_to)
        window_df = df[mask].copy()
        if pid_label != "all":
            window_df = window_df[window_df["plant_id"] == plant_id]

        if window_df.empty:
            # No data in range — return zero KPIs rather than silently falling back
            empty_kpi = KPIValue(name="n/a", label="No data", value=0.0, unit="", rag=RAGStatus.RED, formatted="—")
            return DailyKPIs(
                date=f"{date_from.isoformat()} → {date_to.isoformat()}",
                plant_id=pid_label,
                record_count=0,
                waste_throughput=KPIValue(name="waste_throughput", label="Avg Daily Throughput", value=0.0, unit="t/day", rag=RAGStatus.RED, formatted="0.0 t"),
                energy_output=KPIValue(name="energy_output", label="Avg Daily Energy", value=0.0, unit="MWh", rag=None, formatted="0.0 MWh"),
                efficiency=KPIValue(name="efficiency", label="Avg Efficiency", value=0.0, unit="%", rag=RAGStatus.RED, formatted="0.0%"),
                downtime_hours=KPIValue(name="downtime_hours", label="Avg Daily Downtime", value=0.0, unit="hrs", rag=RAGStatus.GREEN, formatted="0.0 hrs"),
                daily_profit=KPIValue(name="daily_profit", label="Avg Daily Profit", value=0.0, unit="EUR", rag=RAGStatus.RED, formatted="EUR 0"),
                cumulative_waste_ytd=KPIValue(name="cumulative_waste_ytd", label="YTD Waste", value=0.0, unit="t", rag=None, formatted="0.0 t"),
                data_latency=KPIValue(name="data_latency", label="Data Latency", value=0.0, unit="s", rag=None, formatted="0s"),
            )

        n_days      = max(1, window_df["date"].dt.date.nunique())
        ref_date    = date_to
        date_label  = (
            date_from.isoformat()
            if date_from == date_to
            else f"{date_from.isoformat()} → {date_to.isoformat()}"
        )

        throughput   = float(window_df["weight_tons"].sum()) / n_days
        energy       = float(window_df["energy_output_mwh"].sum()) / n_days
        efficiency   = float(window_df["efficiency_pct"].mean())
        daily_profit = float(window_df["profit_eur"].sum()) / n_days
        record_count = len(window_df)

        daily_status = window_df.groupby(["date", "plant_id"])["operational_status"].first()
        total_dt_hrs = sum(
            settings.downtime_hours_per_event   if s == "downtime"
            else (settings.maintenance_hours_per_event if s == "maintenance" else 0.0)
            for s in daily_status
        )
        downtime_hrs = total_dt_hrs / n_days

        ytd_df = df[(df["date"].dt.year == ref_date.year) & (df["date"].dt.date <= ref_date)]
        if pid_label != "all":
            ytd_df = ytd_df[ytd_df["plant_id"] == plant_id]
        ytd_waste = float(ytd_df["weight_tons"].sum())

        latency_s = _compute_data_latency_seconds()

        return DailyKPIs(
            date=date_label,
            plant_id=pid_label,
            record_count=record_count,
            waste_throughput=KPIValue(name="waste_throughput", label="Avg Daily Throughput",
                value=round(throughput, 1), unit="t/day", rag=_rag_throughput(throughput), formatted=_fmt_tons(throughput)),
            energy_output=KPIValue(name="energy_output", label="Avg Daily Energy",
                value=round(energy, 1), unit="MWh", rag=None, formatted=_fmt_mwh(energy)),
            efficiency=KPIValue(name="efficiency", label="Avg Efficiency",
                value=round(efficiency, 2), unit="%", rag=_rag_efficiency(efficiency), formatted=_fmt_pct(efficiency)),
            downtime_hours=KPIValue(name="downtime_hours", label="Avg Daily Downtime",
                value=round(downtime_hrs, 1), unit="hrs", rag=_rag_downtime(downtime_hrs), formatted=_fmt_hours(downtime_hrs)),
            daily_profit=KPIValue(name="daily_profit", label="Avg Daily Profit",
                value=round(daily_profit, 2), unit="EUR", rag=_rag_profit(daily_profit), formatted=_fmt_eur(daily_profit)),
            cumulative_waste_ytd=KPIValue(name="cumulative_waste_ytd", label="YTD Waste",
                value=round(ytd_waste, 1), unit="t", rag=None, formatted=_fmt_tons(ytd_waste)),
            data_latency=KPIValue(name="data_latency", label="Data Latency",
                value=round(latency_s, 0), unit="s", rag=None, formatted=_fmt_seconds(latency_s)),
        )

    # ── Single-date mode ─────────────────────────────────────────────────────
    if target_date is None:
        target_date = period_anchor(latest)   # anchor = min(dataset_latest, today)

    day_df = df[df["date"].dt.date == target_date].copy()
    if pid_label != "all":
        day_df = day_df[day_df["plant_id"] == plant_id]

    throughput   = float(day_df["weight_tons"].sum())
    energy       = float(day_df["energy_output_mwh"].sum())
    efficiency   = float(day_df["efficiency_pct"].mean()) if len(day_df) else 0.0
    daily_profit = float(day_df["profit_eur"].sum())
    record_count = len(day_df)

    plant_statuses = day_df.groupby("plant_id")["operational_status"].first()
    downtime_hrs   = 0.0
    for status in plant_statuses:
        if status == "downtime":      downtime_hrs += settings.downtime_hours_per_event
        elif status == "maintenance": downtime_hrs += settings.maintenance_hours_per_event

    ytd_df = df[(df["date"].dt.year == target_date.year) & (df["date"].dt.date <= target_date)]
    if pid_label != "all":
        ytd_df = ytd_df[ytd_df["plant_id"] == plant_id]
    ytd_waste = float(ytd_df["weight_tons"].sum())
    latency_s = _compute_data_latency_seconds()

    return DailyKPIs(
        date=target_date.isoformat(),
        plant_id=pid_label,
        record_count=record_count,
        waste_throughput=KPIValue(name="waste_throughput", label="Daily Throughput",
            value=round(throughput, 1), unit="t/day", rag=_rag_throughput(throughput), formatted=_fmt_tons(throughput)),
        energy_output=KPIValue(name="energy_output", label="Energy Output",
            value=round(energy, 1), unit="MWh", rag=None, formatted=_fmt_mwh(energy)),
        efficiency=KPIValue(name="efficiency", label="Efficiency",
            value=round(efficiency, 2), unit="%", rag=_rag_efficiency(efficiency), formatted=_fmt_pct(efficiency)),
        downtime_hours=KPIValue(name="downtime_hours", label="Downtime",
            value=round(downtime_hrs, 1), unit="hrs", rag=_rag_downtime(downtime_hrs), formatted=_fmt_hours(downtime_hrs)),
        daily_profit=KPIValue(name="daily_profit", label="Daily Profit",
            value=round(daily_profit, 2), unit="EUR", rag=_rag_profit(daily_profit), formatted=_fmt_eur(daily_profit)),
        cumulative_waste_ytd=KPIValue(name="cumulative_waste_ytd", label="YTD Waste",
            value=round(ytd_waste, 1), unit="t", rag=None, formatted=_fmt_tons(ytd_waste)),
        data_latency=KPIValue(name="data_latency", label="Data Latency",
            value=round(latency_s, 0), unit="s", rag=None, formatted=_fmt_seconds(latency_s)),
    )


def get_rag_for_value(kpi_name: str, value: float) -> RAGStatus:
    dispatch = {
        "waste_throughput": _rag_throughput,
        "efficiency":       _rag_efficiency,
        "downtime_hours":   _rag_downtime,
        "daily_profit":     _rag_profit,
    }
    fn = dispatch.get(kpi_name)
    return fn(value) if fn else RAGStatus.GREEN
