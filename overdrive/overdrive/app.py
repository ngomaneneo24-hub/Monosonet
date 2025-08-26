from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging
import time
from typing import Optional, List, Dict, Any

from .config import settings
from .feature_store import FeatureStore
from .features.extractors import extract_user_features, extract_item_features
from .services.user_interests import UserInterestsService
from .services.ranking_service import OverdriveRankingService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Overdrive ML Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
feature_store = FeatureStore()
user_interests_service = UserInterestsService(base_url=settings.client_base_url)
ranking_service = OverdriveRankingService(feature_store, user_interests_service, settings.client_base_url)

start_time_monotonic = time.monotonic()

class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    version: str = "1.0.0"

class FeaturesResponse(BaseModel):
    user: dict
    items: dict

class RankingRequest(BaseModel):
    user_id: str
    candidate_items: List[Dict[str, Any]]
    limit: int = 20

class RankingResponse(BaseModel):
    user_id: str
    rankings: List[Dict[str, Any]]
    total_items: int
    ranking_method: str

@app.get("/")
async def root():
    return {"message": "Overdrive ML Service", "status": "running"}

@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    uptime = time.monotonic() - start_time_monotonic
    return HealthResponse(status="ok", uptime_seconds=uptime)

@app.get("/features/{user_id}", response_model=FeaturesResponse)
async def get_user_features(user_id: str) -> FeaturesResponse:
    """Get user features from the feature store."""
    try:
        user_features = feature_store.get_user_features(user_id)
        if not user_features:
            user_features = {}
        
        # Get some sample item features for demonstration
        item_features = {}
        # TODO: Implement item features retrieval
        
        return FeaturesResponse(user=user_features, items=item_features)
    except Exception as e:
        logger.error(f"Error fetching features for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/features/items/{item_id}")
async def get_item_features(item_id: str):
    """Get item features from the feature store."""
    try:
        features = feature_store.get_item_features(item_id)
        if features:
            return {"item_id": item_id, "features": features}
        else:
            raise HTTPException(status_code=404, detail="Item features not found")
    except Exception as e:
        logger.error(f"Error fetching features for item {item_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/rank/for-you", response_model=RankingResponse)
async def rank_for_you(request: RankingRequest, authorization: Optional[str] = Header(None)):
    """Rank items for the "For You" feed."""
    try:
        user_id = request.user_id
        candidate_items = request.candidate_items
        limit = request.limit
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not candidate_items:
            raise HTTPException(status_code=400, detail="candidate_items is required")
        
        # Extract auth token
        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization[7:]
        
        # Get rankings
        rankings = await ranking_service.rank_for_you(
            user_id=user_id,
            candidate_items=candidate_items,
            limit=limit,
            auth_token=auth_token
        )
        
        return RankingResponse(
            user_id=user_id,
            rankings=rankings,
            total_items=len(rankings),
            ranking_method="overdrive"
        )
        
    except Exception as e:
        logger.error(f"Error in rank_for_you: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/insights/{user_id}")
async def get_user_insights(user_id: str, authorization: Optional[str] = Header(None)):
    """Get insights about user's ranking preferences."""
    try:
        # Extract auth token
        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization[7:]
        
        insights = await ranking_service.get_user_insights(user_id, auth_token)
        return {"user_id": user_id, "insights": insights}
        
    except Exception as e:
        logger.error(f"Error getting insights for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/interests/{user_id}")
async def get_user_interests(user_id: str, authorization: Optional[str] = Header(None)):
    """Get user interests."""
    try:
        # Extract auth token
        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization[7:]
        
        if not auth_token:
            raise HTTPException(status_code=401, detail="Authorization required")
        
        interests = await user_interests_service.get_user_interests(user_id, auth_token)
        return {"user_id": user_id, "interests": interests}
        
    except Exception as e:
        logger.error(f"Error getting interests for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/metrics")
async def metrics() -> str:
    # Placeholder for Prometheus text format
    return "# HELP overdrive_up 1 if server is up\n# TYPE overdrive_up gauge\noverdrive_up 1\n"

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    await ranking_service.close()

def run() -> None:
    """Run the FastAPI server."""
    uvicorn.run(app, host="0.0.0.0", port=settings.service_port)