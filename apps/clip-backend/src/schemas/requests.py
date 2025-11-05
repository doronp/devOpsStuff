"""Request models with validation."""

from typing import List
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Search for images by text query."""

    query: str = Field(
        ..., min_length=1, max_length=500, description="Text query to search for"
    )
    top_k: int = Field(
        50, ge=1, le=1000, description="Number of results to return"
    )

    class Config:
        json_schema_extra = {
            "example": {"query": "red sports car at sunset", "top_k": 20}
        }


class IndexRequest(BaseModel):
    """Start indexing folders of images."""

    folders: List[str] = Field(
        ..., min_length=1, description="List of folder paths to index"
    )

    class Config:
        json_schema_extra = {
            "example": {"folders": ["/path/to/images", "/another/path"]}
        }
