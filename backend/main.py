from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Digital Twin Backend Running"}
