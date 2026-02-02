from fastapi import FastAPI
from routers import ponds, water, digital_twin
from db.database import engine
from db.models import Base

app = FastAPI(
    title="Aquaculture Digital Twin Backend",
    version="1.0"
)

# Register routers
app.include_router(ponds.router)
app.include_router(water.router)
app.include_router(digital_twin.router)

# Create DB tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def root():
    return {"status": "Backend is running"}
