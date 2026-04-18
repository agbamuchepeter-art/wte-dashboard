"""
GreenGrid Urban Solutions — WTE Rotterdam Dashboard
FastAPI backend: REST API + enriched WebSocket live stream every 5 s.
"""
import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alerts, kpis, metrics, plants
from app.routers import compliance, community, integration, delivery, programme
from app.services.alert_engine import get_active_alerts
from app.services.data_service import get_live_readings, load_data
from app.services.integration_service import compute_integration_health
from app.services.kpi_engine import compute_daily_kpis
from app.services.programme_service import compute_executive_summary

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("GreenGrid WTE Rotterdam — loading dataset...")
    load_data()
    logger.info("Dataset ready. Server v%s is live.", settings.app_version)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "GreenGrid Urban Solutions — Production Technology Programme Dashboard. "
        "Real-time KPI monitoring, RAG alerting, EU IED compliance, "
        "community engagement, and integration health for WTE Rotterdam."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

API = "/api/v1"
app.include_router(plants.router,      prefix=API)
app.include_router(metrics.router,     prefix=API)
app.include_router(kpis.router,        prefix=API)
app.include_router(alerts.router,      prefix=API)
app.include_router(compliance.router,  prefix=API)
app.include_router(community.router,   prefix=API)
app.include_router(integration.router, prefix=API)
app.include_router(delivery.router,    prefix=API)
app.include_router(programme.router,   prefix=API)


@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "version": settings.app_version,
        "app": settings.app_name,
    }


# ── WebSocket manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info("WS connected. Total: %d", len(self.active))

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info("WS disconnected. Total: %d", len(self.active))

    async def broadcast(self, payload: str):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self.active:
                self.active.remove(ws)


manager = ConnectionManager()


@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            readings       = get_live_readings()
            kpis_snap      = compute_daily_kpis(plant_id="all")
            active_alerts  = get_active_alerts()
            critical_count = sum(1 for a in active_alerts if a.alert_level >= 3)
            integration    = compute_integration_health()
            exec_summary   = compute_executive_summary()

            payload = json.dumps({
                "live_readings":      [r.model_dump() for r in readings],
                "daily_kpis":         kpis_snap.model_dump(),
                "active_alerts":      [a.model_dump() for a in active_alerts[:20]],
                "alert_count":        len(active_alerts),
                "critical_count":     critical_count,
                "integration_health": integration.model_dump(),
                "executive_summary":  exec_summary.model_dump(),
            })
            await ws.send_text(payload)
            await asyncio.sleep(settings.live_refresh_seconds)

    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as exc:
        logger.warning("WS error: %s", exc)
        manager.disconnect(ws)
