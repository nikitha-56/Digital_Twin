from fastapi import FastAPI
from routers import ponds, water, digital_twin

app = FastAPI(
    title="Aquaculture Digital Twin Backend",
    version="1.0"
)

app.include_router(ponds.router)
app.include_router(water.router)
app.include_router(digital_twin.router)


@app.get("/")
def root():
    return {"status": "Backend is running"}
