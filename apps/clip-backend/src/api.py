"""API route handlers."""

import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from .schemas.requests import IndexRequest, SearchRequest
from .schemas.responses import HealthResponse, IndexStatusResponse, SearchResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Global service instances (initialized in main.py)
indexing_service = None
search_service = None
clip_model = None
index_store = None


@router.post("/search", response_model=List[SearchResponse])
async def search(request: SearchRequest) -> List[SearchResponse]:
    """Search for images by text query.

    Args:
        request: Search request with query and top_k

    Returns:
        List of search results

    Raises:
        HTTPException: If search fails
    """
    try:
        results = await search_service.search(
            query=request.query, top_k=request.top_k
        )
        return results
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed",
        )


@router.post("/index/start")
async def start_indexing(
    request: IndexRequest, background_tasks: BackgroundTasks
) -> dict:
    """Start indexing folders of images.

    Args:
        request: Index request with folder paths
        background_tasks: FastAPI background tasks

    Returns:
        Status message

    Raises:
        HTTPException: If validation fails or indexing already running
    """
    # Validate folders
    for folder in request.folders:
        path = Path(folder)
        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Folder not found: {folder}",
            )
        if not path.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not a directory: {folder}",
            )

    # Check if already running
    if indexing_service.is_running():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Indexing already in progress",
        )

    # Start indexing in background
    background_tasks.add_task(
        indexing_service.index_folders, [Path(f) for f in request.folders]
    )

    return {"status": "started", "message": "Indexing started in background"}


@router.get("/index/status", response_model=IndexStatusResponse)
async def get_indexing_status() -> IndexStatusResponse:
    """Get current indexing status.

    Returns:
        Indexing status with progress
    """
    status_obj = indexing_service.get_status()
    return IndexStatusResponse(
        state=status_obj.state,
        total=status_obj.total,
        indexed=status_obj.indexed,
        error=status_obj.error,
    )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint.

    Returns:
        Health status with model and index information
    """
    return HealthResponse(
        status="ok",
        model_loaded=clip_model is not None,
        index_size=index_store.size() if index_store else 0,
    )
