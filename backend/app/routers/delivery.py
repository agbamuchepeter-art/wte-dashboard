from fastapi import APIRouter
from app.models import DeliveryTracking
from app.services.delivery_service import compute_delivery

router = APIRouter(prefix="/delivery", tags=["delivery"])


@router.get("", response_model=DeliveryTracking)
def get_delivery():
    return compute_delivery()
