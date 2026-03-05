from typing import List

from fastapi import APIRouter, HTTPException, Query
import httpx

from config import EXTERNAL_API_URL
from models.schemas import EventResponse

router = APIRouter()


@router.get(
    "/events/", 
    response_model=List[EventResponse],
    tags=["events"],
)
async def get_events(limit: int = Query(100), offset: int = Query(0)):
    """Proxy endpoint for external `/api/v1/events/`.

    Accepts `limit` and `offset` query parameters and forwards the request
    to the configured external API using httpx.AsyncClient. The JSON response
    is returned verbatim to the caller.
    """
    url = f"{EXTERNAL_API_URL}/api/v1/events/"
    params = {"limit": limit, "offset": offset}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers={"accept": "application/json"})
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        # propagate status code and body
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)

    return response.json()
