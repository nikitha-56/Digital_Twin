from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime

from models.schemas import WaterReading
from services import storage
from services.water_model import evaluate_water

router = APIRouter()


@router.post("/ponds/{pond_id}/water", tags=["water"], response_model=WaterReading)
async def submit_water_reading(pond_id: int, reading: WaterReading):
	pond = await storage.get_pond(pond_id)
	if pond is None:
		raise HTTPException(status_code=404, detail="Pond not found")

	reading.timestamp = reading.timestamp or datetime.utcnow()
	wr = await storage.save_water_reading(pond_id, reading.dict())
	return WaterReading(ph=wr.ph, do=wr.do, temperature=wr.temperature, salinity=wr.salinity, nh3=wr.nh3, timestamp=wr.timestamp)


@router.get("/ponds/{pond_id}/water", tags=["water"], response_model=Optional[WaterReading])
async def get_latest_water(pond_id: int):
	pond = await storage.get_pond(pond_id)
	if pond is None:
		raise HTTPException(status_code=404, detail="Pond not found")

	reading = await storage.get_latest_water(pond_id)
	if reading is None:
		raise HTTPException(status_code=404, detail="No readings for pond")

	return WaterReading(ph=reading.ph, do=reading.do, temperature=reading.temperature, salinity=reading.salinity, nh3=reading.nh3, timestamp=reading.timestamp)


@router.get("/ponds/{pond_id}/water/history", tags=["water"], response_model=List[WaterReading])
async def get_water_history(pond_id: int, limit: int = 100):
	pond = await storage.get_pond(pond_id)
	if pond is None:
		raise HTTPException(status_code=404, detail="Pond not found")
	rows = await storage.get_water_history(pond_id, limit=limit)
	return [WaterReading(ph=r.ph, do=r.do, temperature=r.temperature, salinity=r.salinity, nh3=r.nh3, timestamp=r.timestamp) for r in rows]
