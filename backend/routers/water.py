from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime

from models.schemas import WaterReading
from services.storage import get_pond, set_water_reading, get_water_reading
from services.water_model import evaluate_water

router = APIRouter()


@router.post("/ponds/{pond_id}/water", tags=["water"], response_model=WaterReading)
def submit_water_reading(pond_id: int, reading: WaterReading):
	pond = get_pond(pond_id)
	if pond is None:
		raise HTTPException(status_code=404, detail="Pond not found")

	# ensure timestamp
	reading.timestamp = reading.timestamp or datetime.utcnow()
	set_water_reading(pond_id, reading)
	return reading


@router.get("/ponds/{pond_id}/water", tags=["water"], response_model=Optional[WaterReading])
def get_latest_water(pond_id: int):
	pond = get_pond(pond_id)
	if pond is None:
		raise HTTPException(status_code=404, detail="Pond not found")

	reading = get_water_reading(pond_id)
	if reading is None:
		raise HTTPException(status_code=404, detail="No readings for pond")

	return reading
