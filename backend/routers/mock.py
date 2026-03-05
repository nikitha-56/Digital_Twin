from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import asyncio
import random
import json
from datetime import datetime, timezone

from services import (
    get_pond_by_id,
    compute_water_score,
    compute_disease_probability,
    compute_feed_efficiency,
)
from models.schemas import (
    WaterScoreResponse,
    DiseaseScoreResponse,
    FeedScoreResponse,
    WaterReadingDetailed,
    HourlyWaterForecast,
    LayerDistribution,
    FeedForecastDay,
)

router = APIRouter()


def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def _bounded(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


# The previous confidence helper was overly general and gave the same
# low score for every pond (1/12 -> 0.0833) because most ponds only had a
# single field set.  Instead we calculate service-specific confidences
# following the spec from the user.

def _water_confidence(pond: dict) -> float:
    """Compute confidence for the water service based on the pond record.

    Only the seven *critical* fields are considered; missing values are not
    counted.  The score is the fraction of fields that are non-null.
    """
    critical = [
        "ph",
        "do",
        "ammonia",
        "nitrate",
        "turbidity",
        "salinity",
        "temperature",
    ]
    present = 0
    for k in critical:
        v = pond.get(k)
        if v is not None and v != "":
            present += 1
    return _clamp(present / len(critical))


# legacy helper retained only for any generic use, but not the mock endpoints
# which now call the specialized functions above.
def _confidence_from_pond(pond: dict) -> float:
    # count how many of the important parameters are present (non-null)
    keys = [
        "temperature",
        "tds",
        "orp",
        "nitrate",
        "turbidity",
        "humidity",
        "stocking_density",
        "shrimp_stage",
        "shrimp_size",
        "feed_type",
        "pond_area",
        "pond_depth",
    ]
    present = 0
    for k in keys:
        v = pond.get(k)
        if v is not None and v != "":
            present += 1
    return _clamp(present / len(keys))


def _noisy_score(base: float, sigma: float = 0.03) -> float:
    return _clamp(random.gauss(base, sigma))


def _pond_random(pond_id: int) -> random.Random:
    """Return a random.Random instance seeded by pond_id for deterministic output."""
    return random.Random(pond_id)


@router.get("/mock/water-score/{pond_id}", response_model=WaterScoreResponse, tags=["mock"])
async def mock_water_score(pond_id: int):
    pond = await get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    rnd = _pond_random(pond_id)
    # water-specific confidence based on critical pond fields
    confidence = round(_water_confidence(pond), 4)
    ts = datetime.now(timezone.utc)

    # core decision helpers
    # realistic allowed ranges for parameters
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
        base = pond.get(key, default)
        if base is None:
            base = default
        lo, hi = ranges.get(key, (float("-inf"), float("inf")))
        val = rnd.gauss(base, sigma)
        return float(round(_bounded(val, lo, hi), 3))

    current = WaterReadingDetailed(
        ph=_make_reading("ph", 7.5),
        do=_make_reading("do", 6.0),
        ammonia=_make_reading("ammonia", 0.1),
        nitrate=_make_reading("nitrate", 20.0),
        turbidity=_make_reading("turbidity", 30.0),
        salinity=_make_reading("salinity", 5.0),
        temperature=_make_reading("temperature", 28.0),
    )

    # generate hourly forecast: six entries with slight drift
    hourly = []
    last_vals = current.dict()
    for hour in range(1, 7):
        # drift each parameter slightly
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

    # simple risk flag based on water score computed by service
    score = _noisy_score(compute_water_score(pond))
    risk_flag = score < 0.4

    return WaterScoreResponse(
        pond_id=pond_id,
        timestamp=ts,
        confidence=round(confidence, 4),
        risk_flag=risk_flag,
        current_readings=current,
        hourly_forecast=hourly,
    )


@router.get("/mock/disease-score/{pond_id}", response_model=DiseaseScoreResponse, tags=["mock"])
async def mock_disease_score(pond_id: int):
    pond = await get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    rnd = _pond_random(pond_id)
    ts = datetime.now(timezone.utc)

    # generate deterministic values based on seeded random
    shrimp_count = rnd.randint(800, 6000)
    behavioral_stress_index = _clamp(rnd.gauss(0.5, 0.2))
    anomalies_detected = rnd.randint(0, 5)
    risk_levels = ["Low", "Medium", "High", "Critical"]
    risk_level = rnd.choice(risk_levels)
    dominant_symptom = rnd.choice([
        "lethargy",
        "discoloration",
        "abnormal swimming",
        "loss of appetite",
    ])
    disease_detected = rnd.random() < 0.3
    disease_name = None
    if disease_detected:
        disease_name = rnd.choice([
            "WFS",
            "AHPND",
            "White Spot",
            "Vibriosis",
        ])
    spread_risk = rnd.choice(["Low", "Medium", "High"])

    # derive confidence based on output fields
    disease_fields = [
        behavioral_stress_index,
        anomalies_detected,
        risk_level,
        dominant_symptom,
        shrimp_count,
    ]
    confidence = round(_clamp(sum(1 for v in disease_fields if v is not None and v != "") / len(disease_fields)), 4)

    return DiseaseScoreResponse(
        pond_id=pond_id,
        timestamp=ts,
        confidence=confidence,
        shrimp_count=shrimp_count,
        behavioral_stress_index=behavioral_stress_index,
        anomalies_detected=anomalies_detected,
        risk_level=risk_level,
        dominant_symptom=dominant_symptom,
        disease_detected=disease_detected,
        disease_name=disease_name,
        spread_risk=spread_risk,
    )


@router.get("/mock/feed-score/{pond_id}", response_model=FeedScoreResponse, tags=["mock"])
async def mock_feed_score(pond_id: int):
    pond = await get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    rnd = _pond_random(pond_id)
    ts = datetime.now(timezone.utc)

    optimal_feed_kg = float(round(max(0.0, rnd.gauss(200.0, 50.0)), 3))
    mortality_probability = _clamp(rnd.random())
    molting_stage = rnd.random() < 0.25
    molting_feed_reduction_pct = _clamp(rnd.random() * 0.5) if molting_stage else 0.0

    # confidence will be calculated after constructing layer and forecast

    # normalized layer distribution (sums exactly to 1.0 after rounding)
    a = rnd.random()
    b = rnd.random()
    total = a + b + 1e-12
    bottom_raw = a / total
    mid_raw = b / total
    bottom = round(bottom_raw, 4)
    mid = round(mid_raw, 4)
    surface = round(1.0 - bottom - mid, 4)
    layer = LayerDistribution(
        bottom_pct=bottom,
        mid_pct=mid,
        surface_pct=surface,
    )

    four_day = []
    last_feed = optimal_feed_kg
    for day in range(1, 5):
        feed_kg = float(round(max(0.0, rnd.gauss(last_feed, 10.0)), 3))
        growth = float(round(max(0.0, rnd.gauss(5.0, 2.0) * 10.0), 2))  # grams
        mortality = _clamp(rnd.random())
        four_day.append(
            FeedForecastDay(
                day=day,
                feed_kg=feed_kg,
                expected_growth_g=growth,
                mortality_risk=mortality,
            )
        )
        last_feed = feed_kg

    # now confidence based on the five output fields
    feed_fields = [
        optimal_feed_kg,
        mortality_probability,
        molting_stage,
        layer,
        four_day,
    ]
    # check non-null/non-empty (lists count as non-empty automatically as they
    # are built above)
    feed_present = 0
    for v in feed_fields:
        if v is not None and v != "":
            feed_present += 1
    confidence = round(_clamp(feed_present / len(feed_fields)), 4)

    return FeedScoreResponse(
        pond_id=pond_id,
        timestamp=ts,
        confidence=confidence,
        optimal_feed_kg=optimal_feed_kg,
        mortality_probability=mortality_probability,
        molting_stage=molting_stage,
        molting_feed_reduction_pct=molting_feed_reduction_pct,
        layer_distribution=layer,
        four_day_forecast=four_day,
    )


@router.get("/mock/pond-state/{pond_id}/stream", tags=["mock"])
async def stream_pond_state(pond_id: int):
    pond = await get_pond_by_id(pond_id)
    if pond is None:
        raise HTTPException(status_code=404, detail="Pond not found")

    # initial values
    water = _noisy_score(compute_water_score(pond))
    disease = _noisy_score(compute_disease_probability(pond))
    feed = _noisy_score(compute_feed_efficiency(pond))
    # compute a simple composite confidence using the same weights as fusion
    w_conf = _water_confidence(pond)
    # for lack of output-specific info we fall back to generic for others
    d_conf = _confidence_from_pond(pond)
    f_conf = _confidence_from_pond(pond)
    confidence = round(_clamp(w_conf * 0.30 + d_conf * 0.45 + f_conf * 0.25), 4)

    async def event_generator() -> AsyncGenerator[bytes, None]:
        nonlocal water, disease, feed
        try:
            while True:
                ts = datetime.utcnow()
                payload = {
                    "pond_id": pond_id,
                    "water_score": round(water, 4),
                    "disease_probability": round(disease, 4),
                    "feed_efficiency": round(feed, 4),
                    "confidence": round(confidence, 4),
                    "timestamp": ts.isoformat() + "Z",
                }
                # yield newline-delimited JSON
                yield (json.dumps(payload) + "\n").encode("utf-8")

                # small random drift for next tick
                water = _clamp(water + random.gauss(0.0, 0.02))
                disease = _clamp(disease + random.gauss(0.0, 0.02))
                feed = _clamp(feed + random.gauss(0.0, 0.02))

                await asyncio.sleep(5)
        except asyncio.CancelledError:
            return

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")
