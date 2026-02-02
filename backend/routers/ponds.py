from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime

from models.schemas import PondCreate, Pond
from services.storage import pond_db

router = APIRouter()


@router.post("/ponds", response_model=Pond, tags=["ponds"]) 
def create_pond(pond: PondCreate):
    pond_id = len(pond_db) + 1

    new_pond = Pond(
        id=pond_id,
        name=pond.name,
        shape=pond.shape,
        area=pond.area,
        depth=pond.depth,
        created_at=datetime.utcnow()
    )

    pond_db.append(new_pond)
    return new_pond


@router.get("/ponds", response_model=List[Pond], tags=["ponds"])
def get_all_ponds():
    return pond_db


@router.get("/ponds/{pond_id}", response_model=Pond, tags=["ponds"])
def get_pond(pond_id: int):
    for pond in pond_db:
        if pond.id == pond_id:
            return pond

    raise HTTPException(status_code=404, detail="Pond not found")
