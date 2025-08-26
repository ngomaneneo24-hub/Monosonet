from fastapi import FastAPI
from pydantic import BaseModel
import time

app = FastAPI(title="Overdrive Admin")

start_time_monotonic = time.monotonic()

class HealthResponse(BaseModel):
	status: str
	uptime_seconds: float
	version: str = "0.1.0"

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
	uptime = time.monotonic() - start_time_monotonic
	return HealthResponse(status="ok", uptime_seconds=uptime)

@app.get("/metrics")
async def metrics() -> str:
	# Placeholder for Prometheus text format
	return "# HELP overdrive_up 1 if server is up\n# TYPE overdrive_up gauge\noverdrive_up 1\n"