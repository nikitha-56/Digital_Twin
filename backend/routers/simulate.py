from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.simulation_engine import run_simulation
from services import storage

router = APIRouter()


class SimulationRequest(BaseModel):
    adjustments: dict
    hours: int = 24


@router.post('/simulate', tags=['simulation'])
async def simulate(pond_id: int, req: SimulationRequest):
    pond = await storage.get_pond(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail='Pond not found')
    res = await run_simulation(pond_id, req.adjustments, hours=req.hours)
    return res
