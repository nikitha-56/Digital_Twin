"""Farmer-facing summary computation for pond status."""

from models.schemas import (
    WaterScoreResponse,
    DiseaseScoreResponse,
    FeedScoreResponse,
    ParameterStatus,
    FarmerSummary,
)
from services.fusion_engine import FusionResult


def _evaluate_parameter(name: str, value: float, unit: str) -> ParameterStatus:
    """Evaluate a water parameter against safe/warning/danger thresholds."""
    
    thresholds = {
        "ph": {"safe": (6.5, 8.5), "warning": (6.0, 6.5), "danger_low": 6.0, "danger_high": 9.0},
        "do": {"safe": 5, "warning_low": 4, "warning_high": 5},
        "ammonia": {"safe": 0.5, "warning_low": 0.5, "warning_high": 1.0},
        "nitrate": {"safe": 50, "warning_low": 50, "warning_high": 100},
        "turbidity": {"safe": 50, "warning_low": 50, "warning_high": 80},
        "salinity": {"safe": (10, 25), "warning": (5, 10), "danger_low": 5, "danger_high": 35},
        "temperature": {"safe": (26, 30), "warning": (24, 26), "danger_low": 24, "danger_high": 32},
    }
    
    status = "safe"
    
    if name == "ph":
        if not (6.5 <= value <= 8.5):
            if 6.0 <= value < 6.5 or 8.5 < value <= 9.0:
                status = "warning"
            else:
                status = "danger"
    elif name == "do":
        if value < 4:
            status = "danger"
        elif value < 5:
            status = "warning"
    elif name == "ammonia":
        if value > 1.0:
            status = "danger"
        elif value >= 0.5:
            status = "warning"
    elif name == "nitrate":
        if value > 100:
            status = "danger"
        elif value >= 50:
            status = "warning"
    elif name == "turbidity":
        if value > 80:
            status = "danger"
        elif value >= 50:
            status = "warning"
    elif name == "salinity":
        if not (10 <= value <= 25):
            if (5 <= value < 10) or (25 < value <= 35):
                status = "warning"
            else:
                status = "danger"
    elif name == "temperature":
        if not (26 <= value <= 30):
            if (24 <= value < 26) or (30 < value <= 32):
                status = "warning"
            else:
                status = "danger"
    
    return ParameterStatus(name=name, value=value, unit=unit, status=status)


def _compute_water_trend(water: WaterScoreResponse) -> str:
    """Compute water trend from hourly forecast."""
    if not water.hourly_forecast or len(water.hourly_forecast) < 4:
        return "stable"
    
    # First 2 hours avg and last 2 hours avg
    first_two = water.hourly_forecast[:2]
    last_two = water.hourly_forecast[-2:]
    
    first_avg = sum(h.water_quality_score for h in first_two) / len(first_two)
    last_avg = sum(h.water_quality_score for h in last_two) / len(last_two)
    
    if last_avg < first_avg - 0.05:
        return "deteriorating"
    elif last_avg > first_avg + 0.05:
        return "improving"
    else:
        return "stable"


def _compute_critical_parameters(water: WaterScoreResponse) -> list[ParameterStatus]:
    """Extract critical parameters from water readings."""
    params = []
    
    cr = water.current_readings
    if hasattr(cr, "ph") and cr.ph is not None:
        params.append(_evaluate_parameter("ph", cr.ph, "pH"))
    if hasattr(cr, "do") and cr.do is not None:
        params.append(_evaluate_parameter("do", cr.do, "mg/L"))
    if hasattr(cr, "ammonia") and cr.ammonia is not None:
        params.append(_evaluate_parameter("ammonia", cr.ammonia, "mg/L"))
    if hasattr(cr, "nitrate") and cr.nitrate is not None:
        params.append(_evaluate_parameter("nitrate", cr.nitrate, "mg/L"))
    if hasattr(cr, "turbidity") and cr.turbidity is not None:
        params.append(_evaluate_parameter("turbidity", cr.turbidity, "NTU"))
    if hasattr(cr, "salinity") and cr.salinity is not None:
        params.append(_evaluate_parameter("salinity", cr.salinity, "ppt"))
    if hasattr(cr, "temperature") and cr.temperature is not None:
        params.append(_evaluate_parameter("temperature", cr.temperature, "°C"))
    
    # Sort: danger first, then warning, then safe
    status_order = {"danger": 0, "warning": 1, "safe": 2}
    params.sort(key=lambda p: status_order.get(p.status, 3))
    
    return params


def _compute_shrimp_status(disease: DiseaseScoreResponse) -> str:
    """Build human-readable shrimp status."""
    parts = []
    
    # Base statement
    parts.append(f"Shrimp showing {disease.dominant_symptom}.")
    
    # Anomalies
    parts.append(f"{disease.anomalies_detected} behavioral anomalies detected.")
    
    # BSI context
    if disease.behavioral_stress_index > 0.7:
        parts.append("Stress level critical.")
    elif disease.behavioral_stress_index >= 0.4:
        parts.append("Stress level moderate.")
    else:
        parts.append("Stress level low.")
    
    return " ".join(parts)


def _compute_adjusted_feed(
    feed: FeedScoreResponse,
    disease: DiseaseScoreResponse,
    water: WaterScoreResponse,
) -> tuple[float, str]:
    """Compute adjusted feed amount and reason."""
    base = feed.optimal_feed_kg
    adjustments = []
    factor = 1.0
    
    # Molting reduction
    if feed.molting_stage:
        factor *= 1.0 - feed.molting_feed_reduction_pct
        adjustments.append(
            f"Molting stage reduction ({feed.molting_feed_reduction_pct*100:.0f}%)"
        )
    
    # Disease BSI reduction
    if disease.behavioral_stress_index > 0.7:
        factor *= 0.5
        adjustments.append(
            f"Critical stress (BSI {disease.behavioral_stress_index:.2f}): 50% reduction"
        )
    elif disease.behavioral_stress_index >= 0.4:
        factor *= 0.7
        adjustments.append(
            f"Moderate stress (BSI {disease.behavioral_stress_index:.2f}): 30% reduction"
        )
    
    # DO reduction
    do = getattr(water.current_readings, "do", None)
    if do is not None:
        if do < 4:
            factor *= 0.3
            adjustments.append(f"Critical hypoxia (DO {do:.2f}mg/L): 70% reduction")
        elif do < 5:
            factor *= 0.7
            adjustments.append(f"Low DO ({do:.2f}mg/L): 30% reduction")
    
    # Ammonia reduction
    ammonia = getattr(water.current_readings, "ammonia", None)
    if ammonia is not None and ammonia > 1.0:
        factor *= 0.6
        adjustments.append(f"High ammonia ({ammonia:.2f}mg/L): 40% reduction")
    
    adjusted = round(base * factor, 2)
    
    if adjustments:
        reason = "Reduced due to: " + "; ".join(adjustments) + "."
    else:
        reason = "No adjustments. Conditions optimal for full feeding."
    
    return adjusted, reason


def _compute_mortality_trend(feed: FeedScoreResponse) -> str:
    """Compute mortality trend from 4-day forecast."""
    if not feed.four_day_forecast or len(feed.four_day_forecast) < 2:
        return "stable"
    
    first = feed.four_day_forecast[0].mortality_risk
    last = feed.four_day_forecast[-1].mortality_risk
    
    if last > first + 0.15:
        return "rising"
    elif last < first - 0.15:
        return "falling"
    else:
        return "stable"


def _compute_immediate_action(
    fusion: FusionResult,
    critical_params: list[ParameterStatus],
    disease: DiseaseScoreResponse,
    adjusted_feed: float,
    feed: FeedScoreResponse,
) -> bool:
    """Check if immediate action is required."""
    if fusion.pond_status in ("Critical", "Warning"):
        return True
    if any(p.status == "danger" for p in critical_params):
        return True
    if disease.disease_detected:
        return True
    if adjusted_feed < feed.optimal_feed_kg * 0.5:
        return True
    return False


def _compute_top_action(
    disease: DiseaseScoreResponse,
    water: WaterScoreResponse,
    water_trend: str,
    mortality_trend: str,
    fusion: FusionResult,
) -> str:
    """Determine the single most important action."""
    
    if disease.disease_detected:
        return (
            f"Isolate pond and consult veterinarian immediately. "
            f"Disease: {disease.disease_name}"
        )
    
    do = getattr(water.current_readings, "do", None)
    if do is not None and do < 4:
        return f"Activate emergency aeration NOW. DO at {do:.2f}mg/L is life-threatening for vannamei."
    
    ammonia = getattr(water.current_readings, "ammonia", None)
    if ammonia is not None and ammonia > 1.0:
        return f"Perform 30% water exchange immediately. Ammonia at {ammonia:.2f}mg/L is toxic."
    
    if disease.behavioral_stress_index > 0.7:
        return "Halt all pond activity and feeding. Shrimp under critical stress."
    
    if water_trend == "deteriorating" and fusion.pond_status == "Warning":
        return "Monitor closely and prepare water exchange within 2 hours."
    
    if mortality_trend == "rising":
        return "Review stressors — mortality risk increasing over next 4 days."
    
    return "Conditions stable. Maintain regular monitoring schedule."


def compute_farmer_summary(
    water: WaterScoreResponse,
    disease: DiseaseScoreResponse,
    feed: FeedScoreResponse,
    fusion: FusionResult,
) -> FarmerSummary:
    """Compute a farmer-friendly summary of pond status and recommendations."""
    
    water_trend = _compute_water_trend(water)
    critical_params = _compute_critical_parameters(water)
    shrimp_status = _compute_shrimp_status(disease)
    adjusted_feed, feed_reason = _compute_adjusted_feed(feed, disease, water)
    mortality_trend = _compute_mortality_trend(feed)
    immediate_action = _compute_immediate_action(
        fusion, critical_params, disease, adjusted_feed, feed
    )
    top_action = _compute_top_action(
        disease, water, water_trend, mortality_trend, fusion
    )
    
    return FarmerSummary(
        water_trend=water_trend,
        critical_parameters=critical_params,
        shrimp_status=shrimp_status,
        adjusted_feed_today_kg=adjusted_feed,
        feed_adjustment_reason=feed_reason,
        mortality_trend=mortality_trend,
        immediate_action_required=immediate_action,
        top_action=top_action,
    )
