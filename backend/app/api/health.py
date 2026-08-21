import time
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "VaaniRAG"
    version: str = "1.0.0"
    event: str = "HH Goa 2026 Shortlisting Task 2"
    timestamp: float


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Health check endpoint verifying that the backend service is active.
    """
    return HealthResponse(
        status="healthy",
        service="VaaniRAG",
        version="1.0.0",
        event="HH Goa 2026 Shortlisting Task 2",
        timestamp=time.time(),
    )
