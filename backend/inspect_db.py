import asyncio
from db.database import AsyncSessionLocal
from sqlalchemy import text

async def inspect():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, pond_name FROM ponds"))
        for row in res.fetchall():
            print(row)

def main():
    asyncio.run(inspect())

if __name__ == '__main__':
    main()
