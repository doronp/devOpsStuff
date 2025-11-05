# Backend API Specification

## Base URL

```
http://localhost:8000
```

## Authentication

None (local-only service)

---

## Endpoints

### Health Check

#### GET /health

Check if the backend service is running and healthy.

**Request**: None

**Response**: 200 OK
```json
{
  "status": "ok",
  "model_loaded": true,
  "index_size": 12453
}
```

**Fields**:
- `status`: Service status (`"ok"` | `"degraded"` | `"down"`)
- `model_loaded`: Whether OpenCLIP model is loaded
- `index_size`: Number of images in the index

**Errors**:
- 500: Service unhealthy

---

### Search

#### POST /search

Search for images by text query.

**Request**:
```json
{
  "query": "red sports car at sunset",
  "top_k": 50
}
```

**Parameters**:
- `query` (string, required): Natural language search query (1-500 characters)
- `top_k` (integer, optional): Number of results to return (default: 50, min: 1, max: 1000)

**Response**: 200 OK
```json
[
  {
    "path": "/path/to/images/IMG_1234.jpg",
    "score": 0.8745
  },
  {
    "path": "/path/to/images/photo_567.png",
    "score": 0.8521
  }
]
```

**Fields**:
- `path` (string): Absolute path to the image file
- `score` (float): Similarity score (0.0 to 1.0, higher is more similar)

**Errors**:
- 400: Invalid request (empty query, invalid top_k)
- 422: Validation error (Pydantic)
- 500: Search failed (model error, index error)

**Example**:
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "sunset over ocean", "top_k": 10}'
```

---

### Start Indexing

#### POST /index/start

Start indexing images from specified folders.

**Request**:
```json
{
  "folders": [
    "/path/to/images",
    "/another/path/photos"
  ]
}
```

**Parameters**:
- `folders` (array of strings, required): List of folder paths to index (min length: 1)

**Response**: 200 OK
```json
{
  "status": "started",
  "message": "Indexing started in background"
}
```

**Errors**:
- 400: Folder not found or not a directory
- 409: Indexing already in progress
- 500: Failed to start indexing

**Example**:
```bash
curl -X POST http://localhost:8000/index/start \
  -H "Content-Type: application/json" \
  -d '{"folders": ["/Users/me/Pictures"]}'
```

**Notes**:
- Indexing runs in a background task
- Poll `/index/status` to monitor progress
- Supported image formats: JPEG, JPG, PNG
- Searches recursively in all subfolders

---

### Get Indexing Status

#### GET /index/status

Get current indexing progress.

**Request**: None

**Response**: 200 OK
```json
{
  "state": "running",
  "total": 1000,
  "indexed": 450,
  "error": null
}
```

**Fields**:
- `state` (string): Current state
  - `"idle"`: Not indexing
  - `"running"`: Indexing in progress
  - `"complete"`: Indexing finished successfully
  - `"error"`: Indexing failed
- `total` (integer): Total number of images to index
- `indexed` (integer): Number of images indexed so far
- `error` (string | null): Error message if state is "error"

**Example**:
```bash
curl http://localhost:8000/index/status
```

**Typical Flow**:
1. POST /index/start
2. Poll GET /index/status every 1-2 seconds
3. When state is "complete" or "error", stop polling

---

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Error message here"
}
```

For validation errors (422):

```json
{
  "detail": [
    {
      "loc": ["body", "query"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid input (e.g., folder not found) |
| 409 | Conflict | Resource conflict (e.g., indexing already running) |
| 422 | Unprocessable Entity | Pydantic validation failed |
| 500 | Internal Server Error | Server error (e.g., model crash) |
| 503 | Service Unavailable | Service not ready (e.g., model still loading) |

---

## Request/Response Examples

### Successful Search

**Request**:
```bash
POST /search
Content-Type: application/json

{
  "query": "dog playing in park",
  "top_k": 5
}
```

**Response**:
```json
HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "path": "/photos/dog_park_01.jpg",
    "score": 0.9234
  },
  {
    "path": "/photos/golden_retriever.jpg",
    "score": 0.8901
  },
  {
    "path": "/photos/puppy_grass.jpg",
    "score": 0.8567
  },
  {
    "path": "/photos/dogs_playing.jpg",
    "score": 0.8234
  },
  {
    "path": "/photos/park_scene.jpg",
    "score": 0.8102
  }
]
```

### Invalid Query

**Request**:
```bash
POST /search
Content-Type: application/json

{
  "query": "",
  "top_k": 10
}
```

**Response**:
```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "detail": [
    {
      "loc": ["body", "query"],
      "msg": "ensure this value has at least 1 character",
      "type": "value_error.any_str.min_length",
      "ctx": {"limit_value": 1}
    }
  ]
}
```

### Folder Not Found

**Request**:
```bash
POST /index/start
Content-Type: application/json

{
  "folders": ["/nonexistent/path"]
}
```

**Response**:
```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "detail": "Folder not found: /nonexistent/path"
}
```

### Indexing in Progress

**Request**:
```bash
GET /index/status
```

**Response**:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "state": "running",
  "total": 5000,
  "indexed": 2341,
  "error": null
}
```

---

## Rate Limiting

None (local-only service)

---

## CORS

Configured to allow requests from:
- `http://localhost:*` (Electron renderer)
- `file://` (if needed)

---

## OpenAPI Documentation

FastAPI automatically generates OpenAPI (Swagger) documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## Future Endpoints (Post-MVP)

### Clear Index

```
DELETE /index
```

Clear the current index and start fresh.

### Get Index Info

```
GET /index/info
```

Get detailed index information (model used, embedding dim, creation date, etc.).

### Similarity Between Images

```
POST /similarity
{
  "image1": "/path/to/img1.jpg",
  "image2": "/path/to/img2.jpg"
}
```

Compute similarity score between two images.

### Batch Search

```
POST /search/batch
{
  "queries": ["query1", "query2", "query3"],
  "top_k": 10
}
```

Search multiple queries in one request.

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
