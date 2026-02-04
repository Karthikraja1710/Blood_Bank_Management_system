
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db, Base
from api import search, auth, donor_analysis, smart_dispatch
import uvicorn

app = FastAPI(title="LifeLink AI Blood Bank API")

# Enable PostGIS and User tables
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(donor_analysis.router, prefix="/api")
app.include_router(smart_dispatch.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
