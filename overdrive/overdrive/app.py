from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
from .feature_store import FeatureStore
from .config import settings

app = FastAPI(title="Overdrive Admin")

start_time_monotonic = time.monotonic()
fs = FeatureStore()

class HealthResponse(BaseModel):
	status: str
	uptime_seconds: float
	version: str = "0.1.0"

class FeaturesResponse(BaseModel):
	user: dict
	items: dict

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
	uptime = time.monotonic() - start_time_monotonic
	return HealthResponse(status="ok", uptime_seconds=uptime)

@app.get("/features/{user_id}", response_model=FeaturesResponse)
async def get_features(user_id: str) -> FeaturesResponse:
	user_feats = fs.get_user_features(user_id)
	# Accept comma-separated note ids via query ?items=a,b,c later
	return FeaturesResponse(user=user_feats, items={})

@app.get("/metrics")
async def metrics() -> str:
	# Placeholder for Prometheus text format
	return "# HELP overdrive_up 1 if server is up\n# TYPE overdrive_up gauge\noverdrive_up 1\n"


def run() -> None:
	import uvicorn
	uvicorn.run(app, host="0.0.0.0", port=settings.service_port)