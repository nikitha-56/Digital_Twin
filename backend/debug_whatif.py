import asyncio
from routers.digital_twin import (
    _generate_hypothetical_water_response,
    _generate_hypothetical_disease_response,
    _generate_hypothetical_feed_response,
)
from services.pond_service import get_pond_by_id

async def main():
    pond = await get_pond_by_id(1)
    print("current pond:", pond)
    hypo = dict(pond)
    hypo["stocking_density"] = 500
    w = _generate_hypothetical_water_response(hypo, 1)
    print("water resp ok")
    d = _generate_hypothetical_disease_response(hypo, 1)
    print("disease resp ok")
    f = _generate_hypothetical_feed_response(hypo, d, w, 1)
    print("feed resp ok", f)

if __name__ == "__main__":
    asyncio.run(main())
