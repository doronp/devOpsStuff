# API Design Patterns

This document covers REST API design patterns for ML backend services using FastAPI.

---

## Request/Response Models

### Using Pydantic for Validation

**Benefits**:
- Automatic request validation
- Type safety
- Auto-generated OpenAPI schema
- Clear error messages

### `schemas/requests.py`

```python
"""Request models with validation."""

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Search for images by text query."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Text query to search for"
    )
    top_k: int = Field(
        50,
        ge=1,
        le=1000,
        description="Number of results to return"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "red sports car at sunset",
                "top_k": 20
            }
        }


class IndexRequest(BaseModel):
    """Start indexing folders of images."""

    folders: list[str] = Field(
        ...,
        min_length=1,
        description="List of folder paths to index"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "folders": ["/path/to/images", "/another/path"]
            }
        }
```

### `schemas/responses.py`

```python
"""Response models."""

from pydantic import BaseModel, Field
from typing import Literal


class SearchResponse(BaseModel):
    """Single search result."""

    path: str = Field(..., description="Path to the image file")
    score: float = Field(..., ge=0, le=1, description="Similarity score")

    class Config:
        json_schema_extra = {
            "example": {
                "path": "/images/photo_001.jpg",
                "score": 0.8745
            }
        }


class IndexStatusResponse(BaseModel):
    """Indexing progress status."""

    state: Literal['idle', 'running', 'complete', 'error']
    total: int = Field(..., ge=0, description="Total images to index")
    indexed: int = Field(..., ge=0, description="Number indexed so far")
    error: str | None = Field(None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "state": "running",
                "total": 1000,
                "indexed": 450,
                "error": None
            }
        }


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal['ok', 'degraded', 'down']
    model_loaded: bool
    index_size: int = Field(..., ge=0)
    uptime_seconds: float | None = None
```

---

## Error Handling

### HTTP Status Codes

Use appropriate status codes:

- **200 OK**: Successful GET/POST
- **201 Created**: Resource created
- **400 Bad Request**: Invalid input (validation errors)
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Pydantic validation failed (auto)
- **500 Internal Server Error**: Server error

### Custom Error Responses

```python
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


# Custom exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handle Pydantic validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Catch-all for unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error"}
    )
```

### Error Handling in Endpoints

```python
from pathlib import Path
from fastapi import HTTPException, status

@router.post("/index/start")
async def start_indexing(request: IndexRequest, background_tasks: BackgroundTasks):
    try:
        # Validate input
        for folder in request.folders:
            path = Path(folder)
            if not path.exists():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Folder not found: {folder}"
                )
            if not path.is_dir():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not a directory: {folder}"
                )

        # Check if already running
        if indexing_service.is_running():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Indexing already in progress"
            )

        # Start background task
        background_tasks.add_task(
            indexing_service.index_folders,
            [Path(f) for f in request.folders]
        )

        return {"status": "started", "message": "Indexing started in background"}

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is

    except Exception as e:
        logger.error(f"Failed to start indexing: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start indexing"
        )
```

---

## Async Patterns

### Background Tasks

For short-lived tasks (< 30 seconds):

```python
from fastapi import BackgroundTasks

def send_notification(email: str, message: str):
    """Send email notification."""
    # ... send email ...
    pass

@router.post("/search")
async def search(
    request: SearchRequest,
    background_tasks: BackgroundTasks
):
    results = await search_service.search(request.query, request.top_k)

    # Send notification after response
    background_tasks.add_task(
        send_notification,
        "user@example.com",
        f"Search completed: {len(results)} results"
    )

    return results
```

### Long-Running Tasks

For long tasks (minutes/hours), use a task queue or track state:

```python
from dataclasses import dataclass
from typing import Literal
import asyncio

@dataclass
class TaskStatus:
    """Track long-running task status."""
    state: Literal['idle', 'running', 'complete', 'error']
    progress: float  # 0.0 to 1.0
    message: str
    error: str | None = None

# Global state (use Redis or similar in production)
task_status = TaskStatus('idle', 0.0, 'Not started')


async def long_running_task():
    """Example long-running task with progress tracking."""
    global task_status

    try:
        task_status = TaskStatus('running', 0.0, 'Starting...')

        # Simulate work
        for i in range(100):
            await asyncio.sleep(0.1)  # Async work
            task_status.progress = (i + 1) / 100
            task_status.message = f'Processing {i + 1}/100'

        task_status = TaskStatus('complete', 1.0, 'Done')

    except Exception as e:
        task_status = TaskStatus('error', 0.0, 'Failed', str(e))
        raise


@router.post("/task/start")
async def start_task(background_tasks: BackgroundTasks):
    if task_status.state == 'running':
        raise HTTPException(409, "Task already running")

    background_tasks.add_task(long_running_task)
    return {"status": "started"}


@router.get("/task/status")
async def get_task_status():
    return task_status
```

### Async Database Operations

```python
from typing import AsyncGenerator
import aiosqlite

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Async database connection dependency."""
    async with aiosqlite.connect("data/app.db") as db:
        yield db


@router.get("/items/{item_id}")
async def get_item(item_id: int, db: aiosqlite.Connection = Depends(get_db)):
    """Get item from database."""
    async with db.execute("SELECT * FROM items WHERE id = ?", (item_id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Item not found")
        return {"id": row[0], "name": row[1]}
```

---

## Logging

### Structured Logging

`utils/logging_config.py`:

```python
"""Logging configuration."""

import logging
import sys
from typing import Any


class StructuredFormatter(logging.Formatter):
    """Format logs as structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        from datetime import datetime

        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        return json.dumps(log_data)


def setup_logging(level: str = "INFO"):
    """Configure application logging."""

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # Use structured format in production, simple format in dev
    import os
    if os.getenv("ENV") == "production":
        formatter = StructuredFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
```

### Using Logging in Endpoints

```python
import logging

logger = logging.getLogger(__name__)


@router.post("/search")
async def search(request: SearchRequest):
    # Log request
    logger.info(
        "Search request",
        extra={"query": request.query, "top_k": request.top_k}
    )

    try:
        results = await search_service.search(request.query, request.top_k)

        # Log success
        logger.info(
            "Search completed",
            extra={"query": request.query, "result_count": len(results)}
        )

        return results

    except Exception as e:
        # Log error with full traceback
        logger.error(
            f"Search failed: {e}",
            exc_info=True,
            extra={"query": request.query}
        )
        raise HTTPException(500, "Search failed")
```

---

## Dependency Injection

### FastAPI Dependencies

```python
from fastapi import Depends
from typing import Annotated

# Dependency functions
def get_clip_model() -> ClipModel:
    """Get CLIP model instance."""
    from ..main import clip_model
    if clip_model is None:
        raise HTTPException(503, "Model not loaded")
    return clip_model


def get_index_store() -> IndexStore:
    """Get index store instance."""
    from ..main import index_store
    if index_store is None:
        raise HTTPException(503, "Index not initialized")
    return index_store


# Use in endpoints
@router.post("/search")
async def search(
    request: SearchRequest,
    clip_model: Annotated[ClipModel, Depends(get_clip_model)],
    index_store: Annotated[IndexStore, Depends(get_index_store)]
):
    # Use injected dependencies
    text_embedding = clip_model.encode_text(request.query)
    results = index_store.search(text_embedding, request.top_k)
    return results
```

---

## API Versioning

### URL Path Versioning

```python
from fastapi import APIRouter

# V1 router
router_v1 = APIRouter(prefix="/api/v1", tags=["v1"])

@router_v1.post("/search")
async def search_v1(request: SearchRequest):
    # V1 implementation
    pass


# V2 router
router_v2 = APIRouter(prefix="/api/v2", tags=["v2"])

@router_v2.post("/search")
async def search_v2(request: SearchRequestV2):
    # V2 implementation with new features
    pass


# Include both in app
app.include_router(router_v1)
app.include_router(router_v2)
```

---

## Rate Limiting

```python
from fastapi import HTTPException, Request
from datetime import datetime, timedelta
from collections import defaultdict

# Simple in-memory rate limiter (use Redis in production)
rate_limit_storage: dict[str, list[datetime]] = defaultdict(list)

def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """Rate limiting dependency."""

    async def dependency(request: Request):
        client_ip = request.client.host
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)

        # Clean old requests
        rate_limit_storage[client_ip] = [
            ts for ts in rate_limit_storage[client_ip]
            if ts > window_start
        ]

        # Check limit
        if len(rate_limit_storage[client_ip]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: {max_requests} requests per {window_seconds}s"
            )

        # Record this request
        rate_limit_storage[client_ip].append(now)

    return dependency


# Use in endpoint
@router.post("/search", dependencies=[Depends(rate_limit(max_requests=100, window_seconds=60))])
async def search(request: SearchRequest):
    # ...
    pass
```

---

## CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "https://yourdomain.com",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Health Checks

### Basic Health Check

```python
@router.get("/health")
async def health():
    return {"status": "ok"}
```

### Detailed Health Check

```python
import time
from datetime import datetime

start_time = time.time()


@router.get("/health")
async def health():
    """Detailed health check."""
    from ..main import clip_model, index_store

    health_status = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": time.time() - start_time,
        "components": {
            "model": {
                "loaded": clip_model is not None,
                "device": str(clip_model.device) if clip_model else None
            },
            "index": {
                "initialized": index_store is not None,
                "size": index_store.size() if index_store else 0
            }
        }
    }

    # Set status to degraded if any component is unhealthy
    if not clip_model or not index_store:
        health_status["status"] = "degraded"

    return health_status
```

---

## Testing API Endpoints

```python
from fastapi.testclient import TestClient
import pytest


def test_search_success(client: TestClient):
    response = client.post(
        "/search",
        json={"query": "red car", "top_k": 10}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 10
    for item in data:
        assert "path" in item
        assert "score" in item


def test_search_validation_empty_query(client: TestClient):
    response = client.post("/search", json={"query": ""})
    assert response.status_code == 422


def test_search_validation_invalid_top_k(client: TestClient):
    response = client.post("/search", json={"query": "test", "top_k": -1})
    assert response.status_code == 422


def test_health_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "degraded", "down"]
```

---

**Last Updated**: 2025-11-05
