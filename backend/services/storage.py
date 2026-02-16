from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from db.database import AsyncSessionLocal
from db.models import Pond as DBPond, WaterReading as DBWaterReading, DiseaseLog, FeedLog, SimulationRun


async def create_pond(name: str, shape: str, area: float, depth: float):
    async with AsyncSessionLocal() as session:
        p = DBPond(name=name, shape=shape, area=area, depth=depth, created_at=datetime.utcnow())
        session.add(p)
        await session.commit()
        await session.refresh(p)
        return p


async def list_ponds() -> List[DBPond]:
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(DBPond))
        return res.scalars().all()


async def get_pond(pond_id: int) -> Optional[DBPond]:
    async with AsyncSessionLocal() as session:
        res = await session.get(DBPond, pond_id)
        return res


async def save_water_reading(pond_id: int, reading: dict):
    async with AsyncSessionLocal() as session:
        wr = DBWaterReading(pond_id=pond_id,
                            ph=reading.get('ph'),
                            do=reading.get('do'),
                            temperature=reading.get('temperature'),
                            salinity=reading.get('salinity'),
                            nh3=reading.get('nh3'),
                            timestamp=reading.get('timestamp') or datetime.utcnow())
        session.add(wr)
        await session.commit()
        await session.refresh(wr)
        return wr


async def get_latest_water(pond_id: int):
    async with AsyncSessionLocal() as session:
        q = select(DBWaterReading).where(DBWaterReading.pond_id == pond_id).order_by(DBWaterReading.timestamp.desc()).limit(1)
        res = await session.execute(q)
        return res.scalars().first()


async def get_water_history(pond_id: int, limit: int = 100):
    async with AsyncSessionLocal() as session:
        q = select(DBWaterReading).where(DBWaterReading.pond_id == pond_id).order_by(DBWaterReading.timestamp.desc()).limit(limit)
        res = await session.execute(q)
        return res.scalars().all()


async def log_disease(pond_id: int, predictions: dict, overall: str):
    async with AsyncSessionLocal() as session:
        dl = DiseaseLog(pond_id=pond_id, predictions=predictions, overall=overall, created_at=datetime.utcnow())
        session.add(dl)
        await session.commit()
        await session.refresh(dl)
        return dl


async def save_simulation(pond_id: int, params: dict, results: dict):
    async with AsyncSessionLocal() as session:
        s = SimulationRun(pond_id=pond_id, params=params, results=results, created_at=datetime.utcnow())
        session.add(s)
        await session.commit()
        await session.refresh(s)
        return s

