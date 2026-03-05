from typing import Optional, Union
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import text

from models.schemas import PondCreate, Pond
from db.database import AsyncSessionLocal
from services import pond_service
from routers import mock as mock_router

router = APIRouter()


@router.post("/pond/add", response_model=Pond, tags=["ponds"])
async def add_pond(pond: PondCreate):
    """Create a new pond record in the local database."""
    new_id = str(uuid4())
    created_at = datetime.utcnow()
    data = pond.dict()
    data.update({"id": new_id, "created_at": created_at})

    # build column list and parameters
    cols = ", ".join(data.keys())
    placeholders = ", ".join([f":{k}" for k in data.keys()])
    insert_sql = f"INSERT INTO ponds ({cols}) VALUES ({placeholders})"

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text(insert_sql), data)
            await session.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}")

    return Pond(**data)


@router.get("/pond/all", response_model=list[Pond], tags=["ponds"])
async def get_all_ponds():
    """Return all pond records."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM ponds ORDER BY created_at"))
            rows = result.fetchall()
            columns = result.keys()
            return [Pond(**dict(zip(columns, r))) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}")


@router.get("/pond/{pond_id}", response_model=Pond, tags=["ponds"])
async def get_pond(pond_id: str = Path(..., description="UUID of the pond")):
    pond = await pond_service.get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")
    return Pond(**pond)


@router.get("/pond/{pond_id}/scores", tags=["ponds"])
async def pond_scores(pond_id: str = Path(..., description="UUID of the pond")):
    # verify pond exists
    pond = await pond_service.get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    # compute sequential index for mocks
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id FROM ponds ORDER BY created_at"))
        rows = [r[0] for r in result.fetchall()]
    try:
        idx = rows.index(pond_id) + 1
    except ValueError:
        raise HTTPException(status_code=500, detail="Unable to compute pond index")

    # call mock routers directly
    water = await mock_router.mock_water_score(idx)
    disease = await mock_router.mock_disease_score(idx)
    feed = await mock_router.mock_feed_score(idx)

    return {
        "water_score_response": water,
        "disease_score_response": disease,
        "feed_score_response": feed,
    }
