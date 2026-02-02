from fastapi import APIRouter, HTTPException

from models.schemas import DigitalTwinResponse
from services.storage import get_pond, get_water_reading
from services.water_model import evaluate_water
from services.disease_model import assess_disease_risk
from services.feed_model import suggest_feed_action
from services.twin_engine import combine_models

router = APIRouter()


@router.get("/digital-twin/{pond_id}", response_model=DigitalTwinResponse, tags=["digital-twin"])
def get_digital_twin(pond_id: int):
	pond = get_pond(pond_id)
	if pond is None:
		raise HTTPException(status_code=404, detail="Pond not found")

	reading = get_water_reading(pond_id)
	if reading is None:
		raise HTTPException(status_code=404, detail="No water data for pond")

	water_status = evaluate_water(reading)
	disease = assess_disease_risk(water_status)
	feed = suggest_feed_action(water_status, disease)

	twin = combine_models(pond_id, water_status, disease, feed)
	return twin
