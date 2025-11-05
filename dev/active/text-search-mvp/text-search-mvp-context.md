# Text Search MVP - Context

## Key Files

### Backend (apps/clip-backend/)

**Core Implementation**:
- `src/main.py` - FastAPI app entry point, startup/shutdown handlers
- `src/api.py` - API route handlers (/search, /index/start, /index/status, /health)
- `src/config.py` - Configuration settings (model name, device, paths)

**Models Layer**:
- `src/models/clip_model.py` - OpenCLIP wrapper (load model, embed images/text)
- `src/models/index_store.py` - FAISS index wrapper (add, search, save/load)

**Services Layer**:
- `src/services/indexing.py` - Indexing business logic (scan folders, batch process)
- `src/services/search.py` - Search business logic (query → results)

**Schemas**:
- `src/schemas/requests.py` - Pydantic request models (SearchRequest, IndexRequest)
- `src/schemas/responses.py` - Pydantic response models (SearchResponse, IndexStatusResponse)

**Configuration**:
- `pyproject.toml` - Python project config, dependencies
- `requirements.txt` - Alternative dependency list
- `.env.example` - Environment variables template

**Tests**:
- `tests/conftest.py` - Pytest fixtures
- `tests/test_api.py` - API endpoint tests
- `tests/test_clip_model.py` - Model wrapper tests
- `tests/test_index_store.py` - Index store tests

### Frontend (apps/desktop-ui/)

**Electron Main Process**:
- `electron/main.ts` - Main process entry point, window creation
- `electron/preload.ts` - IPC bridge (expose safe APIs to renderer)

**React Application**:
- `src/main.tsx` - React entry point
- `src/App.tsx` - Root component, routing/navigation

**Screens**:
- `src/screens/FolderSelectionScreen.tsx` - Select folders to index
- `src/screens/IndexingStatusScreen.tsx` - Show indexing progress
- `src/screens/SearchScreen.tsx` - Search and view results

**Components**:
- `src/components/search/SearchBar.tsx` - Text input for queries
- `src/components/search/ResultsGrid.tsx` - Grid of result cards
- `src/components/search/ResultCard.tsx` - Individual result thumbnail
- `src/components/indexing/ProgressBar.tsx` - Indexing progress indicator
- `src/components/common/Spinner.tsx` - Loading spinner
- `src/components/common/ErrorMessage.tsx` - Error display

**API Client**:
- `src/api/client.ts` - HTTP client for backend API
- `src/api/types.ts` - TypeScript types for requests/responses
- `src/api/errors.ts` - Custom error classes

**Hooks**:
- `src/hooks/useSearch.ts` - Search state management
- `src/hooks/useIndexing.ts` - Indexing status polling

**Types**:
- `src/types/electron.d.ts` - Electron API type definitions

**Configuration**:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config for renderer
- `tsconfig.node.json` - TypeScript config for main process
- `vite.config.ts` - Vite build config
- `electron-builder.json` - Electron packaging config

**Tests**:
- `tests/unit/SearchBar.test.tsx` - Component tests
- `tests/integration/api-client.test.ts` - API client tests

### Shared/Root

- `docs/PROJECT_KNOWLEDGE.md` - Reference for goals and constraints
- `docs/ARCHITECTURE.md` - Reference for system design
- `docs/API_BACKEND.md` - API contract (backend ↔ frontend)
- `docs/UI_FLOWS.md` - UI screen flows

---

## Dependencies

### Backend Python Dependencies

**Core**:
- `python>=3.9` - Language runtime
- `fastapi>=0.104.0` - Web framework
- `uvicorn[standard]>=0.24.0` - ASGI server
- `pydantic>=2.0.0` - Data validation
- `pydantic-settings>=2.0.0` - Config from environment

**ML/AI**:
- `torch>=2.1.0` - Deep learning framework
- `open-clip-torch>=2.23.0` - OpenCLIP model
- `pillow>=10.0.0` - Image loading
- `numpy>=1.24.0` - Numerical operations

**Search**:
- `faiss-cpu>=1.7.4` - Similarity search

**Dev**:
- `pytest>=7.4.0` - Testing framework
- `pytest-asyncio>=0.21.0` - Async test support
- `httpx>=0.25.0` - For TestClient
- `ruff>=0.1.0` - Linting
- `mypy>=1.7.0` - Type checking

### Frontend Node Dependencies

**Core**:
- `electron>=27.0.0` - Desktop framework
- `react>=18.2.0` - UI library
- `react-dom>=18.2.0` - React DOM renderer
- `typescript>=5.0.0` - Type safety

**Build Tools**:
- `vite>=5.0.0` - Build tool
- `@vitejs/plugin-react>=4.0.0` - Vite React plugin
- `electron-builder>=24.0.0` - Packaging

**Dev Tools**:
- `vitest>=1.0.0` - Testing
- `@testing-library/react>=14.0.0` - Component testing
- `eslint>=8.0.0` - Linting
- `prettier>=3.0.0` - Code formatting (optional)

---

## External Dependencies

### Models

**OpenCLIP ViT-B-32**:
- **Size**: ~350 MB
- **Download**: Automatic on first run via `open_clip.create_model_and_transforms()`
- **Cache**: `~/.cache/clip/` (Linux/macOS) or `%USERPROFILE%\.cache\clip\` (Windows)
- **Fallback**: Manual download if needed

### System Requirements

**Minimum**:
- 4 GB RAM
- 2 GB disk space (model + index)
- CPU: Any x64
- OS: Linux, macOS, or Windows

**Recommended**:
- 8 GB RAM
- 5 GB disk space
- GPU: NVIDIA GPU with CUDA (optional, faster)
- SSD for index storage

---

## Constraints

### Technical Constraints

1. **Python Version**: Must be 3.9+ (for type hints and async features)
2. **Node Version**: Recommend 18+ (for Vite and modern JS features)
3. **PyTorch**: CPU-only for MVP (GPU support later)
4. **FAISS**: Flat index only (no IVF or GPU for MVP)
5. **Image Formats**: JPEG, PNG (pillow defaults)

### Performance Constraints

1. **Indexing Speed**: ~10-50 images/second on CPU
2. **Search Latency**: < 2 seconds for 10k images
3. **Memory Usage**: < 4 GB total (model + index + overhead)
4. **Batch Size**: 32 images (tuned for typical RAM)

### UI/UX Constraints

1. **Polling Interval**: 1-2 seconds for indexing status
2. **Max Results**: 50 (can increase later)
3. **Thumbnail Size**: 200x200px (balance quality vs load time)
4. **Grid Columns**: 4 (responsive: 2-4 based on window width)

### Security Constraints

1. **File Access**: Read-only to user-selected folders
2. **Network**: Localhost only (no external requests except model download)
3. **Electron**: Context isolation enabled, nodeIntegration disabled
4. **IPC**: Only whitelisted channels exposed via preload

---

## Development Environment Setup

### Backend

```bash
cd apps/clip-backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -e ".[dev]"
```

### Frontend

```bash
cd apps/desktop-ui
pnpm install
```

### Running

**Backend**:
```bash
cd apps/clip-backend
uvicorn src.main:app --reload --port 8000
```

**Frontend (dev)**:
```bash
cd apps/desktop-ui
pnpm dev          # Terminal 1: Vite dev server
pnpm electron:dev # Terminal 2: Electron
```

---

## Integration Points

### Backend → Frontend

**API Contract**: See `docs/API_BACKEND.md`

Key integration:
- POST /search: Query → Results
- POST /index/start: Folders → Start indexing
- GET /index/status: Get progress

### Frontend → OS

**IPC Channels**:
- `select-folders`: Open native folder picker
- `open-path`: Open image in OS viewer

### Data Storage

**Index Persistence**:
- **Location**: `apps/clip-backend/data/indices/`
- **Files**: `clip_index.faiss` + `clip_index.pkl`
- **Lifecycle**: Created on first index, loaded on startup

---

## Common Gotchas

1. **Backend not running**: Frontend will show connection errors
   - Solution: Always start backend before frontend in dev

2. **Model download timeout**: First run downloads 350 MB
   - Solution: Be patient, or pre-download model

3. **Port conflicts**: Backend defaults to 8000
   - Solution: Check if port is free, or configure different port

4. **Path separators**: Windows uses backslashes
   - Solution: Use `Path` objects in Python, normalize in TypeScript

5. **CORS errors**: Backend must allow localhost
   - Solution: FastAPI CORS middleware configured for `http://localhost:*`

6. **Embedding dimension mismatch**: FAISS index must match model
   - Solution: Clear index if changing models

---

## Testing Strategy

### Backend

**Unit Tests**: `pytest`
- Model wrapper (mocked PyTorch)
- Index store (mocked FAISS)
- Services (mocked dependencies)

**Integration Tests**: `pytest` with TestClient
- API endpoints with real model and index
- Use small test dataset (10-20 images)

### Frontend

**Unit Tests**: `vitest`
- Components (mocked API)
- Hooks (mocked fetch)

**E2E Tests** (manual for MVP):
- Select folders → Index → Search → View results

---

**Last Updated**: 2025-11-05
**Status**: Context documented, ready for implementation
