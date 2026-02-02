from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PondCreate(BaseModel):
    name: str
    shape: str              # rectangular / circular
    area: float             # in sq meters
    depth: float            # in meters


class Pond(PondCreate):
    id: int
    created_at: datetime
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PondCreate(BaseModel):
    name: str
    shape: str              # rectangular / circular
    area: float             # in sq meters
    depth: float            # in meters


class Pond(PondCreate):
    id: int
    created_at: datetime
