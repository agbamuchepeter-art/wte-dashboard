from fastapi import APIRouter
from app.models import IntegrationHealth
from app.services.integration_service import compute_integration_health

router = APIRouter(prefix="/integration", tags=["integration"])


@router.get("", response_model=IntegrationHealth)
def get_integration_health():
    return compute_integration_health()
