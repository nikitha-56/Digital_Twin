from fastapi import FastAPI
from sqlalchemy import text
from uuid import uuid4
from datetime import datetime

from routers import ponds, water, digital_twin, simulate, analytics, events, mock
from db.database import engine, AsyncSessionLocal
from db.models import Base, metadata
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

async def insert_sample_ponds():
    """Insert a minimal sample pond record if none exist."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text("SELECT COUNT(*) FROM ponds"))
            count = result.scalar()
            if count == 0:
                data = {
                    "id": str(uuid4()),
                    "pond_name": "Sample Pond",
                    "water_body": "lake",
                    "water_type": "fresh",
                    "pond_type": "earthen",
                    "temperature": 28.0,
                    "city": "Testville",
                    "created_at": datetime.utcnow(),
                }
                cols = ", ".join(data.keys())
                vals = ", ".join([f":{k}" for k in data.keys()])
                await session.execute(text(f"INSERT INTO ponds ({cols}) VALUES ({vals})"), data)
                await session.commit()
                print("Sample pond inserted successfully")
        except Exception as e:
            print(f"Error inserting sample ponds: {e}")
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
    
    # Insert sample data if needed
    await insert_sample_ponds()
    
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="Aquaculture Digital Twin Backend",
    version="1.0",
    lifespan=lifespan
)

# Development CORS: allow local frontend origins for preflight and requests
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(ponds.router, prefix="/api/v1", tags=["ponds"])
app.include_router(events.router, prefix="/api/v1", tags=["events"])
app.include_router(water.router)
app.include_router(digital_twin.router)
app.include_router(simulate.router)
app.include_router(analytics.router)
app.include_router(mock.router)

# Create DB tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def root():
    return {"status": "Backend is running"}
