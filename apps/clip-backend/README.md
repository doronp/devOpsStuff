# OpenCLIP Backend API

Backend service for semantic image search using OpenCLIP and FAISS.

## Features

- **Semantic Search**: Natural language queries for image search
- **OpenCLIP**: Vision-language model for embeddings
- **FAISS**: Fast similarity search
- **FastAPI**: Modern async REST API
- **Type-safe**: Full Python type hints

## Prerequisites

- Python 3.9+
- pip or poetry

## Installation

### Using pip

```bash
# Install production dependencies
pip install -r requirements.txt

# Or install with dev dependencies
pip install -r requirements-dev.txt

# Or install as editable package
pip install -e ".[dev]"
```

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

Key settings:
- `MODEL_NAME`: OpenCLIP model architecture (default: `ViT-B-32`)
- `DEVICE`: `cpu` or `cuda`
- `BATCH_SIZE`: Images per batch during indexing (default: `32`)

## Running

### Development

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_api.py
```

## Code Quality

```bash
# Linting
ruff check src

# Type checking
mypy src

# Format code
ruff format src
```

## Project Structure

```
apps/clip-backend/
├── src/
│   ├── models/           # OpenCLIP and FAISS wrappers
│   ├── services/         # Business logic
│   ├── schemas/          # Pydantic models
│   ├── utils/            # Utilities
│   ├── api.py            # API routes
│   ├── main.py           # FastAPI app
│   └── config.py         # Configuration
├── tests/                # Tests
├── data/                 # Data (gitignored)
│   ├── indices/         # FAISS indices
│   └── models/          # Model cache
└── scripts/             # Utility scripts
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Search
```bash
POST /search
{
  "query": "red sports car",
  "top_k": 50
}
```

### Start Indexing
```bash
POST /index/start
{
  "folders": ["/path/to/images"]
}
```

### Get Indexing Status
```bash
GET /index/status
```

## Model Download

On first run, OpenCLIP will download the model (~350 MB). This may take a few minutes.

Models are cached in `~/.cache/clip/` (Linux/macOS) or `%USERPROFILE%\.cache\clip\` (Windows).

## Performance

- **Indexing**: ~10-50 images/second on CPU
- **Search**: < 2 seconds for 10k images
- **Memory**: ~500 MB (model) + ~2 KB per indexed image

## Troubleshooting

### Model download fails
- Check internet connection
- Manually download model using `scripts/download_models.py`

### Out of memory
- Reduce `BATCH_SIZE` in `.env`
- Use smaller model (e.g., `RN50`)

### Slow indexing
- Use GPU (`DEVICE=cuda`)
- Increase `BATCH_SIZE` if RAM allows

## License

MIT
