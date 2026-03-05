from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from models.schemas import WaterScoreResponse, DiseaseScoreResponse, FeedScoreResponse


class FusionResult(BaseModel):
    pond_id: int
    timestamp: datetime
    composite_health_score: float = Field(..., ge=0.0, le=1.0)
    pond_status: str  # Critical|Warning|Moderate|Good
    primary_concern: str  # water|disease|feed|none
    confidence: float = Field(..., ge=0.0, le=1.0)
    cross_modal_flags: List[str] = []
    component_scores: dict


# Status severity order: Good < Moderate < Warning < Critical
STATUS_ORDER = {"Good": 0, "Moderate": 1, "Warning": 2, "Critical": 3}


def _min_status(status_a: str, status_b: str) -> str:
    """Return the worse (higher severity) of two statuses."""
    return status_a if STATUS_ORDER.get(status_a, 0) > STATUS_ORDER.get(status_b, 0) else status_b


def _score_to_status(score: float) -> str:
    """Map composite health score to pond status using new thresholds."""
    if score >= 0.75:
        return "Good"
    if score >= 0.50:
        return "Moderate"
    if score >= 0.30:
        return "Warning"
    return "Critical"


def _calculate_water_risk(water: WaterScoreResponse) -> float:
    """Calculate water risk based on biologically accurate Pacific White Shrimp norms.
    
    Litopenaeus vannamei thresholds:
    - DO: critical < 2, poor 2-4, moderate 4-5, good > 5 mg/L
    - Ammonia (un-ionized NH3): toxic > 0.1 mg/L
    - pH: optimal 7.5-8.5
    - Temperature: optimal 26-30°C
    - Salinity: optimal 10-25 ppt
    - Turbidity: good < 50 NTU
    """
    cr = water.current_readings

    # DO risk (most critical)
    do = getattr(cr, "do", None)
    if do is None:
        do_risk = 0.5  # unknown, assume moderate
    elif do < 2:
        do_risk = 1.0
    elif do < 4:
        do_risk = 0.8
    elif do < 5:
        do_risk = 0.4
    else:
        do_risk = 0.0

    # Ammonia risk (un-ionized NH3)
    nh3 = getattr(cr, "ammonia", None)
    if nh3 is None:
        ammonia_risk = 0.3  # unknown, assume some risk
    elif nh3 > 1.0:
        ammonia_risk = 1.0
    elif nh3 > 0.5:
        ammonia_risk = 0.7
    elif nh3 > 0.1:
        ammonia_risk = 0.3
    else:
        ammonia_risk = 0.0

    # pH risk (optimal 7.5-8.5)
    ph = getattr(cr, "ph", None)
    if ph is None:
        ph_risk = 0.2
    elif ph < 6.5 or ph > 9.5:
        ph_risk = 1.0
    elif ph < 7.0 or ph > 9.0:
        ph_risk = 0.5
    elif ph < 7.5 or ph > 8.5:
        ph_risk = 0.2
    else:
        ph_risk = 0.0

    # Temperature risk (optimal 26-30°C)
    temp = getattr(cr, "temperature", None)
    if temp is None:
        temp_risk = 0.3
    elif temp < 20 or temp > 35:
        temp_risk = 1.0
    elif temp < 23 or temp > 33:
        temp_risk = 0.7
    elif temp < 26 or temp > 30:
        temp_risk = 0.3
    else:
        temp_risk = 0.0

    # Salinity risk (optimal 10-25 ppt, tolerates 0.5-45)
    sal = getattr(cr, "salinity", None)
    if sal is None:
        sal_risk = 0.2
    elif sal < 0.5 or sal > 45:
        sal_risk = 1.0
    elif sal < 5 or sal > 35:
        sal_risk = 0.6
    elif sal < 10 or sal > 25:
        sal_risk = 0.2
    else:
        sal_risk = 0.0

    # Turbidity risk
    turb = getattr(cr, "turbidity", None)
    if turb is None:
        turb_risk = 0.1
    elif turb > 150:
        turb_risk = 1.0
    elif turb > 80:
        turb_risk = 0.6
    elif turb > 50:
        turb_risk = 0.3
    else:
        turb_risk = 0.0

    # Weighted water_risk (DO and ammonia most critical)
    water_risk = (
        do_risk * 0.30
        + ammonia_risk * 0.25
        + temp_risk * 0.20
        + ph_risk * 0.10
        + sal_risk * 0.10
        + turb_risk * 0.05
    )
    return min(1.0, max(0.0, water_risk))


def _calculate_disease_risk(disease: DiseaseScoreResponse) -> float:
    """Calculate disease risk using behavioral and spread metrics for vannamei.
    
    BSI > 0.6: shrimp show feeding cessation
    BSI > 0.8: severe stress
    """
    bsi = disease.behavioral_stress_index

    # BSI contribution
    if bsi > 0.8:
        bsi_risk = 1.0
    elif bsi > 0.6:
        bsi_risk = 0.7
    elif bsi > 0.4:
        bsi_risk = 0.4
    else:
        bsi_risk = 0.1

    # Risk level contribution
    risk_level_map = {"Low": 0.1, "Medium": 0.35, "High": 0.7, "Critical": 1.0}
    level_risk = risk_level_map.get(disease.risk_level, 0.2)

    # Disease confirmed
    disease_confirmed_risk = 0.8 if disease.disease_detected else 0.0

    # Spread risk
    spread_map = {"Low": 0.0, "Medium": 0.3, "High": 0.7}
    spread_risk_val = spread_map.get(disease.spread_risk, 0.0)

    disease_risk = (
        bsi_risk * 0.30
        + level_risk * 0.30
        + disease_confirmed_risk * 0.25
        + spread_risk_val * 0.15
    )
    return min(1.0, max(0.0, disease_risk))


def _calculate_feed_risk(feed: FeedScoreResponse) -> float:
    """Calculate feed risk based on mortality and forecast trends."""
    mort = feed.mortality_probability

    # Mortality probability (direct risk)
    if mort > 0.8:
        mort_risk = 1.0
    elif mort > 0.6:
        mort_risk = 0.7
    elif mort > 0.4:
        mort_risk = 0.4
    else:
        mort_risk = 0.1

    # 4-day forecast trend
    day_risks = [d.mortality_risk for d in feed.four_day_forecast] if feed.four_day_forecast else [0.0]
    avg_forecast_risk = sum(day_risks) / len(day_risks) if day_risks else 0.0
    peak_forecast_risk = max(day_risks) if day_risks else 0.0

    feed_risk = (
        mort_risk * 0.40
        + avg_forecast_risk * 0.35
        + peak_forecast_risk * 0.25
    )
    return min(1.0, max(0.0, feed_risk))


def compute_fusion(
    water: WaterScoreResponse,
    disease: DiseaseScoreResponse,
    feed: FeedScoreResponse,
) -> FusionResult:
    """Combine three scored responses into a multimodal fusion result.

    The logic follows biologically accurate Pacific White Shrimp (Litopenaeus vannamei)
    aquaculture norms with weighted risk calculations and override conditions.
    """
    # 1. Calculate risk metrics using biologically accurate formulas
    water_risk = _calculate_water_risk(water)
    disease_risk = _calculate_disease_risk(disease)
    feed_risk = _calculate_feed_risk(feed)

    # 2. Confidence-weighted composite risk
    composite_risk = (
        water_risk * water.confidence * 0.30
        + disease_risk * disease.confidence * 0.45
        + feed_risk * feed.confidence * 0.25
    )

    # 2.5. Count danger parameters and apply penalty
    # Danger thresholds: ph outside 6.0-9.0, do<4, ammonia>1.0, temp outside 24-32, turbidity>80
    cr = water.current_readings
    danger_count = 0
    ph = getattr(cr, "ph", None)
    if ph is not None and (ph < 6.0 or ph > 9.0):
        danger_count += 1
        composite_risk += 0.15
    do = getattr(cr, "do", None)
    if do is not None and do < 4:
        danger_count += 1
        composite_risk += 0.15
    ammonia = getattr(cr, "ammonia", None)
    if ammonia is not None and ammonia > 1.0:
        danger_count += 1
        composite_risk += 0.15
    temp = getattr(cr, "temperature", None)
    if temp is not None and (temp < 24 or temp > 32):
        danger_count += 1
        composite_risk += 0.15
    turbidity = getattr(cr, "turbidity", None)
    if turbidity is not None and turbidity > 80:
        danger_count += 1
        composite_risk += 0.15

    # Clamp composite_risk before converting to health score
    composite_risk = min(1.0, max(0.0, composite_risk))
    composite_health_score = max(0.0, min(1.0, 1.0 - composite_risk))

    # Base status from composite score (before overrides)
    pond_status = _score_to_status(composite_health_score)

    # If danger_count >= 2, minimum status is Warning
    if danger_count >= 2:
        pond_status = _min_status(pond_status, "Warning")

    # 3. Apply override conditions that can cap composite_health_score
    # and force status changes

    if disease.disease_detected and disease.spread_risk == "High":
        composite_health_score = min(composite_health_score, 0.25)
        pond_status = "Critical"

    if disease.risk_level == "Critical":
        composite_health_score = min(composite_health_score, 0.30)
        pond_status = "Critical"

    if feed.mortality_probability > 0.75:
        composite_health_score = min(composite_health_score, 0.50)
        pond_status = _min_status(pond_status, "Warning")

    # Check for forecast mortality spike flag (computed below)
    # but apply cap early for consistent logic
    has_forecast_spike = feed.four_day_forecast and any(
        d.mortality_risk > 0.7 for d in feed.four_day_forecast
    )
    if has_forecast_spike:
        composite_health_score = min(composite_health_score, 0.55)
        pond_status = _min_status(pond_status, "Warning")

    if water.risk_flag and disease.behavioral_stress_index > 0.7:
        composite_health_score = min(composite_health_score, 0.45)

    # Re-apply status thresholds after all caps
    comp_score = composite_health_score
    if comp_score >= 0.75:
        pond_status = _min_status(pond_status, "Good")
    elif comp_score >= 0.50:
        pond_status = _min_status(pond_status, "Moderate")
    elif comp_score >= 0.30:
        pond_status = _min_status(pond_status, "Warning")
    else:
        pond_status = "Critical"

    # 4. Cross-modal compound risks (flags)
    flags: List[str] = []
    cr = water.current_readings

    # AMMONIA_DISEASE_COMPOUND
    ammonia_val = getattr(cr, "ammonia", 0)
    if ammonia_val > 0.5 and disease.behavioral_stress_index > 0.6:
        flags.append("AMMONIA_DISEASE_COMPOUND")

    # LOW_DO_FEED_WASTE
    do_val = getattr(cr, "do", 0)
    if do_val < 4.0 and feed.optimal_feed_kg > 0:
        flags.append("LOW_DO_FEED_WASTE")

    # MOLTING_DISEASE_CRITICAL
    if feed.molting_stage and disease.risk_level in ("High", "Critical"):
        flags.append("MOLTING_DISEASE_CRITICAL")

    # FORECAST_MORTALITY_SPIKE
    if has_forecast_spike:
        flags.append("FORECAST_MORTALITY_SPIKE")

    # TEMP_STRESS_COMPOUND
    temp_val = getattr(cr, "temperature", None)
    if temp_val is not None and (temp_val < 26 or temp_val > 30) and disease.behavioral_stress_index > 0.5:
        flags.append("TEMP_STRESS_COMPOUND")

    # OVERFEEDING_AMMONIA_RISK: check ammonia trend in hourly forecast
    if feed.optimal_feed_kg > 100 and len(water.hourly_forecast) >= 2:
        first_ammonia = water.hourly_forecast[0].ammonia
        last_ammonia = water.hourly_forecast[-1].ammonia
        if last_ammonia > first_ammonia + 0.1:
            flags.append("OVERFEEDING_AMMONIA_RISK")

    # HIGH_DISEASE_RISK_NO_DETECTION (NEW)
    if disease.risk_level in ("High", "Critical") and not disease.disease_detected:
        flags.append("HIGH_DISEASE_RISK_NO_DETECTION")

    # SALINITY_STRESS (NEW)
    sal_val = getattr(cr, "salinity", None)
    if sal_val is not None and (sal_val < 5 or sal_val > 35):
        flags.append("SALINITY_STRESS")

    # 5. Identify primary concern
    concerns = {"water": water_risk, "disease": disease_risk, "feed": feed_risk}
    primary_concern = max(concerns, key=concerns.get) if concerns else "none"

    # Overall confidence is weighted combination
    overall_confidence = round(
        water.confidence * 0.30
        + disease.confidence * 0.45
        + feed.confidence * 0.25,
        4,
    )

    return FusionResult(
        pond_id=water.pond_id,
        timestamp=datetime.utcnow(),
        composite_health_score=composite_health_score,
        pond_status=pond_status,
        primary_concern=primary_concern,
        confidence=max(0.0, min(1.0, overall_confidence)),
        cross_modal_flags=flags,
        component_scores={
            "water": water_risk,
            "disease_risk": disease_risk,
            "feed_efficiency": max(0.0, min(1.0, 1.0 - feed_risk)),
        },
    )
