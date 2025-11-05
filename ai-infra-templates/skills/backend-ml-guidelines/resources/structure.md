# Backend ML Service Structure

This document covers project organization for Python ML backend services using FastAPI + OpenCLIP + FAISS.

---

## Recommended Project Structure

```
apps/clip-backend/
├── src/
│   ├── main.py                  # FastAPI app entry point
│   ├── api.py                   # API route handlers
│   ├── models/
│   │   ├── __init__.py
│   │   ├── clip_model.py        # OpenCLIP wrapper
│   │   └── index_store.py       # FAISS index management
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── requests.py          # Pydantic request models
│   │   └── responses.py         # Pydantic response models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── indexing.py          # Indexing business logic
│   │   └── search.py            # Search business logic
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logging_config.py
│   │   └── file_utils.py
│   └── config.py                # Configuration settings
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures
│   ├── test_api.py
│   ├── test_clip_model.py
│   └── test_index_store.py
│
├── data/                        # Data directory (gitignored)
│   ├── models/                  # Downloaded model weights
│   ├── indices/                 # Saved FAISS indices
│   └── test/                    # Test images
│
├── scripts/
│   ├── download_models.py       # Download model weights
│   └── benchmark.py             # Performance benchmarking
│
├── pyproject.toml               # Modern Python packaging
├── requirements.txt             # Or use pyproject.toml
├── .env.example                 # Environment variables template
├── .gitignore
└── README.md
```

---

## File Naming Conventions

- **Modules**: `snake_case.py` (e.g., `clip_model.py`, `index_store.py`)
- **Classes**: `PascalCase` (e.g., `ClipModel`, `IndexStore`)
- **Functions**: `snake_case` (e.g., `embed_image`, `search_index`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MODEL_NAME`, `DEVICE`)

---

## Dependencies

### Core Requirements

`requirements.txt` or `pyproject.toml`:

```txt
# Web framework
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6  # For file uploads

# ML/AI
torch>=2.1.0
open-clip-torch>=2.23.0
pillow>=10.0.0

# Index & search
faiss-cpu>=1.7.4  # or faiss-gpu for GPU support
numpy>=1.24.0

# Data validation
pydantic>=2.0.0
pydantic-settings>=2.0.0  # For config from env

# Dev tools
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
httpx>=0.25.0  # For TestClient

# Optional but recommended
python-dotenv>=1.0.0  # Load .env files
```

### Using pyproject.toml (Recommended)

```toml
[project]
name = "clip-backend"
version = "0.1.0"
requires-python = ">=3.9"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "torch>=2.1.0",
    "open-clip-torch>=2.23.0",
    "pillow>=10.0.0",
    "faiss-cpu>=1.7.4",
    "numpy>=1.24.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.25.0",
    "ruff>=0.1.0",
    "mypy>=1.7.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
asyncio_mode = "auto"

[tool.ruff]
line-length = 100
target-version = "py39"

[tool.mypy]
python_version = "3.9"
strict = true
```

---

## Module Organization

### `src/main.py` - Application Entry Point

```python
"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .config import settings
from .models.clip_model import ClipModel
from .models.index_store import IndexStore
from .utils.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Global state (in production, use dependency injection)
clip_model: ClipModel | None = None
index_store: IndexStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown."""
    global clip_model, index_store

    # Startup
    logger.info("Loading models...")
    clip_model = ClipModel(
        model_name=settings.model_name,
        device=settings.device
    )
    index_store = IndexStore()
    logger.info("Models loaded successfully")

    yield

    # Shutdown
    logger.info("Shutting down...")
    if index_store:
        index_store.save()


app = FastAPI(
    title="OpenCLIP Image Search API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
async def root():
    return {"message": "OpenCLIP Image Search API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
```

### `src/config.py` - Configuration

```python
"""Application configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Model
    model_name: str = "ViT-B-32"
    model_pretrained: str = "laion2b_s34b_b79k"
    device: str = "cuda"  # or "cpu"

    # Indexing
    batch_size: int = 32
    index_save_path: str = "data/indices/clip_index.faiss"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
```

### `src/api.py` - API Routes

```python
"""API route handlers."""

import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pathlib import Path

from .schemas.requests import SearchRequest, IndexRequest
from .schemas.responses import SearchResponse, IndexStatusResponse
from .services.indexing import indexing_service
from .services.search import search_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/search", response_model=list[SearchResponse])
async def search(request: SearchRequest):
    """Search for images by text query."""
    try:
        results = await search_service.search(
            query=request.query,
            top_k=request.top_k
        )
        return results
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(500, "Search failed")


@router.post("/index/start")
async def start_indexing(
    request: IndexRequest,
    background_tasks: BackgroundTasks
):
    """Start indexing folders of images."""
    # Validate folders
    for folder in request.folders:
        path = Path(folder)
        if not path.exists():
            raise HTTPException(400, f"Folder not found: {folder}")
        if not path.is_dir():
            raise HTTPException(400, f"Not a directory: {folder}")

    # Start indexing in background
    background_tasks.add_task(
        indexing_service.index_folders,
        [Path(f) for f in request.folders]
    )

    return {"status": "started"}


@router.get("/index/status", response_model=IndexStatusResponse)
async def get_indexing_status():
    """Get current indexing status."""
    return indexing_service.get_status()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    from ..main import clip_model, index_store

    return {
        "status": "ok",
        "model_loaded": clip_model is not None,
        "index_size": index_store.size() if index_store else 0
    }
```

---

## Testing Structure

### `tests/conftest.py` - Shared Fixtures

```python
"""Pytest configuration and fixtures."""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from src.main import app
from src.models.clip_model import ClipModel
from src.models.index_store import IndexStore


@pytest.fixture
def client():
    """Test client for API requests."""
    return TestClient(app)


@pytest.fixture
def clip_model():
    """Test CLIP model instance."""
    return ClipModel(model_name="ViT-B-32", device="cpu")


@pytest.fixture
def index_store(tmp_path):
    """Test index store with temporary storage."""
    return IndexStore(save_path=tmp_path / "test_index.faiss")


@pytest.fixture
def test_images(tmp_path):
    """Create temporary test images."""
    from PIL import Image
    import numpy as np

    images = []
    for i in range(5):
        img = Image.fromarray(
            np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        )
        path = tmp_path / f"test_image_{i}.jpg"
        img.save(path)
        images.append(path)

    return images
```

### `tests/test_api.py` - API Tests

```python
"""Tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"


def test_search_endpoint(client: TestClient):
    response = client.post(
        "/search",
        json={"query": "red car", "top_k": 10}
    )
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)


def test_search_validation(client: TestClient):
    # Empty query should fail
    response = client.post("/search", json={"query": ""})
    assert response.status_code == 422

    # Invalid top_k should fail
    response = client.post("/search", json={"query": "test", "top_k": -1})
    assert response.status_code == 422
```

---

## Scripts

### `scripts/download_models.py`

```python
"""Download OpenCLIP models for offline use."""

import open_clip
import torch

MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"

def main():
    print(f"Downloading {MODEL_NAME} ({PRETRAINED})...")

    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME,
        pretrained=PRETRAINED
    )

    print("Model downloaded successfully")
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")


if __name__ == "__main__":
    main()
```

---

## Running the Service

### Development

```bash
# Install dependencies
pip install -e ".[dev]"

# Run with auto-reload
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Or use the main.py
python -m src.main
```

### Production

```bash
# Install production dependencies only
pip install .

# Run with multiple workers
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY src/ ./src/
COPY pyproject.toml .

# Create data directories
RUN mkdir -p data/models data/indices

# Run
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Environment Variables

### `.env.example`

```bash
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=False

# Model
MODEL_NAME=ViT-B-32
MODEL_PRETRAINED=laion2b_s34b_b79k
DEVICE=cuda  # or cpu

# Indexing
BATCH_SIZE=32
INDEX_SAVE_PATH=data/indices/clip_index.faiss

# Logging
LOG_LEVEL=INFO
```

---

## Linting & Type Checking

### Using Ruff (Fast Linter/Formatter)

```bash
# Lint
ruff check src/ tests/

# Format
ruff format src/ tests/
```

### Using MyPy (Type Checker)

```bash
mypy src/
```

---

**Last Updated**: 2025-11-05
