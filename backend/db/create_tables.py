import asyncio
from db.database import engine
from db import models

async def create_all():
    async with engine.begin() as conn:
        await conn.run_sync(models.metadata.create_all)

if __name__ == '__main__':
    asyncio.run(create_all())
