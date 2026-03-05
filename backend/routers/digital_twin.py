from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import random

# re-use mock endpoints directly rather than issuing external HTTP requests
from routers.mock import mock_water_score, mock_disease_score, mock_feed_score

from models.schemas import (
    DigitalTwinResponse,
    DigitalTwinEnhancedResponse,
    WaterReadingDetailed,
    HourlyWaterForecast,
    DiseaseScoreResponse,
    FeedScoreResponse,
    WaterScoreResponse,
    LayerDistribution,
    FeedForecastDay,
    WhatIfResponse,
    WhatIfCurrentState,
    WhatIfDelta,
    WhatIfHypothetical,
    ParameterChange,
)
from services.fusion_engine import compute_fusion, FusionResult
from services.suggestion_engine import generate_digital_twin, generate_suggestions
from services.farmer_summary import compute_farmer_summary
from services.pond_service import (
    get_pond_by_id,
    compute_water_score,
    compute_disease_probability,
    compute_feed_efficiency,
)

router = APIRouter()


@router.get("/digital-twin/{pond_id}", response_model=DigitalTwinEnhancedResponse, tags=["digital-twin"])
async def get_digital_twin(pond_id: int):
    """Multimodal endpoint that fuses telemetry from water, disease and feed subsystems.

    Returns a comprehensive response including:
    - farmer_summary: Plain-English actionable summary for farm operators
    - fusion: Fused multimodal analysis result
    - suggestions: Prioritized list of actions (up to 10)
    - raw_scores: Raw API responses from water, disease, feed scoring systems
    """
    # note: mock_xxx functions raise HTTPException if pond not found; they are
    # asynchronous so we await them directly.
    water = await mock_water_score(pond_id)
    disease = await mock_disease_score(pond_id)
    feed = await mock_feed_score(pond_id)

    # Step 1: Fuse all three modalities
    fusion = compute_fusion(water, disease, feed)
    
    # Step 2: Compute farmer friendly summary
    farmer_summary = compute_farmer_summary(water, disease, feed, fusion)
    
    # Step 3: Generate suggestions
    suggestions = generate_suggestions(water, disease, feed, fusion)
    
    # Step 4: Prepare raw scores
    raw_scores = {
        "water": water.model_dump(),
        "disease": disease.model_dump(),
        "feed": feed.model_dump(),
    }
    
    return DigitalTwinEnhancedResponse(
        pond_id=pond_id,
        timestamp=datetime.now(timezone.utc),
        farmer_summary=farmer_summary,
        fusion=fusion.model_dump(),
        suggestions=[s.model_dump() for s in suggestions],
        raw_scores=raw_scores,
    )


# ============================================================================
# WHAT-IF SCENARIO HELPERS
# ============================================================================

def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def _bounded(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _pond_random(pond_id: int) -> random.Random:
    """Return a random.Random instance seeded by pond_id for deterministic output."""
    return random.Random(pond_id)


def _noisy_score(base: float, sigma: float = 0.03) -> float:
    return _clamp(random.gauss(base, sigma))


def _generate_hypothetical_water_response(
    hypo_pond: Dict[str, Any],
    pond_id: int,
) -> WaterScoreResponse:
    """Generate hypothetical water response by computing scores locally."""
    rnd = _pond_random(pond_id)
    ts = datetime.now(timezone.utc)
    
    # Realistic allowed ranges for parameters
    ranges = {
        "ph": (6.0, 9.0),
        "do": (0.0, 15.0),
        "ammonia": (0.0, 5.0),
        "nitrate": (0.0, 200.0),
        "turbidity": (0.0, 500.0),
        "salinity": (0.0, 40.0),
        "temperature": (5.0, 35.0),
    }
    
    def _make_reading(key: str, default: float, sigma: float = 0.2) -> float:
        base = hypo_pond.get(key, default)
        if base is None:
            base = default
        lo, hi = ranges.get(key, (float("-inf"), float("inf")))
        val = rnd.gauss(base, sigma)
        return float(round(_bounded(val, lo, hi), 3))
    
    # Current readings from hypothetical pond
    current = WaterReadingDetailed(
        ph=_make_reading("ph", 7.5),
        do=_make_reading("do", 6.0),
        ammonia=_make_reading("ammonia", 0.1),
        nitrate=_make_reading("nitrate", 20.0),
        turbidity=_make_reading("turbidity", 30.0),
        salinity=_make_reading("salinity", 5.0),
        temperature=_make_reading("temperature", 28.0),
    )
    
    # Generate 6-hour forecast with drift
    hourly = []
    last_vals = current.model_dump()
    for hour in range(1, 7):
        new_vals = {}
        for k, v in last_vals.items():
            if isinstance(v, (int, float)):
                lo, hi = ranges.get(k, (float("-inf"), float("inf")))
                new_vals[k] = float(round(_bounded(rnd.gauss(v, 0.1), lo, hi), 3))
        quality = _clamp(rnd.gauss(0.6, 0.15))
        hourly.append(
            HourlyWaterForecast(
                hour_offset=hour,
                ph=new_vals["ph"],
                do=new_vals["do"],
                ammonia=new_vals["ammonia"],
                nitrate=new_vals["nitrate"],
                turbidity=new_vals["turbidity"],
                salinity=new_vals["salinity"],
                temperature=new_vals["temperature"],
                water_quality_score=quality,
            )
        )
        last_vals = new_vals
    
    # Compute water score and confidence
    water_score = _noisy_score(compute_water_score(hypo_pond))
    risk_flag = water_score < 0.6
    
    # Confidence = count non-null critical params / total critical params
    critical = ["ph", "do", "ammonia", "nitrate", "turbidity", "salinity", "temperature"]
    present = sum(1 for k in critical if hypo_pond.get(k) is not None and hypo_pond.get(k) != "")
    confidence = _clamp(present / len(critical))
    
    return WaterScoreResponse(
        pond_id=pond_id,
        timestamp=ts,
        confidence=round(confidence, 4),
        risk_flag=risk_flag,
        current_readings=current,
        hourly_forecast=hourly,
    )


def _generate_hypothetical_disease_response(
    hypo_pond: Dict[str, Any],
    pond_id: int,
    bsi_override: Optional[float] = None,
    risk_level_override: Optional[str] = None,
) -> DiseaseScoreResponse:
    """Generate hypothetical disease response locally."""
    rnd = _pond_random(pond_id)
    ts = datetime.now(timezone.utc)
    
    # Base probability from pond params
    base_probability = compute_disease_probability(hypo_pond)
    if base_probability is None:
        # defensive fallback; compute_disease_probability should never return
        # None, but a bug or future change could introduce one and we don't
        # want the what‑if endpoint to crash because of it.
        base_probability = 0.0
    
    # BSI: override if provided, else derive from probability
    if bsi_override is not None:
        bsi = _clamp(bsi_override)
    else:
        bsi = _clamp(base_probability * 0.8 + rnd.gauss(0, 0.05))
    
    # Risk level: override if provided, else derive from probability
    if risk_level_override is not None:
        risk_level = risk_level_override
    else:
        if base_probability < 0.3:
            risk_level = "Low"
        elif base_probability < 0.5:
            risk_level = "Medium"
        elif base_probability < 0.75:
            risk_level = "High"
        else:
            risk_level = "Critical"
    
    # Confidence based on available disease params
    disease_params = ["stocking_density", "shrimp_stage", "temperature", "nitrate", "turbidity"]
    present = sum(1 for k in disease_params if hypo_pond.get(k) is not None and hypo_pond.get(k) != "")
    confidence = _clamp(present / len(disease_params))
    
    # Derived metrics
    shrimp_count = rnd.randint(800, 6000)
    anomalies_detected = int(bsi * 20)
    disease_detected = base_probability > 0.75
    
    # Dominant symptom based on risk factors
    ammonia = hypo_pond.get("ammonia")
    do = hypo_pond.get("do")
    turbidity = hypo_pond.get("turbidity")
    temperature = hypo_pond.get("temperature")
    
    if ammonia is not None and ammonia > 0.5:
        dominant_symptom = "gill inflammation"
    elif do is not None and do < 4:
        dominant_symptom = "lethargy"
    elif turbidity is not None and turbidity > 80:
        dominant_symptom = "erratic swimming"
    elif temperature is not None and (temperature > 32 or temperature < 20):
        dominant_symptom = "surface gasping"
    else:
        dominant_symptom = "reduced activity"
    
    # Spread risk from stocking density and probability
    # ``hypo_pond`` may contain the key with a value of ``None`` (e.g. when the
    # database row has a NULL value).  ``dict.get`` will return that ``None``
    # instead of the default, which causes ``>`` to blow up.  Normalize to a
    # safe numeric value before doing any comparisons.  We also guard against
    # an unexpected ``None`` coming from compute_disease_probability even though
    # it should always return a float.
    stocking = hypo_pond.get("stocking_density")
    if stocking is None:
        stocking = 200
    try:
        stocking = float(stocking)
    except Exception:
        stocking = 200

    if base_probability is None:
        base_probability = 0.0

    if stocking > 400 or base_probability > 0.6:
        spread_risk = "High"
    elif stocking > 300 or base_probability > 0.4:
        spread_risk = "Medium"
    else:
        spread_risk = "Low"
    
    return DiseaseScoreResponse(
        pond_id=pond_id,
        timestamp=ts,
        confidence=round(confidence, 4),
        shrimp_count=shrimp_count,
        behavioral_stress_index=round(bsi, 3),
        anomalies_detected=anomalies_detected,
        risk_level=risk_level,
        dominant_symptom=dominant_symptom,
        disease_detected=disease_detected,
        disease_name=None,
        spread_risk=spread_risk,
    )


def _generate_hypothetical_feed_response(
    hypo_pond: Dict[str, Any],
    hypo_disease: DiseaseScoreResponse,
    hypo_water: WaterScoreResponse,
    pond_id: int,
    molting_stage: Optional[bool] = None,
    shrimp_size: Optional[float] = None,
    pond_depth: Optional[float] = None,
) -> FeedScoreResponse:
    """Generate hypothetical feed response locally."""
    rnd = _pond_random(pond_id)
    ts = datetime.now(timezone.utc)
    
    # Base efficiency
    base_efficiency = compute_feed_efficiency(hypo_pond)
    
    # Confidence based on feed params
    feed_params = ["feed_type", "pond_area", "pond_depth", "shrimp_size", "stocking_density"]
    present = sum(1 for k in feed_params if hypo_pond.get(k) is not None and hypo_pond.get(k) != "")
    confidence = _clamp(present / len(feed_params))
    
    # Optimal feed: derive base from pond area if available.  The database
    # row may include a key with value ``None`` which would bypass the default
    # in ``dict.get`` and lead to a TypeError when doing arithmetic.  Mirror the
    # defensive pattern used elsewhere by normalizing to a safe numeric value.
    pond_area = hypo_pond.get("pond_area")
    if pond_area is None:
        pond_area = 400.0
    else:
        try:
            pond_area = float(pond_area)
        except Exception:
            pond_area = 400.0

    base_feed_kg = pond_area * 0.01  # heuristic: 1% of area in kg
    optimal_feed_kg = round(base_feed_kg * base_efficiency, 2)
    
    # Mortality probability from disease and water
    water_score = 1.0 - (hypo_disease.behavioral_stress_index * 0.5)  # proxy
    mortality_probability = _clamp(
        hypo_disease.behavioral_stress_index * 0.6 + (1 - water_score) * 0.4
    )
    
    # Molting stage and reduction
    molting_active = molting_stage if molting_stage is not None else False
    molting_reduction_pct = 0.3 if molting_active else 0.0
    
    # Layer distribution based on pond depth.  Like pond_area above we need to
    # guard against explicit ``None`` values coming from the database, since the
    # default argument to ``dict.get`` is ignored when the key is present.
    depth = pond_depth if pond_depth is not None else hypo_pond.get("pond_depth")
    if depth is None:
        depth = 1.5
    else:
        try:
            depth = float(depth)
        except Exception:
            depth = 1.5

    if depth < 1.0:
        layer_dist = LayerDistribution(bottom_pct=0.3, mid_pct=0.5, surface_pct=0.2)
    elif depth <= 2.0:
        layer_dist = LayerDistribution(bottom_pct=0.5, mid_pct=0.4, surface_pct=0.1)
    else:
        layer_dist = LayerDistribution(bottom_pct=0.6, mid_pct=0.35, surface_pct=0.05)
    
    # 4-day forecast
    forecast_days = []
    for day in range(1, 5):
        day_mortality = mortality_probability * (day / 4.0)
        day_mortality = min(day_mortality, 1.0)
        
        # Expected growth decreases with risk
        base_growth = 2.0 * (shrimp_size if shrimp_size else 15) * base_efficiency if shrimp_size else 15
        expected_growth_g = round(base_growth * (1 - day_mortality * 0.5), 2)
        
        # Feed amount
        day_feed = round(optimal_feed_kg * (1 - molting_reduction_pct) * (1 - day_mortality * 0.3), 2)
        
        forecast_days.append(
            FeedForecastDay(
                day=day,
                feed_kg=day_feed,
                expected_growth_g=expected_growth_g,
                mortality_risk=round(day_mortality, 3),
            )
        )
    
    return FeedScoreResponse(
        pond_id=pond_id,
        timestamp=ts,
        confidence=round(confidence, 4),
        optimal_feed_kg=optimal_feed_kg,
        mortality_probability=round(mortality_probability, 3),
        molting_stage=molting_active,
        molting_feed_reduction_pct=molting_reduction_pct,
        layer_distribution=layer_dist,
        four_day_forecast=forecast_days,
    )


@router.get("/digital-twin/{pond_id}/what-if", response_model=WhatIfResponse, tags=["digital-twin"])
async def what_if_scenario(
    pond_id: int,
    # Water management conditions
    temperature: Optional[float] = Query(None),
    ph: Optional[float] = Query(None),
    do: Optional[float] = Query(None),
    ammonia: Optional[float] = Query(None),
    nitrate: Optional[float] = Query(None),
    turbidity: Optional[float] = Query(None),
    salinity: Optional[float] = Query(None),
    # Disease risk conditions
    stocking_density: Optional[int] = Query(None),
    shrimp_stage: Optional[str] = Query(None),
    bsi_override: Optional[float] = Query(None),
    risk_level_override: Optional[str] = Query(None),
    # Feeding strategy conditions
    feed_type: Optional[str] = Query(None),
    molting_stage: Optional[bool] = Query(None),
    shrimp_size: Optional[float] = Query(None),
    pond_depth: Optional[float] = Query(None),
    # Scenario metadata
    scenario_name: Optional[str] = Query(None),
):
    """
    What-if simulation: runs hypothetical scenarios without affecting real pond data.
    
    Supply optional query parameters to override current pond conditions.
    Returns comparison of hypothetical vs current state with delta and recommendations.
    """
    
    # Step 1: Fetch current pond and build hypothetical pond dict
    current_pond = await get_pond_by_id(pond_id)
    if current_pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")
    
    # Build hypothetical pond by merging query params with current
    hypo_pond = dict(current_pond)  # Start with current baseline
    
    # Override with any provided query parameters
    if temperature is not None:
        hypo_pond["temperature"] = temperature
    if ph is not None:
        hypo_pond["ph"] = ph
    if do is not None:
        hypo_pond["do"] = do
    if ammonia is not None:
        hypo_pond["ammonia"] = ammonia
    if nitrate is not None:
        hypo_pond["nitrate"] = nitrate
    if turbidity is not None:
        hypo_pond["turbidity"] = turbidity
    if salinity is not None:
        hypo_pond["salinity"] = salinity
    if stocking_density is not None:
        hypo_pond["stocking_density"] = stocking_density
    if shrimp_stage is not None:
        hypo_pond["shrimp_stage"] = shrimp_stage
    if feed_type is not None:
        hypo_pond["feed_type"] = feed_type
    if pond_depth is not None:
        hypo_pond["pond_depth"] = pond_depth
    
    # Step 2: Compute hypothetical scores locally (NO HTTP calls)
    hypo_water = _generate_hypothetical_water_response(hypo_pond, pond_id)
    hypo_disease = _generate_hypothetical_disease_response(
        hypo_pond, pond_id, bsi_override, risk_level_override
    )
    hypo_feed = _generate_hypothetical_feed_response(
        hypo_pond, hypo_disease, hypo_water, pond_id, molting_stage, shrimp_size, pond_depth
    )
    
    # Step 3: Run full fusion pipeline on hypothetical responses
    hypo_fusion = compute_fusion(hypo_water, hypo_disease, hypo_feed)
    hypo_farmer_summary = compute_farmer_summary(hypo_water, hypo_disease, hypo_feed, hypo_fusion)
    hypo_suggestions = generate_suggestions(hypo_water, hypo_disease, hypo_feed, hypo_fusion)
    
    # Step 4: Fetch current state for comparison
    current_water = await mock_water_score(pond_id)
    current_disease = await mock_disease_score(pond_id)
    current_feed = await mock_feed_score(pond_id)
    current_fusion = compute_fusion(current_water, current_disease, current_feed)
    
    # Step 5: Compute delta
    health_score_change = hypo_fusion.composite_health_score - current_fusion.composite_health_score
    
    # Status change
    status_rank = {"Good": 4, "Moderate": 3, "Warning": 2, "Critical": 1}
    hypo_rank = status_rank.get(hypo_fusion.pond_status, 0)
    current_rank = status_rank.get(current_fusion.pond_status, 0)
    
    if hypo_rank > current_rank:
        status_change = "improved"
    elif hypo_rank < current_rank:
        status_change = "degraded"
    else:
        status_change = "unchanged"
    
    # Flags comparison
    new_flags = [f for f in hypo_fusion.cross_modal_flags if f not in current_fusion.cross_modal_flags]
    resolved_flags = [f for f in current_fusion.cross_modal_flags if f not in hypo_fusion.cross_modal_flags]
    
    # Parameter changes (FIX 2: use current_water readings for water params)
    # FIX 3: track ALL passed query params including overrides
    parameter_changes = []
    
    # FIX 2: Map water params to use readings from current_water API response
    water_reading_map = {
        "temperature": current_water.current_readings.temperature,
        "ph": current_water.current_readings.ph,
        "do": current_water.current_readings.do,
        "ammonia": current_water.current_readings.ammonia,
        "nitrate": current_water.current_readings.nitrate,
        "turbidity": current_water.current_readings.turbidity,
        "salinity": current_water.current_readings.salinity,
    }
    
    params_to_check = [
        ("temperature", temperature),
        ("ph", ph),
        ("do", do),
        ("ammonia", ammonia),
        ("nitrate", nitrate),
        ("turbidity", turbidity),
        ("salinity", salinity),
        ("stocking_density", stocking_density),
        ("pond_depth", pond_depth),
        ("shrimp_size", shrimp_size),
    ]
    
    for param_name, param_value in params_to_check:
        if param_value is not None:
            # FIX 2: For water params, use API response; for others, use DB
            if param_name in water_reading_map:
                current_value = water_reading_map[param_name]
            else:
                current_value = current_pond.get(param_name)
            if current_value is None:
                current_value = 0.0
            
            # Determine impact: compare risk contribution before vs after
            # Simple heuristic: if new value is closer to optimal, positive impact
            impact = "neutral"
            
            # Water quality impacts
            if param_name == "do":
                if param_value > current_value and param_value >= 5:
                    impact = "positive"
                elif param_value < current_value or param_value < 4:
                    impact = "negative"
            elif param_name == "ammonia":
                if param_value < current_value and param_value < 0.5:
                    impact = "positive"
                elif param_value > current_value or param_value > 0.5:
                    impact = "negative"
            elif param_name == "temperature":
                if 26 <= param_value <= 30:
                    impact = "positive"
                elif param_value < 20 or param_value > 32:
                    impact = "negative"
            elif param_name == "stocking_density":
                if param_value < 300:
                    impact = "positive"
                elif param_value > 400:
                    impact = "negative"
            
            parameter_changes.append(
                ParameterChange(
                    parameter=param_name,
                    before=float(current_value),
                    after=float(param_value),
                    impact=impact,
                )
            )
    
    # FIX 3: Add override and special params (before="not set", impact evaluated)
    override_params = [
        ("bsi_override", bsi_override),
        ("risk_level_override", risk_level_override),
        ("shrimp_stage", shrimp_stage),
        ("feed_type", feed_type),
        ("molting_stage", molting_stage),
    ]
    
    for param_name, param_value in override_params:
        if param_value is not None:
            impact = "neutral"
            # Evaluate impact based on the override/param value
            if param_name == "bsi_override" and param_value > 0.6:
                impact = "negative"
            elif param_name == "bsi_override" and param_value < 0.4:
                impact = "positive"
            elif param_name == "risk_level_override":
                risk_rank = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
                current_risk = current_disease.risk_level
                if risk_rank.get(param_value, 0) > risk_rank.get(current_risk, 0):
                    impact = "negative"
                elif risk_rank.get(param_value, 0) < risk_rank.get(current_risk, 0):
                    impact = "positive"
            elif param_name == "shrimp_stage" and param_value == "juvenile":
                impact = "negative"
            elif param_name == "molting_stage" and param_value is True:
                impact = "negative"
            elif param_name == "feed_type":
                if param_value == "high_protein":
                    impact = "positive"
            
            parameter_changes.append(
                ParameterChange(
                    parameter=param_name,
                    before="not set",
                    after=str(param_value),
                    impact=impact,
                )
            )
    
    # Step 6: Generate simulation_note
    scenario_label = scenario_name if scenario_name else "Unnamed Scenario"
    
    note_parts = [f"Scenario '{scenario_label}': "]
    
    # Status change summary
    pct_change = abs(health_score_change) * 100
    if status_change == "degraded":
        note_parts.append(f"Pond health degraded by {pct_change:.1f}% to {hypo_fusion.pond_status}. ")
    elif status_change == "improved":
        note_parts.append(f"Pond health improved by {pct_change:.1f}% to {hypo_fusion.pond_status}. ")
    else:
        note_parts.append(f"Pond health unchanged at {hypo_fusion.pond_status}. ")
    
    # Primary driver
    if hypo_fusion.primary_concern != "none":
        # Estimate risk percentage for primary concern
        concern_score = 0.0
        if hypo_fusion.primary_concern == "water":
            concern_score = 1.0 - hypo_water.confidence
        elif hypo_fusion.primary_concern == "disease":
            concern_score = hypo_disease.behavioral_stress_index
        elif hypo_fusion.primary_concern == "feed":
            concern_score = hypo_feed.mortality_probability
        
        note_parts.append(f"Primary driver: {hypo_fusion.primary_concern} risk at {concern_score:.0%}. ")
    
    # New flags
    if new_flags:
        note_parts.append(f"New compound risks detected: {', '.join(new_flags)}. ")
    
    # Resolved flags
    if resolved_flags:
        note_parts.append(f"Resolved risks: {', '.join(resolved_flags)}. ")
    
    # Top suggestion
    if hypo_suggestions:
        note_parts.append(f"Recommended action: {hypo_suggestions[0].title}.")
    else:
        note_parts.append("Recommended action: None.")
    
    simulation_note = "".join(note_parts)
    
    # Build response
    return WhatIfResponse(
        pond_id=pond_id,
        scenario_name=scenario_label,
        timestamp=datetime.now(timezone.utc),
        parameters_tested={p.parameter: {"before": p.before, "after": p.after} for p in parameter_changes},
        hypothetical=WhatIfHypothetical(
            farmer_summary=hypo_farmer_summary.model_dump(),
            fusion=hypo_fusion.model_dump(),
            suggestions=[s.model_dump() for s in hypo_suggestions],
        ),
        current=WhatIfCurrentState(
            composite_health_score=current_fusion.composite_health_score,
            pond_status=current_fusion.pond_status,
            primary_concern=current_fusion.primary_concern,
            cross_modal_flags=current_fusion.cross_modal_flags,
        ),
        delta=WhatIfDelta(
            health_score_change=round(health_score_change, 4),
            status_change=status_change,
            new_flags=new_flags,
            resolved_flags=resolved_flags,
            parameter_changes=parameter_changes,
        ),
        simulation_note=simulation_note,
    )

