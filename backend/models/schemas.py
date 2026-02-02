from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PondCreate(BaseModel):
    name: str
    shape: str  # rectangular / circular
    area: float  # in sq meters
    depth: float  # in meters


class Pond(PondCreate):
    id: int
    created_at: datetime


class WaterReading(BaseModel):
    ph: Optional[float] = Field(None, description="pH value")
    do: Optional[float] = Field(None, description="Dissolved Oxygen (mg/L)")
    temperature: Optional[float] = Field(None, description="Temperature (C)")
    salinity: Optional[float] = Field(None, description="Salinity (ppt)")
    nh3: Optional[float] = Field(None, description="Un-ionized ammonia (mg/L)")
    timestamp: Optional[datetime] = None


class WaterStatus(BaseModel):
    status: str  # GOOD / WARNING / DANGER
    reasons: Optional[list[str]] = []


class DiseaseRisk(BaseModel):
    risk: str  # LOW / MEDIUM / HIGH
    factors: Optional[list[str]] = []


class FeedAdvice(BaseModel):
    action: str  # NORMAL / REDUCE / STOP
    reason: Optional[str] = None


class VisualState(BaseModel):
    color: str
    hint: str


class DigitalTwinResponse(BaseModel):
    pond_id: int
    overall_status: str
    water: WaterStatus
    disease: DiseaseRisk
    feed: FeedAdvice
    visual: VisualState
