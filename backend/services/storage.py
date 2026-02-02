from typing import Dict, List
from datetime import datetime

from models.schemas import Pond, WaterReading

# In-memory stores
pond_db: List[Pond] = []
water_store: Dict[int, WaterReading] = {}

def get_pond(pond_id: int):
    for p in pond_db:
        if p.id == pond_id:
            return p
    return None

def set_water_reading(pond_id: int, reading: WaterReading):
    reading.timestamp = reading.timestamp or datetime.utcnow()
    water_store[pond_id] = reading

def get_water_reading(pond_id: int):
    return water_store.get(pond_id)
