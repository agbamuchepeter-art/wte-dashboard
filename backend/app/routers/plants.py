from fastapi import APIRouter, HTTPException
from typing import List

from app.models import PlantInfo
from app.services.data_service import get_plants, load_data, PLANT_NAMES

router = APIRouter(prefix="/plants", tags=["plants"])


@router.get("", response_model=List[PlantInfo])
def list_plants():
    """Return all plants with their current status and efficiency."""
    return get_plants()


@router.get("/{plant_id}", response_model=PlantInfo)
def get_plant(plant_id: str):
    """Return a single plant by ID."""
    plants = get_plants()
    for p in plants:
        if p.plant_id == plant_id:
            return p
    raise HTTPException(status_code=404, detail=f"Plant '{plant_id}' not found.")


@router.get("/{plant_id}/waste-breakdown")
def get_waste_breakdown(plant_id: str):
    """Return waste-type volume breakdown for a plant."""
    df = load_data()
    if plant_id not in df["plant_id"].unique():
        raise HTTPException(status_code=404, detail=f"Plant '{plant_id}' not found.")

    sub = df[df["plant_id"] == plant_id]
    breakdown = (
        sub.groupby("waste_type")
        .agg(
            total_weight=("weight_tons", "sum"),
            total_energy=("energy_output_mwh", "sum"),
            avg_efficiency=("efficiency_pct", "mean"),
            total_cost=("total_cost_eur", "sum"),
        )
        .reset_index()
        .round(2)
    )
    return breakdown.to_dict(orient="records")
