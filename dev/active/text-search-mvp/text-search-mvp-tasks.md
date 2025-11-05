# Text Search MVP - Tasks

## Backend Implementation

### Project Setup

- [ ] Create `apps/clip-backend/` directory structure
- [ ] Create `pyproject.toml` with dependencies
- [ ] Create `requirements.txt` as alternative
- [ ] Create `.env.example` with config template
- [ ] Create `.gitignore` for Python (venv, __pycache__, data/)
- [ ] Create `README.md` for backend

### Configuration

- [ ] Implement `src/config.py` with Settings class
- [ ] Add env var loading (model name, device, paths)
- [ ] Add logging configuration in `src/utils/logging_config.py`

### Model Layer

- [ ] Implement `src/models/__init__.py`
- [ ] Implement `src/models/clip_model.py`:
  - [ ] `ClipModel.__init__()` - load model on startup
  - [ ] `encode_image()` - single image embedding
  - [ ] `encode_images_batch()` - batch processing
  - [ ] `encode_text()` - text query embedding
  - [ ] Device detection (CPU/GPU)
  - [ ] Error handling for model loading

- [ ] Implement `src/models/index_store.py`:
  - [ ] `IndexStore.__init__()` - create FAISS index
  - [ ] `add()` - add single embedding
  - [ ] `add_batch()` - add multiple embeddings
  - [ ] `search()` - k-NN search
  - [ ] `save()` - persist to disk
  - [ ] `load()` - load from disk
  - [ ] `size()` - get item count
  - [ ] Metadata management (ID → path mapping)

### Schemas

- [ ] Implement `src/schemas/__init__.py`
- [ ] Implement `src/schemas/requests.py`:
  - [ ] `SearchRequest` model (query, top_k)
  - [ ] `IndexRequest` model (folders list)
  - [ ] Validation constraints

- [ ] Implement `src/schemas/responses.py`:
  - [ ] `SearchResponse` model (path, score)
  - [ ] `IndexStatusResponse` model (state, total, indexed, error)
  - [ ] `HealthResponse` model

### Services

- [ ] Implement `src/services/__init__.py`
- [ ] Implement `src/services/indexing.py`:
  - [ ] `IndexingService` class
  - [ ] `index_folders()` - main indexing logic
  - [ ] Folder scanning (glob for .jpg, .png)
  - [ ] Batch processing loop
  - [ ] Progress tracking
  - [ ] Error handling per image
  - [ ] Save index on completion

- [ ] Implement `src/services/search.py`:
  - [ ] `SearchService` class
  - [ ] `search()` - query to results
  - [ ] Result formatting

### API

- [ ] Implement `src/api.py`:
  - [ ] `POST /search` endpoint
  - [ ] `POST /index/start` endpoint
  - [ ] `GET /index/status` endpoint
  - [ ] `GET /health` endpoint
  - [ ] Input validation
  - [ ] Error handling (try-except)
  - [ ] HTTP status codes

- [ ] Implement `src/main.py`:
  - [ ] FastAPI app creation
  - [ ] Lifespan context manager (startup/shutdown)
  - [ ] Model loading on startup
  - [ ] Index loading on startup
  - [ ] CORS middleware
  - [ ] Include router from api.py

### Tests

- [ ] Create `tests/conftest.py` with fixtures:
  - [ ] `clip_model` fixture
  - [ ] `index_store` fixture
  - [ ] `test_images` fixture (generate random images)
  - [ ] `client` fixture (TestClient)

- [ ] Implement `tests/test_clip_model.py`:
  - [ ] Test `encode_text()` returns correct shape
  - [ ] Test `encode_image()` returns correct shape
  - [ ] Test `encode_images_batch()` processes multiple images
  - [ ] Test embeddings are normalized

- [ ] Implement `tests/test_index_store.py`:
  - [ ] Test `add()` increases size
  - [ ] Test `search()` returns most similar
  - [ ] Test `save()` and `load()` preserve data
  - [ ] Test `add_batch()` handles duplicates

- [ ] Implement `tests/test_api.py`:
  - [ ] Test `GET /health` returns 200
  - [ ] Test `POST /search` with valid query
  - [ ] Test `POST /search` with invalid query (422)
  - [ ] Test `POST /index/start` with valid folders
  - [ ] Test `POST /index/start` with invalid folders (400)
  - [ ] Test `GET /index/status` returns status

### Data & Scripts

- [ ] Create `data/indices/` directory (gitignored)
- [ ] Create `data/models/` directory (gitignored)
- [ ] Create `scripts/download_models.py` (pre-download model)
- [ ] Create `scripts/benchmark.py` (optional, for testing performance)

---

## Frontend Implementation

### Project Setup

- [ ] Create `apps/desktop-ui/` directory structure
- [ ] Create `package.json` with dependencies
- [ ] Create `tsconfig.json` (renderer)
- [ ] Create `tsconfig.node.json` (main process)
- [ ] Create `vite.config.ts`
- [ ] Create `vitest.config.ts`
- [ ] Create `electron-builder.json`
- [ ] Create `.gitignore` for Node (node_modules/, dist/)
- [ ] Create `README.md` for frontend

### Electron Main Process

- [ ] Implement `electron/main.ts`:
  - [ ] Create `BrowserWindow` with proper config
  - [ ] Load renderer (dev: localhost:3000, prod: dist/index.html)
  - [ ] Window lifecycle (ready, all-closed, activate)
  - [ ] Open DevTools in development

- [ ] Implement `electron/preload.ts`:
  - [ ] Expose `selectFolders()` via IPC
  - [ ] Expose `openPath()` via IPC
  - [ ] Type-safe API using contextBridge

### Type Definitions

- [ ] Implement `src/types/electron.d.ts`:
  - [ ] `ElectronAPI` interface
  - [ ] `window.electron` global type

### API Client

- [ ] Implement `src/api/client.ts`:
  - [ ] `ApiClient` class with base URL
  - [ ] `search()` method
  - [ ] `startIndexing()` method
  - [ ] `getIndexingStatus()` method
  - [ ] `checkHealth()` method
  - [ ] Error handling and retry logic
  - [ ] Timeout handling

- [ ] Implement `src/api/types.ts`:
  - [ ] `SearchResult` interface
  - [ ] `IndexStatus` interface
  - [ ] `SearchRequest` interface
  - [ ] `IndexRequest` interface

- [ ] Implement `src/api/errors.ts`:
  - [ ] `ApiError` class
  - [ ] Helper methods (isNetworkError, etc.)

### Custom Hooks

- [ ] Implement `src/hooks/useSearch.ts`:
  - [ ] State: results, isLoading, error
  - [ ] `search()` function
  - [ ] `clear()` function

- [ ] Implement `src/hooks/useIndexing.ts`:
  - [ ] State: status (state, total, indexed)
  - [ ] Poll `/index/status` every 1-2 seconds
  - [ ] Stop polling when complete/error
  - [ ] `startIndexing()` function

### Components - Common

- [ ] Implement `src/components/common/Spinner.tsx`:
  - [ ] Spinning loader with configurable size

- [ ] Implement `src/components/common/ErrorMessage.tsx`:
  - [ ] Display error with optional retry button

- [ ] Implement `src/components/common/Button.tsx`:
  - [ ] Reusable button with variants

### Components - Indexing

- [ ] Implement `src/components/indexing/ProgressBar.tsx`:
  - [ ] Visual progress bar (0-100%)
  - [ ] Show current/total text

### Components - Search

- [ ] Implement `src/components/search/SearchBar.tsx`:
  - [ ] Text input with state
  - [ ] Submit on Enter or button click
  - [ ] Clear button
  - [ ] Disabled state

- [ ] Implement `src/components/search/ResultCard.tsx`:
  - [ ] Image thumbnail
  - [ ] Similarity score display
  - [ ] File name on hover
  - [ ] Click to open in OS

- [ ] Implement `src/components/search/ResultsGrid.tsx`:
  - [ ] Responsive grid (2-4 columns)
  - [ ] Map results to ResultCard
  - [ ] Empty state
  - [ ] Loading state

### Screens

- [ ] Implement `src/screens/FolderSelectionScreen.tsx`:
  - [ ] "Select Folders" button → IPC call
  - [ ] Display selected folders list
  - [ ] Remove folder button
  - [ ] "Start Indexing" button → API call
  - [ ] Navigate to IndexingStatusScreen on start

- [ ] Implement `src/screens/IndexingStatusScreen.tsx`:
  - [ ] ProgressBar component
  - [ ] Poll indexing status
  - [ ] Show current file (optional)
  - [ ] "Start Searching" button when complete
  - [ ] Error display if failed

- [ ] Implement `src/screens/SearchScreen.tsx`:
  - [ ] SearchBar component
  - [ ] ResultsGrid component
  - [ ] Loading spinner during search
  - [ ] Empty state (no search yet)
  - [ ] No results state
  - [ ] Error handling

### App & Routing

- [ ] Implement `src/App.tsx`:
  - [ ] State for current screen
  - [ ] Conditional rendering of screens
  - [ ] Navigation logic

- [ ] Implement `src/main.tsx`:
  - [ ] React root setup
  - [ ] Import styles
  - [ ] Render App component

### Styles

- [ ] Create `src/styles/index.css`:
  - [ ] Global resets
  - [ ] Variables (colors, spacing)
  - [ ] Utility classes

- [ ] Style components inline or with CSS modules

### Tests

- [ ] Implement `tests/unit/SearchBar.test.tsx`:
  - [ ] Renders correctly
  - [ ] Calls onSearch when submitted
  - [ ] Clears input

- [ ] Implement `tests/integration/api-client.test.ts`:
  - [ ] Mock fetch
  - [ ] Test search() method
  - [ ] Test error handling

---

## Integration & Testing

### Manual E2E Testing

- [ ] Start backend server
- [ ] Start frontend dev server
- [ ] Test folder selection:
  - [ ] Click "Select Folders"
  - [ ] Choose folder with test images
  - [ ] Verify folder appears in list
  - [ ] Click "Start Indexing"

- [ ] Test indexing:
  - [ ] Progress bar updates
  - [ ] Status text shows progress
  - [ ] Completes successfully
  - [ ] "Start Searching" button appears

- [ ] Test search:
  - [ ] Type query (e.g., "red car")
  - [ ] Click Search or press Enter
  - [ ] Results appear in grid
  - [ ] Click result → image opens in OS

- [ ] Test error handling:
  - [ ] Stop backend
  - [ ] Try to search → shows error
  - [ ] Restart backend
  - [ ] Retry → works

### Automated Tests

- [ ] Run `pytest` in backend:
  - [ ] All tests pass
  - [ ] Coverage > 70%

- [ ] Run `vitest` in frontend:
  - [ ] All tests pass
  - [ ] No console errors

### Code Quality

- [ ] Backend linting: `ruff check src`
- [ ] Backend type check: `mypy src`
- [ ] Frontend linting: `pnpm lint`
- [ ] Frontend type check: `pnpm type-check`

---

## Packaging & Documentation

### Electron Packaging

- [ ] Configure `electron-builder.json` for target platforms
- [ ] Test packaging: `pnpm electron:build`
- [ ] Verify packaged app runs
- [ ] Ensure backend instructions in README

### Documentation

- [ ] Update `apps/clip-backend/README.md`:
  - [ ] Installation instructions
  - [ ] Running instructions
  - [ ] API documentation link

- [ ] Update `apps/desktop-ui/README.md`:
  - [ ] Installation instructions
  - [ ] Development instructions
  - [ ] Building instructions

- [ ] Create `README.md` in project root:
  - [ ] Project overview
  - [ ] Prerequisites
  - [ ] Quick start guide
  - [ ] Architecture diagram (text)
  - [ ] Links to docs/

### Optional Enhancements

- [ ] Add example queries in UI placeholder
- [ ] Add keyboard shortcuts (Ctrl+K for search)
- [ ] Add drag-and-drop for folders
- [ ] Add settings screen (change model, device)
- [ ] Add dark mode

---

## Completion Checklist

Before considering MVP done:

- [ ] Backend can index 10k images successfully
- [ ] Search returns results in < 2 seconds
- [ ] UI is responsive and intuitive
- [ ] Index persists across restarts
- [ ] Error messages are clear
- [ ] Tests pass with >70% coverage
- [ ] App can be packaged for one platform
- [ ] Documentation is complete

---

**Created**: 2025-11-05
**Status**: Tasks documented, ready for execution
