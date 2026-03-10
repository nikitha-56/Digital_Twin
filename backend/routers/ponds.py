from typing import Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import text

from db.database import AsyncSessionLocal
from services import pond_service
from routers import mock as mock_router

router = APIRouter()

# ── We define inline schemas here to match the REAL DB columns ──────────────

from pydantic import BaseModel

class PondCreate(BaseModel):
    pond_name:        Optional[str]   = None
    water_body:       Optional[str]   = None
    water_type:       Optional[str]   = None
    pond_type:        Optional[str]   = None
    temperature:      Optional[float] = None
    city:             Optional[str]   = None
    shrimp_type:      Optional[str]   = None
    shrimp_stage:     Optional[str]   = None
    shrimp_size:      Optional[float] = None
    stocking_density: Optional[float] = None
    nitrate:          Optional[float] = None
    turbidity:        Optional[float] = None
    humidity:         Optional[float] = None
    feed_type:        Optional[str]   = None
    soil_type:        Optional[str]   = None
    pond_ownership:   Optional[str]   = None
    pond_area:        Optional[float] = None
    pond_area_unit:   Optional[str]   = None
    pond_depth:       Optional[float] = None
    pond_depth_unit:  Optional[str]   = None
    pond_shape:       Optional[str]   = None
    pond_length:      Optional[float] = None
    pond_width:       Optional[float] = None
    pond_radius:      Optional[float] = None
    latitude:         Optional[float] = None
    longitude:        Optional[float] = None
    ph:               Optional[float] = None
    oxygen:           Optional[float] = None
    salinity:         Optional[float] = None
    nh3:              Optional[float] = None
    prawns_per_acre:  Optional[float] = None
    avg_weight_g:     Optional[float] = None
    seed_source:      Optional[str]   = None
    tds:              Optional[float] = None
    orp:              Optional[float] = None

class PondUpdate(PondCreate):
    pass  # same fields, all optional

class Pond(PondCreate):
    id:         str
    created_at: datetime

    class Config:
        from_attributes = True


# ── POST /pond/add ────────────────────────────────────────────────────────────
@router.post("/pond/add", response_model=Pond, tags=["ponds"])
async def add_pond(pond: PondCreate):
    new_id     = str(uuid4())
    created_at = datetime.utcnow()
    data       = {k: v for k, v in pond.dict().items() if v is not None}
    data.update({"id": new_id, "created_at": created_at})

    cols         = ", ".join(data.keys())
    placeholders = ", ".join([f":{k}" for k in data.keys()])
    insert_sql   = f"INSERT INTO ponds ({cols}) VALUES ({placeholders})"

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text(insert_sql), data)
            await session.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}")

    # Return full row
    full = {**pond.dict(), "id": new_id, "created_at": created_at}
    return Pond(**full)


# ── GET /pond/all ─────────────────────────────────────────────────────────────
@router.get("/pond/all", response_model=list[Pond], tags=["ponds"])
async def get_all_ponds():
    try:
        async with AsyncSessionLocal() as session:
            result  = await session.execute(text("SELECT * FROM ponds ORDER BY created_at"))
            rows    = result.fetchall()
            columns = list(result.keys())
            return [Pond(**dict(zip(columns, r))) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}")


# ── GET /pond/{pond_id} ───────────────────────────────────────────────────────
@router.get("/pond/{pond_id}", response_model=Pond, tags=["ponds"])
async def get_pond(pond_id: str = Path(...)):
    pond = await pond_service.get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")
    return Pond(**pond)


# ── PUT /pond/{pond_id} ───────────────────────────────────────────────────────
@router.put("/pond/{pond_id}", response_model=Pond, tags=["ponds"])
async def update_pond(pond_id: str, pond: PondUpdate):
    # Check exists
    existing = await pond_service.get_pond_by_id(pond_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    # Only update non-None fields
    data = {k: v for k, v in pond.dict().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join([f"{k} = :{k}" for k in data.keys()])
    data["pond_id"] = pond_id
    update_sql = f"UPDATE ponds SET {set_clause} WHERE id = :pond_id"

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text(update_sql), data)
            await session.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}")

    updated = await pond_service.get_pond_by_id(pond_id)
    return Pond(**updated)


# ── DELETE /pond/{pond_id} ────────────────────────────────────────────────────
@router.delete("/pond/{pond_id}", tags=["ponds"])
async def delete_pond(pond_id: str = Path(...)):
    existing = await pond_service.get_pond_by_id(pond_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM ponds WHERE id = :id"), {"id": pond_id})
            await session.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}")

    return {"message": f"Pond {pond_id} deleted successfully"}


# ── GET /pond/{pond_id}/scores ────────────────────────────────────────────────
@router.get("/pond/{pond_id}/scores", tags=["ponds"])
async def pond_scores(pond_id: str = Path(...)):
    pond = await pond_service.get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id FROM ponds ORDER BY created_at"))
        rows   = [r[0] for r in result.fetchall()]
    try:
        idx = rows.index(pond_id) + 1
    except ValueError:
        raise HTTPException(status_code=500, detail="Unable to compute pond index")

    water   = await mock_router.mock_water_score(idx)
    disease = await mock_router.mock_disease_score(idx)
    feed    = await mock_router.mock_feed_score(idx)

    return {
        "water_score_response":   water,
        "disease_score_response": disease,
        "feed_score_response":    feed,
    }