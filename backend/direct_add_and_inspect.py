import httpx, json

base='http://127.0.0.1:8000'
r=httpx.post(base+'/api/v1/pond/add',json={'pond_name':'Direct'})
print('create',r.status_code,r.text)
import asyncio
from db.database import AsyncSessionLocal
from sqlalchemy import text

async def inspect():
    async with AsyncSessionLocal() as session:
        res=await session.execute(text('SELECT id, pond_name FROM ponds'))
        print(res.fetchall())
asyncio.run(inspect())
