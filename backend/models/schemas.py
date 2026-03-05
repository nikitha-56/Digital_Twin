from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, Union
from datetime import datetime


class PondCreate(BaseModel):
    # only keep the fields specified by requirements
    pond_name: Optional[str] = None
    water_body: Optional[str] = None
    water_type: Optional[str] = None
    pond_type: Optional[str] = None
    temperature: Optional[float] = None
    city: Optional[str] = None
    shrimp_type: Optional[str] = None
    shrimp_stage: Optional[str] = None
    shrimp_size: Optional[float] = None
    stocking_datetime: Optional[datetime] = None
    stocking_density: Optional[float] = None
    nitrate: Optional[float] = None
    turbidity: Optional[float] = None
    humidity: Optional[float] = None
    feed_type: Optional[str] = None
    soil_type: Optional[str] = None
    pond_ownership: Optional[str] = None
    pond_area: Optional[float] = None
    pond_area_unit: Optional[str] = None
    pond_depth: Optional[float] = None
    pond_depth_unit: Optional[str] = None
    pond_shape: Optional[str] = None
    pond_length: Optional[float] = None
    pond_width: Optional[float] = None
    pond_radius: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ph: Optional[float] = None
    oxygen: Optional[float] = None
    salinity: Optional[float] = None
    nh3: Optional[float] = None
    prawns_per_acre: Optional[float] = None
    avg_weight_g: Optional[float] = None
    seed_source: Optional[str] = None
    tds: Optional[float] = None
    orp: Optional[float] = None


from uuid import UUID


class Pond(PondCreate):
    id: UUID
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


# ---------------------------------------------------------------------------
# mock endpoints response models
# ---------------------------------------------------------------------------

class WaterReadingDetailed(BaseModel):
    ph: float
    do: float
    ammonia: float
    nitrate: float
    turbidity: float
    salinity: float
    temperature: float


class HourlyWaterForecast(BaseModel):
    hour_offset: int = Field(..., description="1 through 6 hours from now")
    ph: float
    do: float
    ammonia: float
    nitrate: float
    turbidity: float
    salinity: float
    temperature: float
    water_quality_score: float = Field(..., ge=0.0, le=1.0)


class WaterScoreResponse(BaseModel):
    pond_id: int
    timestamp: datetime
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_flag: bool
    current_readings: WaterReadingDetailed
    hourly_forecast: list[HourlyWaterForecast]


class DiseaseScoreResponse(BaseModel):
    pond_id: int
    timestamp: datetime
    confidence: float = Field(..., ge=0.0, le=1.0)
    shrimp_count: int
    behavioral_stress_index: float = Field(..., ge=0.0, le=1.0)
    anomalies_detected: int
    risk_level: str  # Low / Medium / High / Critical
    dominant_symptom: str
    disease_detected: bool
    disease_name: Optional[str] = None
    spread_risk: str  # Low / Medium / High


class LayerDistribution(BaseModel):
    bottom_pct: float
    mid_pct: float
    surface_pct: float


class FeedForecastDay(BaseModel):
    day: int = Field(..., ge=1, le=4)
    feed_kg: float
    expected_growth_g: float
    mortality_risk: float = Field(..., ge=0.0, le=1.0)


class FeedScoreResponse(BaseModel):
    pond_id: int
    timestamp: datetime
    confidence: float = Field(..., ge=0.0, le=1.0)
    optimal_feed_kg: float
    mortality_probability: float = Field(..., ge=0.0, le=1.0)
    molting_stage: bool
    molting_feed_reduction_pct: float = Field(..., ge=0.0, le=1.0)
    layer_distribution: LayerDistribution
    four_day_forecast: list[FeedForecastDay]



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


class EventResponse(BaseModel):
    event_id: str
    customer_id: str
    pond_id: Optional[str] = None
    timestamp: datetime
    day: Optional[str] = None
    parameter_name: str
    parameter_value: float
    parameter_text: Optional[str] = None
    unit: Optional[str] = None
    domain: str
    resolution: str
    source_type: str
    file_path: Optional[str] = None


class ParameterStatus(BaseModel):
    name: str
    value: float
    unit: str
    status: str  # safe | warning | danger


class FarmerSummary(BaseModel):
    water_trend: str  # deteriorating | stable | improving
    critical_parameters: list[ParameterStatus]
    shrimp_status: str
    adjusted_feed_today_kg: float
    feed_adjustment_reason: str
    mortality_trend: str  # rising | stable | falling
    immediate_action_required: bool
    top_action: str


class DigitalTwinEnhancedResponse(BaseModel):
    pond_id: int
    timestamp: datetime
    farmer_summary: FarmerSummary
    fusion: dict  # FusionResult as dict
    suggestions: list  # list[Suggestion]
    raw_scores: dict  # water, disease, feed as dicts


# What-If Scenario Models
class ParameterChange(BaseModel):
    parameter: str
    before: Union[float, str]  # float for DB values, "not set" for overrides
    after: Union[float, str]  # numeric or string values
    impact: str  # "negative" | "positive" | "neutral"


class WhatIfCurrentState(BaseModel):
    composite_health_score: float
    pond_status: str
    primary_concern: str
    cross_modal_flags: list[str]


class WhatIfDelta(BaseModel):
    health_score_change: float
    status_change: str  # "improved" | "unchanged" | "degraded"
    new_flags: list[str]
    resolved_flags: list[str]
    parameter_changes: list[ParameterChange]


class WhatIfHypothetical(BaseModel):
    farmer_summary: dict
    fusion: dict
    suggestions: list


class WhatIfResponse(BaseModel):
    pond_id: int
    scenario_name: str
    timestamp: datetime
    parameters_tested: dict  # only changed parameters with before/after
    hypothetical: WhatIfHypothetical
    current: WhatIfCurrentState
    delta: WhatIfDelta
    simulation_note: str
