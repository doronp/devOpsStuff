# Project Knowledge - OpenCLIP Desktop Image Search

## Overview

**OpenCLIP Desktop** is a desktop application that enables semantic image search using natural language queries. Users can point the app at folders containing images, index them using OpenCLIP embeddings, and search using text queries like "cars crossing the lane from right to left".

## Goals

### Primary Goals

1. **Semantic Image Search**: Allow users to find images using natural language descriptions
2. **Local Processing**: All indexing and search happens locally on the user's machine
3. **Large-Scale Support**: Handle folders with 10,000+ images efficiently
4. **User-Friendly**: Simple, intuitive desktop UI

### Secondary Goals

1. **Fast Indexing**: Batch processing and GPU acceleration where available
2. **Persistent Index**: Save/load indices to avoid re-indexing
3. **Cross-Platform**: Run on Windows, macOS, and Linux (via Electron)

## Non-Goals

### Explicitly Out of Scope

1. **Cloud Service**: No cloud storage or remote indexing
2. **User Accounts**: No authentication or multi-user support
3. **Image Editing**: No built-in editing tools
4. **Video Search**: MVP focuses on images only (though extensible)
5. **Real-Time Indexing**: No automatic re-indexing when folders change (manual trigger only)
6. **Face Recognition**: No biometric features
7. **Commercial Features**: No payment processing or licensing

## Tech Stack

### Backend (Python)

- **Python 3.9+**: Core language
- **FastAPI**: REST API framework
- **OpenCLIP**: Vision-language model for embeddings
- **PyTorch**: Deep learning framework
- **FAISS**: Similarity search (CPU version for MVP)
- **Pillow**: Image processing
- **Uvicorn**: ASGI server

### Frontend (TypeScript)

- **Electron**: Desktop app framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Vitest**: Testing framework

### Development Tools

- **pnpm**: Package manager (Node.js)
- **pip/poetry**: Package manager (Python)
- **ESLint/Prettier**: TypeScript linting and formatting
- **Ruff/MyPy**: Python linting and type checking
- **pytest**: Python testing

## User Stories

### Story 1: First-Time User

**As a** photographer with 10,000 photos,
**I want to** search my photos by describing what's in them,
**So that** I can find specific images without manually browsing.

**Acceptance Criteria**:
- Can select multiple folders to index
- Indexing shows progress and completes successfully
- Can search with natural language and see relevant results

### Story 2: Power User

**As a** researcher with a large image dataset,
**I want to** quickly re-search without re-indexing,
**So that** I can iterate on my search queries efficiently.

**Acceptance Criteria**:
- Index is automatically saved and loaded on next launch
- Search returns results in < 2 seconds for precomputed embeddings
- Can clear and re-index if needed

### Story 3: Casual User

**As a** user with limited technical knowledge,
**I want to** use the app without understanding ML or embeddings,
**So that** I can benefit from the technology without complexity.

**Acceptance Criteria**:
- UI is self-explanatory (clear labels, helpful placeholders)
- Errors are shown in plain language
- No configuration needed for basic use

## Key Concepts

### Semantic Search

Unlike traditional image search (filename, metadata), semantic search understands the **meaning** of the query and the **content** of images.

**Example**:
- Query: "red sports car at sunset"
- Traditional: No matches (unless filename contains those words)
- Semantic: Finds images of red sports cars at sunset based on visual content

### Embeddings

An **embedding** is a numerical representation (vector) of an image or text that captures its semantic meaning. Images and queries are embedded into the same vector space, enabling similarity comparison.

**Properties**:
- Fixed size (e.g., 512 dimensions for ViT-B-32)
- Similar images/queries have similar embeddings
- Computed once per image (cached in index)

### CLIP Model

**CLIP** (Contrastive Language-Image Pre-training) is trained to align image and text embeddings. **OpenCLIP** is an open-source implementation.

**How it works**:
1. Image → CNN/Vision Transformer → embedding
2. Text → Tokenizer + Transformer → embedding
3. Cosine similarity between embeddings = relevance score

### FAISS Index

**FAISS** is a library for efficient similarity search. Given a query embedding, it quickly finds the k-nearest neighbor image embeddings.

**Index types**:
- **Flat (exact)**: Brute-force, perfect accuracy, slower for large datasets
- **IVF (approximate)**: Faster, slightly lower accuracy, better for > 100k images

## Architecture Principles

1. **Separation of Concerns**: UI (Electron/React), API (FastAPI), ML (OpenCLIP/FAISS)
2. **Model Loading Once**: Load OpenCLIP on startup, reuse across requests
3. **Async I/O**: Use async/await for file operations and long-running tasks
4. **Type Safety**: TypeScript in frontend, type hints in backend
5. **Error Handling**: Graceful failures with user-friendly messages
6. **Testability**: Unit tests for core logic, integration tests for API

## Performance Targets

### Indexing

- **Throughput**: 10-50 images/second (CPU), 50-200 images/second (GPU)
- **Memory**: < 4 GB RAM for 10k images
- **Feedback**: Progress updates every second

### Search

- **Latency**: < 2 seconds for 10k images (precomputed embeddings)
- **Throughput**: Handle multiple concurrent searches
- **Accuracy**: Top-50 results should be relevant

## Security & Privacy

### Local-First

- All data stays on the user's machine
- No network requests except model downloads (one-time)
- No telemetry or analytics

### File Access

- Electron's file system permissions apply
- User explicitly selects folders (no automatic scanning)
- Read-only access to images (never modified)

## Future Extensions (Post-MVP)

1. **Directional Search**: Add metadata like "left to right" motion
2. **Face Clustering**: Group images by people (optional, privacy-aware)
3. **Video Support**: Extract frames and index video content
4. **Filters**: Date ranges, file types, resolution
5. **Collections**: Save search results or manual groupings
6. **Export**: Export search results as JSON or image lists

## Constraints & Limitations

### Technical Constraints

1. **Model Size**: ViT-B-32 is ~350 MB, must be downloaded once
2. **GPU Optional**: Must work on CPU-only machines
3. **Disk Space**: Indices are ~2 KB per image (20 MB for 10k images)
4. **Image Formats**: JPEG, PNG (add more as needed)

### User Constraints

1. **Folder Size**: Practical limit ~100k images on consumer hardware
2. **Indexing Time**: May take minutes for large collections (acceptable)
3. **Query Language**: English works best (model-dependent)

## Glossary

- **Embedding**: Numerical vector representing image or text
- **CLIP**: Contrastive Language-Image Pre-training model
- **FAISS**: Facebook AI Similarity Search library
- **IPC**: Inter-Process Communication (Electron main ↔ renderer)
- **Top-K**: K most similar results (e.g., top-50)
- **Cosine Similarity**: Measure of similarity between embeddings (0-1)

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
