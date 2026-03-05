from typing import Optional, Dict, Any, Union
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AsyncSessionLocal


async def get_pond_by_id(pond_id: Union[int, str]) -> Optional[Dict[str, Any]]:
    """Fetch pond from local database.

    If the identifier is an integer, treat it as a 1-based sequential index
    ordered by creation time (for compatibility with mock endpoints).
    Otherwise assume a UUID string.

    Returns None if pond not found.
    """
    try:
        async with AsyncSessionLocal() as session:
            if isinstance(pond_id, int):
                # fetch all ids in creation order and pick by index
                result = await session.execute(
                    text("SELECT id FROM ponds ORDER BY created_at")
                )
                rows = result.fetchall()
                if 1 <= pond_id <= len(rows):
                    target_id = rows[pond_id - 1][0]
                else:
                    return None
                result = await session.execute(
                    text("SELECT * FROM ponds WHERE id = :pid"),
                    {"pid": target_id},
                )
            else:
                result = await session.execute(
                    text("SELECT * FROM ponds WHERE id = :pond_id"),
                    {"pond_id": pond_id},
                )
            pond_row = result.fetchone()
            if pond_row:
                columns = result.keys()
                return dict(zip(columns, pond_row))
            return None
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Database error: {str(e)}")




# scoring logic helpers

def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def compute_water_score(pond: Dict[str, Any]) -> float:
    """Compute water score between 0 and 1 based on pond parameters."""
    score = 0.0
    temp = pond.get("temperature")
    if temp is not None and 26 <= temp <= 30:
        score += 0.2
    tds = pond.get("tds")
    if tds is not None and 3000 <= tds <= 5000:
        score += 0.15
    orp = pond.get("orp")
    if orp is not None and orp > 300:
        score += 0.2
    turb = pond.get("turbidity")
    if turb is not None and turb < 50:
        score += 0.15
    nitrate = pond.get("nitrate")
    if nitrate is not None and nitrate < 50:
        score += 0.15
    humidity = pond.get("humidity")
    if humidity is not None and 60 <= humidity <= 80:
        score += 0.15

    return _clamp(score)


def compute_disease_probability(pond: Dict[str, Any]) -> float:
    """Return disease probability between 0 and 1."""
    prob = 0.2
    sd = pond.get("stocking_density")
    if sd is not None and sd > 300:
        prob += 0.2
    nitrate = pond.get("nitrate")
    if nitrate is not None and nitrate > 50:
        prob += 0.2
    turb = pond.get("turbidity")
    if turb is not None and turb > 80:
        prob += 0.2
    stage = pond.get("shrimp_stage")
    if stage == "juvenile":
        prob += 0.1
    temp = pond.get("temperature")
    if temp is not None and not (25 <= temp <= 32):
        prob += 0.1
    return _clamp(prob)


def compute_feed_efficiency(pond: Dict[str, Any]) -> float:
    """Return feed efficiency between 0 and 1."""
    eff = 0.3
    temp = pond.get("temperature")
    if temp is not None and 26 <= temp <= 30:
        eff += 0.2
    shrimp_size = pond.get("shrimp_size")
    if shrimp_size is not None and 10 <= shrimp_size <= 30:
        eff += 0.2
    sd = pond.get("stocking_density")
    if sd is not None and sd < 400:
        eff += 0.15
    depth = pond.get("pond_depth")
    if depth is not None and 1 <= depth <= 2:
        eff += 0.1
    feed_type = pond.get("feed_type")
    if feed_type:
        eff += 0.05
    return _clamp(eff)
