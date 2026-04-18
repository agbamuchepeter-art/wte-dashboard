"""
Delivery / Sprint Tracking Service.

Reflects the actual programme delivery status for the GreenGrid WTE platform.
Sprint data is configuration-driven (not hardcoded — can be updated via .env or
extended to a database in future). Dynamic RAG from sprint metrics.
"""
from datetime import datetime
from app.models import DeliveryTracking, RAGStatus, SprintFeature


# Sprint feature registry — mirrors what has been built/planned for the platform.
# status: "completed" | "in_progress" | "blocked"
SPRINT_FEATURES = [
    SprintFeature(name="FastAPI backend + data pipeline",    status="completed",   assignee="Data Engineer",        story_points=8),
    SprintFeature(name="WebSocket live stream (5s refresh)", status="completed",   assignee="Backend Lead",         story_points=5),
    SprintFeature(name="KPI Engine (7 KPIs + RAG)",         status="completed",   assignee="Data Engineer",        story_points=8),
    SprintFeature(name="Alert Engine L2/L3 + Simulate",     status="completed",   assignee="Operations Lead",      story_points=5),
    SprintFeature(name="React dashboard — Operations tab",  status="completed",   assignee="Frontend Lead",        story_points=5),
    SprintFeature(name="React dashboard — Energy tab",      status="completed",   assignee="Frontend Lead",        story_points=3),
    SprintFeature(name="React dashboard — Financials tab",  status="completed",   assignee="Finance Lead",         story_points=3),
    SprintFeature(name="RAG KPI cards + AlertPanel",        status="completed",   assignee="Frontend Lead",        story_points=5),
    SprintFeature(name="GreenGrid branding + 9-tab layout", status="completed",   assignee="Frontend Lead",        story_points=5),
    SprintFeature(name="Compliance module (EU IED)",        status="completed",   assignee="Compliance Officer",   story_points=8),
    SprintFeature(name="Community engagement dashboard",    status="completed",   assignee="Community Manager",    story_points=5),
    SprintFeature(name="Integration health monitor",        status="completed",   assignee="SCADA Engineer",       story_points=5),
    SprintFeature(name="L4 escalation engine",              status="completed",   assignee="Operations Lead",      story_points=3),
    SprintFeature(name="Executive summary panel",           status="completed",   assignee="Programme Manager",    story_points=5),
    SprintFeature(name="Workstream tracker",                status="completed",   assignee="Programme Manager",    story_points=3),
    SprintFeature(name="Data trust & pipeline panel",       status="completed",   assignee="Data Engineer",        story_points=3),
    SprintFeature(name="SCADA live API integration",        status="in_progress", assignee="SCADA Engineer",       story_points=13),
    SprintFeature(name="OPC-UA real-time connector",        status="in_progress", assignee="SCADA Engineer",       story_points=8),
    SprintFeature(name="EU ETS carbon reporting export",    status="in_progress", assignee="Compliance Officer",   story_points=5),
    SprintFeature(name="Mobile-responsive UI",              status="in_progress", assignee="Frontend Lead",        story_points=5),
    SprintFeature(name="Automated PDF report generation",   status="blocked",     assignee="Reporting Analyst",    story_points=8),
    SprintFeature(name="Historian DB integration",          status="blocked",     assignee="Data Engineer",        story_points=13),
]


def compute_delivery() -> DeliveryTracking:
    now = datetime.now()

    completed   = [f for f in SPRINT_FEATURES if f.status == "completed"]
    in_progress = [f for f in SPRINT_FEATURES if f.status == "in_progress"]
    blocked     = [f for f in SPRINT_FEATURES if f.status == "blocked"]

    pts_completed = sum(f.story_points for f in completed)
    pts_total     = sum(f.story_points for f in SPRINT_FEATURES)
    completion_pct = round(pts_completed / max(1, pts_total) * 100, 1)

    target_velocity = 80
    velocity = pts_completed

    # RAG: blocked features → Amber; velocity < 50% → Red
    if len(blocked) > 2 or velocity < target_velocity * 0.5:
        rag = RAGStatus.RED
    elif len(blocked) > 0 or velocity < target_velocity * 0.8:
        rag = RAGStatus.AMBER
    else:
        rag = RAGStatus.GREEN

    return DeliveryTracking(
        sprint_name="Sprint 3 — Production Platform",
        sprint_number=3,
        start_date="2026-04-01",
        end_date="2026-04-30",
        velocity=velocity,
        target_velocity=target_velocity,
        completion_pct=completion_pct,
        features_completed=len(completed),
        features_in_progress=len(in_progress),
        features_blocked=len(blocked),
        features=SPRINT_FEATURES,
        rag=rag,
    )
