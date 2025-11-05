"""Response models."""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class SearchResponse(BaseModel):
    """Single search result."""

    path: str = Field(..., description="Path to the image file")
    score: float = Field(..., ge=0, le=1, description="Similarity score")

    class Config:
        json_schema_extra = {
            "example": {"path": "/images/photo_001.jpg", "score": 0.8745}
        }


class IndexStatusResponse(BaseModel):
    """Indexing progress status."""

    state: Literal["idle", "running", "complete", "error"]
    total: int = Field(..., ge=0, description="Total images to index")
    indexed: int = Field(..., ge=0, description="Number indexed so far")
    error: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "state": "running",
                "total": 1000,
                "indexed": 450,
                "error": None,
            }
        }


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal["ok", "degraded", "down"]
    model_loaded: bool
    index_size: int = Field(..., ge=0)
