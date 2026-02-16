from fastapi import APIRouter, HTTPException
from models.schemas import DigitalTwinResponse, WaterReading
from services import storage
from services.water_model import evaluate_water
from services.disease_model import assess_disease_risk
from services.feed_model import suggest_feed_action
from services.twin_engine import combine_models

router = APIRouter()


@router.get("/digital-twin/{pond_id}", response_model=DigitalTwinResponse, tags=["digital-twin"])
async def get_digital_twin(pond_id: int):
    pond = await storage.get_pond(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    reading = await storage.get_latest_water(pond_id)
    if reading is None:
        raise HTTPException(status_code=404, detail="No water data for pond")

    wr = WaterReading(ph=reading.ph, do=reading.do, temperature=reading.temperature, salinity=reading.salinity, nh3=reading.nh3, timestamp=reading.timestamp)

    water_status = evaluate_water(wr)
    disease = assess_disease_risk(wr)
    feed = suggest_feed_action(water_status, disease)

    twin = combine_models(pond_id, water_status, disease, feed)
    return twin
