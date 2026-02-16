from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import PondCreate, Pond
from services import storage

router = APIRouter()


@router.post("/ponds", response_model=Pond, tags=["ponds"]) 
async def create_pond(pond: PondCreate):
    p = await storage.create_pond(pond.name, pond.shape, pond.area, pond.depth)
    # map DB pond to return schema
    return Pond(id=p.id, name=p.name, shape=p.shape, area=p.area, depth=p.depth, created_at=p.created_at)


@router.get("/ponds", response_model=List[Pond], tags=["ponds"])
async def get_all_ponds():
    ps = await storage.list_ponds()
    return [Pond(id=p.id, name=p.name, shape=p.shape, area=p.area, depth=p.depth, created_at=p.created_at) for p in ps]


@router.get("/ponds/{pond_id}", response_model=Pond, tags=["ponds"])
async def get_pond(pond_id: int):
    p = await storage.get_pond(pond_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Pond not found")
    return Pond(id=p.id, name=p.name, shape=p.shape, area=p.area, depth=p.depth, created_at=p.created_at)
