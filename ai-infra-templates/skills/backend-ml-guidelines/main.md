# Backend ML Guidelines

**Skill Type**: Domain-specific guidance for ML/AI backend services (Python + FastAPI + OpenCLIP/PyTorch)

**When to Use This Skill**:
- Working on ML model inference services
- Implementing embedding/indexing systems
- Building REST APIs for ML backends
- Handling model loading and caching
- Managing batch processing and async operations

**Auto-Activation Triggers**:
- Editing files in backend directories (e.g., `apps/*backend*/`, `src/api/`, `src/models/`)
- Keywords: "backend", "API", "model", "embedding", "OpenCLIP", "FAISS", "FastAPI", "PyTorch", "inference"
- Intent patterns: "implement endpoint", "load model", "create API", "indexing", "search"

---

## Overview

This skill provides guidance for building ML backend services using:
- **FastAPI**: Modern Python web framework
- **OpenCLIP**: Vision-language models for image/text embeddings
- **FAISS**: Efficient similarity search
- **PyTorch**: Deep learning framework
- **Python 3.9+**: With type hints

**Key Principles**:
1. Load models once, reuse across requests
2. Handle errors gracefully with clear messages
3. Use async/await for I/O operations
4. Type everything with Python type hints
5. Log operations for debugging
6. Validate inputs thoroughly
7. Design APIs for ease of use

---

## Quick Reference

### Common Tasks

| Task | See Resource File | Key Patterns |
|------|------------------|--------------|
| Project structure | `structure.md` | Module organization, file layout |
| FastAPI endpoints | `api-design.md` | Request/response models, error handling |
| OpenCLIP integration | `openclip.md` | Model loading, embedding generation |
| FAISS indexing | `indexing.md` | Index creation, search, persistence |
| Async operations | `api-design.md` | Background tasks, progress tracking |
| Logging & monitoring | `api-design.md` | Structured logging, health checks |

### Resource Files

1. **structure.md**: Project file organization and module layout
2. **api-design.md**: REST API patterns, request/response models, error handling
3. **openclip.md**: OpenCLIP model usage, embedding generation, optimization
4. **indexing.md**: FAISS index management, search patterns, persistence

---

## Core Concepts

### Model Service Architecture

```
┌─────────────────────────────────────┐
│       FastAPI Application           │
│  - HTTP endpoints                   │
│  - Request validation               │
│  - Response serialization           │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│      Business Logic Layer           │
│  - Indexing operations              │
│  - Search operations                │
│  - Background tasks                 │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│        Model Layer                  │
│  - OpenCLIP model wrapper           │
│  - Embedding generation             │
│  - Device management (CPU/GPU)      │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│       Index Store Layer             │
│  - FAISS index management           │
│  - Metadata storage                 │
│  - Persistence (save/load)          │
└─────────────────────────────────────┘
```

### Request Flow

1. **HTTP Request** → FastAPI endpoint
2. **Validation** → Pydantic models validate input
3. **Processing** → Business logic (indexing, search)
4. **Model Inference** → OpenCLIP generates embeddings
5. **Index Operation** → FAISS search or update
6. **Response** → Serialize and return results

---

## Quick Start Example

### Minimal FastAPI + OpenCLIP Service

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import open_clip
import torch
from pathlib import Path

app = FastAPI()

# Load model on startup
model = None
preprocess = None
tokenizer = None

@app.on_event("startup")
async def load_model():
    global model, preprocess, tokenizer
    model, _, preprocess = open_clip.create_model_and_transforms(
        'ViT-B-32', pretrained='laion2b_s34b_b79k'
    )
    tokenizer = open_clip.get_tokenizer('ViT-B-32')
    model.eval()

# Request/response models
class SearchRequest(BaseModel):
    query: str
    top_k: int = 50

class SearchResult(BaseModel):
    path: str
    score: float

@app.post("/search", response_model=list[SearchResult])
async def search(request: SearchRequest):
    if model is None:
        raise HTTPException(500, "Model not loaded")

    # Generate text embedding
    text = tokenizer([request.query])
    with torch.no_grad():
        text_features = model.encode_text(text)
        text_features /= text_features.norm(dim=-1, keepdim=True)

    # Search in index (simplified)
    # ... search logic ...

    return [
        SearchResult(path="/path/to/image.jpg", score=0.95)
    ]

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}
```

---

## Development Workflow

### 1. Setting Up the Project

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install fastapi uvicorn open-clip-torch faiss-cpu torch pillow pydantic

# Run dev server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Development Cycle

1. **Define API contract**: Pydantic models for requests/responses
2. **Implement endpoint**: FastAPI route handler
3. **Add business logic**: Model inference, indexing, search
4. **Test manually**: Use `/docs` (Swagger UI) at `http://localhost:8000/docs`
5. **Add unit tests**: pytest with test client
6. **Add error handling**: Try-catch with proper HTTP status codes

### 3. Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Run specific test
pytest tests/test_api.py::test_search
```

---

## Best Practices

### Type Hints

Always use type hints:

```python
# ✅ Good
def embed_image(image_path: Path) -> np.ndarray:
    """Generate embedding for an image."""
    ...

# ❌ Bad
def embed_image(image_path):
    ...
```

### Error Handling

```python
from fastapi import HTTPException
from pathlib import Path

@app.post("/index/start")
async def start_indexing(request: IndexRequest):
    try:
        # Validate folders exist
        for folder in request.folders:
            path = Path(folder)
            if not path.exists():
                raise HTTPException(400, f"Folder not found: {folder}")
            if not path.is_dir():
                raise HTTPException(400, f"Not a directory: {folder}")

        # Start indexing (in background task)
        background_tasks.add_task(index_folders, request.folders)

        return {"status": "started"}

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Indexing failed: {e}", exc_info=True)
        raise HTTPException(500, "Internal server error")
```

### Async Operations

Use async/await for I/O-bound operations:

```python
# ✅ Good: Async file I/O
async def read_image(path: Path) -> Image.Image:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, Image.open, path)

# ❌ Bad: Blocking I/O in async function
async def read_image(path: Path) -> Image.Image:
    return Image.open(path)  # Blocks event loop
```

### Logging

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

@app.post("/search")
async def search(request: SearchRequest):
    logger.info(f"Search request: query='{request.query}', top_k={request.top_k}")

    try:
        results = perform_search(request.query, request.top_k)
        logger.info(f"Search completed: {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise
```

### Model Loading

Load models once on startup, not per request:

```python
# ✅ Good: Load on startup
@app.on_event("startup")
async def load_model():
    global model
    model = load_clip_model()

@app.post("/search")
async def search(request: SearchRequest):
    # Use pre-loaded model
    embedding = model.encode_text(request.query)
    ...

# ❌ Bad: Load per request
@app.post("/search")
async def search(request: SearchRequest):
    model = load_clip_model()  # Slow! Loads every time
    ...
```

---

## Common Patterns

### Background Task Progress Tracking

```python
from fastapi import BackgroundTasks
from dataclasses import dataclass
from typing import Literal

@dataclass
class IndexingStatus:
    state: Literal['idle', 'running', 'complete', 'error']
    total: int
    indexed: int
    error: str | None = None

# Global state (use proper state management in production)
indexing_status = IndexingStatus('idle', 0, 0)

def index_folders(folders: list[Path]):
    global indexing_status

    try:
        # Collect all images
        images = []
        for folder in folders:
            images.extend(folder.glob('**/*.jpg'))
            images.extend(folder.glob('**/*.png'))

        indexing_status = IndexingStatus('running', len(images), 0)

        # Index each image
        for i, image_path in enumerate(images):
            embed_and_add_to_index(image_path)
            indexing_status.indexed = i + 1

        indexing_status.state = 'complete'

    except Exception as e:
        indexing_status = IndexingStatus('error', 0, 0, str(e))
        logger.error(f"Indexing failed: {e}", exc_info=True)

@app.post("/index/start")
async def start_indexing(
    request: IndexRequest,
    background_tasks: BackgroundTasks
):
    if indexing_status.state == 'running':
        raise HTTPException(400, "Indexing already in progress")

    background_tasks.add_task(index_folders, [Path(f) for f in request.folders])
    return {"status": "started"}

@app.get("/index/status")
async def get_status():
    return indexing_status
```

### Batch Processing

```python
def embed_images_batch(
    image_paths: list[Path],
    batch_size: int = 32
) -> np.ndarray:
    """Process images in batches for efficiency."""
    all_embeddings = []

    for i in range(0, len(image_paths), batch_size):
        batch_paths = image_paths[i:i + batch_size]

        # Load images
        images = [Image.open(p) for p in batch_paths]

        # Preprocess
        batch = torch.stack([preprocess(img) for img in images])

        # Embed
        with torch.no_grad():
            embeddings = model.encode_image(batch)
            embeddings /= embeddings.norm(dim=-1, keepdim=True)

        all_embeddings.append(embeddings.cpu().numpy())

    return np.vstack(all_embeddings)
```

---

## Common Pitfalls

### 1. Not Using GPU When Available

```python
# ❌ Bad: Always use CPU
model = model.to('cpu')

# ✅ Good: Use GPU if available
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = model.to(device)
```

### 2. Not Normalizing Embeddings

```python
# ❌ Bad: Raw embeddings
embeddings = model.encode_text(text)

# ✅ Good: Normalized for cosine similarity
embeddings = model.encode_text(text)
embeddings /= embeddings.norm(dim=-1, keepdim=True)
```

### 3. Blocking the Event Loop

```python
# ❌ Bad: Blocking operation in async function
@app.post("/search")
async def search(request: SearchRequest):
    time.sleep(5)  # Blocks entire server!
    return results

# ✅ Good: Use asyncio.sleep or run_in_executor
@app.post("/search")
async def search(request: SearchRequest):
    await asyncio.sleep(5)  # Doesn't block
    return results
```

### 4. No Input Validation

```python
# ❌ Bad: No validation
@app.post("/search")
async def search(query: str):
    return search_index(query)

# ✅ Good: Pydantic validation
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(50, ge=1, le=1000)

@app.post("/search")
async def search(request: SearchRequest):
    return search_index(request.query, request.top_k)
```

---

## Testing

### Unit Test Example

```python
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_search_endpoint():
    response = client.post(
        "/search",
        json={"query": "red car", "top_k": 10}
    )
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert len(results) <= 10

def test_search_validation():
    # Invalid: empty query
    response = client.post("/search", json={"query": ""})
    assert response.status_code == 422
```

---

## Additional Resources

For detailed information on specific topics, see:

- **structure.md**: Project organization, file layout, dependencies
- **api-design.md**: REST API patterns, request/response models, error codes
- **openclip.md**: OpenCLIP usage, model selection, optimization tips
- **indexing.md**: FAISS index management, search algorithms, persistence

---

## Checklist for New Backend Features

Before considering a backend feature complete:

- [ ] Type hints for all function signatures
- [ ] Pydantic models for request/response validation
- [ ] Error handling with appropriate HTTP status codes
- [ ] Logging for key operations and errors
- [ ] Unit tests for endpoints (at least happy path + error cases)
- [ ] API documented in OpenAPI schema (auto-generated by FastAPI)
- [ ] Background tasks don't block the event loop
- [ ] Model loaded once on startup, not per request
- [ ] Embeddings normalized for similarity search
- [ ] Input validation prevents crashes
- [ ] Health check endpoint works

---

**Last Updated**: 2025-11-05
**Skill Version**: 1.0.0
