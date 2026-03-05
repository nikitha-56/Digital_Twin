from __future__ import annotations

from typing import Optional
from pydantic import BaseModel
from models.schemas import (
    DigitalTwinResponse,
    WaterStatus,
    DiseaseRisk,
    FeedAdvice,
    VisualState,
    WaterScoreResponse,
    DiseaseScoreResponse,
    FeedScoreResponse,
)
from .fusion_engine import FusionResult


# mapping helpers

def _map_water_score(score: float) -> WaterStatus:
    if score >= 0.75:
        return WaterStatus(status="GOOD", reasons=[])
    if score >= 0.4:
        return WaterStatus(status="WARNING", reasons=["elevated risk detected"])
    return WaterStatus(status="DANGER", reasons=["poor water quality forecast"])


def _map_disease_score(risk: float) -> DiseaseRisk:
    if risk >= 0.66:
        level = "HIGH"
    elif risk >= 0.33:
        level = "MEDIUM"
    else:
        level = "LOW"
    # attach any cross-modal flags as factors
    return DiseaseRisk(risk=level, factors=[])


def _map_feed_efficiency(eff: float, primary_concern: str) -> FeedAdvice:
    # efficiency closer to 1 is good, low values suggest stopping feed
    if eff < 0.5:
        return FeedAdvice(action="STOP", reason="Very low feed efficiency")
    if eff < 0.75:
        return FeedAdvice(action="REDUCE", reason="Moderate feed inefficiency")
    # normal case
    reason = "" if primary_concern == "none" else f"Primary concern is {primary_concern}"
    return FeedAdvice(action="NORMAL", reason=reason)


def _visual_from_status(status: str) -> VisualState:
    color = "green"
    hint = "All systems nominal"
    if status == "Warning":
        color = "yellow"
        hint = "Attention recommended"
    elif status == "Critical":
        color = "red"
        hint = "Immediate action required"
    return VisualState(color=color, hint=hint)


# ---------------------------------------------------------------------------
# suggestion engine
# ---------------------------------------------------------------------------
from typing import List, Literal


class Suggestion(BaseModel):
    category: Literal["water", "disease", "feed", "compound"]
    urgency: Literal["immediate", "today", "this_week"]
    title: str
    description: str
    expected_impact: str
    triggered_by: List[str]


def generate_suggestions(
    water: WaterScoreResponse,
    disease: DiseaseScoreResponse,
    feed: FeedScoreResponse,
    fusion: FusionResult,
) -> List[Suggestion]:
    """Return a ranked list of actionable suggestions based on fused inputs.

    Each rule references actual values in the description, and urgency is set
    according to the specification.  The output is sorted: compound rules first,
    then by urgency (immediate>today>this_week), then by category
    (disease>water>feed).  At most 10 suggestions are returned.
    """
    suggs: List[Suggestion] = []

    # WATER RULES
    am = getattr(water.current_readings, "ammonia", None)
    if am is not None and am > 0.5:
        suggs.append(
            Suggestion(
                category="water",
                urgency="immediate",
                title="High ammonia detected",
                description=(
                    f"Ammonia at {am:.3f}mg/L exceeds safe threshold (0.5mg/L) for vannamei. "
                    "Perform 20-30% water exchange immediately. Check feed waste "
                    "accumulation at pond bottom."
                ),
                expected_impact="Lower ammonia, improved shrimp health",
                triggered_by=["ammonia"],
            )
        )

    do = getattr(water.current_readings, "do", None)
    if do is not None and do < 4:
        suggs.append(
            Suggestion(
                category="water",
                urgency="immediate",
                title="Critical dissolved oxygen",
                description=(
                    f"Dissolved oxygen at {do:.2f}mg/L is below critical threshold "
                    "for vannamei (4mg/L). Activate emergency aeration. Reduce feed "
                    "by 50% until DO recovers above 5mg/L."
                ),
                expected_impact="Prevent hypoxia-related mortality",
                triggered_by=["do"],
            )
        )

    # W3: ammonia trend (was checking if ALL consecutive pairs increasing, now checks if
    # any future hour > 0.5 while current < 0.5, indicating trending toward danger)
    if water.hourly_forecast and am is not None and am < 0.5:
        future_ammonia = [h.ammonia for h in water.hourly_forecast[3:]]
        max_future_ammonia = max(future_ammonia) if future_ammonia else 0
        if max_future_ammonia > 0.5:
            # find the hour of peak
            hour_of_peak = 3 + (future_ammonia.index(max_future_ammonia) if future_ammonia else 0)
            suggs.append(
                Suggestion(
                    category="water",
                    urgency="today",
                    title="Ammonia Rising in Forecast",
                    description=(
                        f"Ammonia forecast to reach {max_future_ammonia:.3f}mg/L within "
                        f"{hour_of_peak} hours. Currently at {am:.3f}mg/L (safe). "
                        "Pre-emptively reduce feeding by 30% and schedule water "
                        "exchange within 2 hours before levels become critical for vannamei."
                    ),
                    expected_impact="Prevent ammonia spike before it becomes toxic",
                    triggered_by=["hourly_forecast", "ammonia_trend"],
                )
            )

    # W6_NEW: Salinity warning
    sal = getattr(water.current_readings, "salinity", None)
    if sal is not None and (sal < 5 or sal > 35):
        if sal < 5 or sal > 40:
            urgency_sal = "immediate"
        else:
            urgency_sal = "today"
        suggs.append(
            Suggestion(
                category="water",
                urgency=urgency_sal,
                title="Salinity Outside Vannamei Tolerance",
                description=(
                    f"Salinity at {sal:.1f}ppt. Vannamei optimal range is 10-25ppt, "
                    "tolerance 0.5-45ppt. Values below 5ppt cause osmotic stress and "
                    "reduce immune response. Gradually adjust salinity using fresh/salt water exchange."
                ),
                expected_impact="Restore optimal osmotic balance",
                triggered_by=["salinity"],
            )
        )

    temp = getattr(water.current_readings, "temperature", None)
    if temp is not None and (temp < 26 or temp > 30):
        # compute adjustment percent loosely
        adj = 10
        suggs.append(
            Suggestion(
                category="water",
                urgency="today",
                title="Temperature outside optimal range",
                description=(
                    f"Temperature at {temp:.1f}°C is outside optimal range (26-30°C) "
                    "for vannamei. Metabolism affected. Adjust feed quantity by "
                    f"{adj}% accordingly."
                ),
                expected_impact="Stabilize metabolism, reduce stress",
                triggered_by=["temperature"],
            )
        )

    turb = getattr(water.current_readings, "turbidity", None)
    if turb is not None and turb > 80:
        suggs.append(
            Suggestion(
                category="water",
                urgency="today",
                title="High turbidity detected",
                description=(
                    f"High turbidity ({turb:.1f} NTU) risks gill damage in vannamei. "
                    "Check for algal bloom or sediment disturbance. Consider partial "
                    "water change."
                ),
                expected_impact="Reduce gill irritation and improve oxygen uptake",
                triggered_by=["turbidity"],
            )
        )

    # DISEASE RULES
    if disease.disease_detected:
        name = disease.disease_name or "unknown"
        suggs.append(
            Suggestion(
                category="disease",
                urgency="immediate",
                title="Disease detected",
                description=(
                    f"Disease detected: {name}. Dominant symptom: {disease.dominant_symptom}. "
                    "Isolate affected pond section immediately. Consult veterinarian "
                    "for treatment protocol."
                ),
                expected_impact="Contain spread and allow targeted treatment",
                triggered_by=["disease_detected"],
            )
        )

    if disease.behavioral_stress_index > 0.7:
        suggs.append(
            Suggestion(
                category="disease",
                urgency="immediate",
                title="Severe behavioral stress",
                description=(
                    f"Behavioral Stress Index at {disease.behavioral_stress_index:.2f} indicates "
                    f"severe stress. {disease.anomalies_detected} anomalies recorded. "
                    "Check water quality and reduce stocking activity. Stress at this "
                    "level precedes disease outbreak in vannamei within 24-48hrs."
                ),
                expected_impact="Reduce chance of imminent disease outbreak",
                triggered_by=["behavioral_stress_index"],
            )
        )

    if disease.spread_risk == "High" and disease.disease_detected:
        suggs.append(
            Suggestion(
                category="disease",
                urgency="immediate",
                title="High spread risk disease",
                description=(
                    "High disease spread risk detected. Stop all inter-pond water "
                    "transfers. Disinfect shared equipment. Monitor neighboring ponds "
                    "immediately."
                ),
                expected_impact="Limit cross-pond contamination",
                triggered_by=["spread_risk", "disease_detected"],
            )
        )

    # D4_FIX: High disease risk with no confirmed disease yet (early warning)
    if disease.risk_level in ("High", "Critical") and not disease.disease_detected:
        urgency_d4 = "immediate" if disease.risk_level == "Critical" else "today"
        suggs.append(
            Suggestion(
                category="disease",
                urgency=urgency_d4,
                title="High Disease Risk — No Confirmed Outbreak Yet",
                description=(
                    f"Risk level is {disease.risk_level} but no disease confirmed. "
                    "This is an early warning window. Increase monitoring to every 2 hours. "
                    "Check behavioral patterns, feeding activity, and water quality. "
                    "Early intervention prevents outbreak in vannamei."
                ),
                expected_impact="Catch disease before proliferation",
                triggered_by=["risk_level", "disease_detected"],
            )
        )
    
    # D4 original (REPLACED above): moderate stress indicators
    # condition fixed from: 0.4 <= disease.behavioral_stress_index <= 0.7
    # to: disease.risk_level == "Medium" OR (BSI >= 0.3 AND BSI <= 0.7)
    if disease.risk_level == "Medium" or (0.3 <= disease.behavioral_stress_index <= 0.7 and disease.risk_level != "Low"):
        suggs.append(
            Suggestion(
                category="disease",
                urgency="today",
                title="Moderate stress indicators",
                description=(
                    "Moderate stress indicators present. Increase monitoring frequency "
                    "to every 2 hours. Check feeding behavior at next feeding."
                ),
                expected_impact="Catch deterioration early",
                triggered_by=["risk_level", "behavioral_stress_index"],
            )
        )

    # D5_NEW: Spread risk with no confirmed disease
    if disease.spread_risk == "High" and not disease.disease_detected:
        suggs.append(
            Suggestion(
                category="disease",
                urgency="today",
                title="High Spread Risk Detected",
                description=(
                    "Spread risk is High despite no confirmed disease. "
                    "Avoid inter-pond water transfers and shared equipment. "
                    "Conditions favorable for rapid disease transmission in vannamei ponds."
                ),
                expected_impact="Prevent inter-pond disease transmission",
                triggered_by=["spread_risk"],
            )
        )

    # FEED RULES
    if feed.molting_stage:
        pct = feed.molting_feed_reduction_pct * 100
        suggs.append(
            Suggestion(
                category="feed",
                urgency="today",
                title="Molting stage detected",
                description=(
                    f"Shrimp in molting stage. Reduce feed by {pct:.0f}%. Molting vannamei "
                    "are vulnerable — minimize pond disturbance for next 24-48 hours."
                ),
                expected_impact="Protect molting shrimp from injury",
                triggered_by=["molting_stage"],
            )
        )

    if feed.mortality_probability > 0.6:
        urg = "immediate" if feed.mortality_probability > 0.8 else "today"
        suggs.append(
            Suggestion(
                category="feed",
                urgency=urg,
                title="Elevated mortality probability",
                description=(
                    f"Mortality probability at {feed.mortality_probability*100:.1f}%. Review all "
                    "stressors. Check DO, ammonia, and stocking density. Consider "
                    "emergency partial harvest if above 0.8."
                ),
                expected_impact="Reduce potential losses",
                triggered_by=["mortality_probability"],
            )
        )

    # F5_NEW: Critical mortality probability (separate threshold for immediate response)
    if feed.mortality_probability > 0.8:
        suggs.append(
            Suggestion(
                category="feed",
                urgency="immediate",
                title="Critical Mortality Risk — Consider Emergency Harvest",
                description=(
                    f"Mortality probability at {feed.mortality_probability*100:.1f}%. Above 80% threshold "
                    "for vannamei emergency response. Consider partial harvest to reduce "
                    "stocking density and financial loss. Consult farm manager immediately."
                ),
                expected_impact="Minimize financial loss through emergency intervention",
                triggered_by=["mortality_probability"],
            )
        )

    # F3: four day forecast
    for day in feed.four_day_forecast:
        if day.day == 4 and day.mortality_risk > 0.7:
            suggs.append(
                Suggestion(
                    category="feed",
                    urgency="today",
                    title="Forecast mortality spike",
                    description=(
                        f"Mortality risk forecast spikes on day {day.day}. Intervene now on "
                        "water quality and feeding to prevent this outcome."
                    ),
                    expected_impact="Avoid predicted losses",
                    triggered_by=["four_day_forecast_day4"],
                )
            )
            break

    if getattr(feed.layer_distribution, "surface_pct", None) == 0:
        suggs.append(
            Suggestion(
                category="feed",
                urgency="this_week",
                title="No surface feed reaching shrimp",
                description=(
                    "No feed reaching surface layer. Shrimp at surface may be underfed. "
                    "Adjust feed particle size or feeding mechanism."
                ),
                expected_impact="Improve feed uptake",
                triggered_by=["layer_distribution"],
            )
        )

    # COMPOUND SUGGESTIONS
    flags = fusion.cross_modal_flags or []
    if "AMMONIA_DISEASE_COMPOUND" in flags:
        suggs.append(
            Suggestion(
                category="compound",
                urgency="immediate",
                title="Critical compound risk: ammonia + disease",
                description=(
                    f"CRITICAL COMPOUND RISK: High ammonia ({am:.3f}mg/L) combined with "
                    f"elevated BSI ({disease.behavioral_stress_index:.2f}) creates acute "
                    "disease outbreak conditions for vannamei. Immediate water exchange "
                    "+ halt feeding + activate full aeration. Risk of mass mortality within "
                    "12-24 hours if unaddressed."
                ),
                expected_impact="Avert catastrophic die-off",
                triggered_by=["AMMONIA_DISEASE_COMPOUND"],
            )
        )
    if "LOW_DO_FEED_WASTE" in flags:
        waste = feed.optimal_feed_kg
        suggs.append(
            Suggestion(
                category="compound",
                urgency="immediate",
                title="Low DO with feed waste",
                description=(
                    f"Low DO means shrimp are not actively feeding. Current feed schedule "
                    f"will result in {waste:.1f}kg uneaten feed decomposing, further depleting "
                    "oxygen and raising ammonia. Suspend feeding until DO > 5mg/L."
                ),
                expected_impact="Prevent oxygen crash and ammonia spike",
                triggered_by=["LOW_DO_FEED_WASTE"],
            )
        )
    if "MOLTING_DISEASE_CRITICAL" in flags:
        suggs.append(
            Suggestion(
                category="compound",
                urgency="immediate",
                title="Compound risk: molting with disease",
                description=(
                    f"COMPOUND RISK: Molting vannamei are immunocompromised. Current "
                    f"{disease.risk_level} disease risk during molting stage is high-severity. "
                    "Minimize all stressors, cut feed to molting amount only, increase "
                    "aeration."
                ),
                expected_impact="Reduce infection during vulnerable molting period",
                triggered_by=["MOLTING_DISEASE_CRITICAL"],
            )
        )
    if "TEMP_STRESS_COMPOUND" in flags:
        t = getattr(water.current_readings, "temperature", None)
        suggs.append(
            Suggestion(
                category="compound",
                urgency="today",
                title="Temperature + stress compound",
                description=(
                    f"Temperature stress ({t}°C) combined with behavioral stress "
                    f"(BSI {disease.behavioral_stress_index:.2f}) suppresses vannamei "
                    "immune response. Disease risk elevated. Prioritize temperature "
                    "correction."
                ),
                expected_impact="Improve immune function by normalizing temperature",
                triggered_by=["TEMP_STRESS_COMPOUND"],
            )
        )

    # C5_NEW: High disease risk + rising mortality forecast compound
    if (disease.risk_level in ("High", "Critical") and 
        feed.four_day_forecast and 
        feed.four_day_forecast[-1].mortality_risk > 0.6):
        day4_risk = feed.four_day_forecast[-1].mortality_risk
        suggs.append(
            Suggestion(
                category="compound",
                urgency="immediate",
                title="COMPOUND: Disease Risk Driving Mortality Forecast",
                description=(
                    f"High disease risk ({disease.risk_level}) is likely driving the rising "
                    f"mortality forecast (day 4 risk: {day4_risk*100:.1f}%). These are not "
                    "independent events. Addressing disease risk now will directly reduce "
                    "mortality probability. Prioritize disease intervention over feed optimization."
                ),
                expected_impact="Break the disease→mortality linkage through early intervention",
                triggered_by=["risk_level", "four_day_forecast"],
            )
        )

    # Sort by strict order:
    # 1. compound + immediate
    # 2. non-compound + immediate (by category: disease > water > feed)
    # 3. compound + today
    # 4. non-compound + today (by category: disease > water > feed)
    # 5. this_week (any category)
    
    def _sort_key(s: Suggestion):
        category_order = {"disease": 0, "water": 1, "feed": 2}
        
        # Determine primary sort stage
        if s.category == "compound" and s.urgency == "immediate":
            stage = 0
        elif s.category != "compound" and s.urgency == "immediate":
            stage = 1
        elif s.category == "compound" and s.urgency == "today":
            stage = 2
        elif s.category != "compound" and s.urgency == "today":
            stage = 3
        else:  # this_week
            stage = 4
        
        # Within stages, order by category for non-compound rules
        cat_order = category_order.get(s.category, 3)
        return (stage, cat_order)
    
    suggs.sort(key=_sort_key)

    return suggs[:10]


def generate_digital_twin(fusion: FusionResult) -> DigitalTwinResponse:
    """Translate a FusionResult into a DigitalTwinResponse with actionable advice."""
    water = _map_water_score(fusion.component_scores.get("water", 0.0))
    disease = _map_disease_score(fusion.component_scores.get("disease_risk", 0.0))
    # include any cross-modal flags as disease factors for visibility
    if fusion.cross_modal_flags:
        disease.factors = fusion.cross_modal_flags
    feed = _map_feed_efficiency(
        fusion.component_scores.get("feed_efficiency", 1.0), fusion.primary_concern
    )
    visual = _visual_from_status(fusion.pond_status)

    return DigitalTwinResponse(
        pond_id=fusion.pond_id,
        overall_status=fusion.pond_status,
        water=water,
        disease=disease,
        feed=feed,
        visual=visual,
    )
