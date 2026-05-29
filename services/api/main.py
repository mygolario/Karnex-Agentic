from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import os
import sys

# Ensure the workspace root is in sys.path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)

import traceback

try:
    from services.shared.config import settings
    from services.api.routes.agents import router as agents_router
    from services.api.routes.founders import router as founders_router
    from services.api.routes.campaigns import router as campaigns_router
    from services.api.middleware.rate_limit import RateLimitMiddleware
except Exception as e:
    print(f"FATAL: Import failed during startup: {e}", flush=True)
    traceback.print_exc()
    raise

print("INFO: Karnex API starting up...", flush=True)

try:
    app = FastAPI(
        title="Karnex Agent Service API",
        description="Internal FastAPI microservice managing AI agent runs and persistency.",
        version="1.0.0"
    )
except Exception as e:
    print(f"FATAL: Failed to create app: {e}", flush=True)
    raise

# Parse CORS origins from shared settings config
allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:3000"]

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Mount agent routers
app.include_router(agents_router)
app.include_router(founders_router)
app.include_router(campaigns_router)


class HealthStatus(BaseModel):
    status: str
    version: str


@app.get("/v1/health", response_model=HealthStatus, tags=["Health"])
async def health_check():
    """Health check endpoint to ensure agent service is operational."""
    return HealthStatus(status="healthy", version="1.0.0")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("services.api.main:app", host="0.0.0.0", port=port, reload=True)
