from fastapi import FastAPI

from routers import ponds, water, digital_twin
from db.database import engine
from db.models import Base
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import ponds, water, digital_twin, simulate, analytics
from db.database import engine
from db.models import metadata

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
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
app.include_router(ponds.router)
app.include_router(water.router)
app.include_router(digital_twin.router)
app.include_router(simulate.router)
app.include_router(analytics.router)

# Create DB tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def root():
    return {"status": "Backend is running"}
