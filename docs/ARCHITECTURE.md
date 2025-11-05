# Architecture - OpenCLIP Desktop Image Search

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Desktop Application                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Electron Main Process                     │  │
│  │  - Window management                                   │  │
│  │  - File system access (folder selection)              │  │
│  │  - Native OS integration                              │  │
│  └────────────┬───────────────────────────────────────────┘  │
│               │ IPC                                           │
│  ┌────────────┴───────────────────────────────────────────┐  │
│  │           Electron Renderer Process                    │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │           React Application                      │  │  │
│  │  │  - Folder selection screen                       │  │  │
│  │  │  - Indexing status screen                        │  │  │
│  │  │  - Search screen                                 │  │  │
│  │  │  - Results grid                                  │  │  │
│  │  └──────────────────┬───────────────────────────────┘  │  │
│  └─────────────────────┼──────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP (REST)
┌────────────────────────┴─────────────────────────────────────┐
│                   Backend API Service                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  FastAPI Application                   │  │
│  │  - /search - Search by text                           │  │
│  │  - /index/start - Start indexing                      │  │
│  │  - /index/status - Get indexing progress              │  │
│  │  - /health - Health check                             │  │
│  └────────────┬───────────────────────────────────────────┘  │
│               │                                               │
│  ┌────────────┴───────────────────────────────────────────┐  │
│  │              Business Logic Layer                      │  │
│  │  ┌──────────────────┐    ┌──────────────────────────┐ │  │
│  │  │ Indexing Service │    │   Search Service         │ │  │
│  │  │  - Scan folders  │    │  - Text → embedding      │ │  │
│  │  │  - Batch process │    │  - Query index           │ │  │
│  │  │  - Track progress│    │  - Rank results          │ │  │
│  │  └────────┬─────────┘    └──────────┬───────────────┘ │  │
│  └───────────┼──────────────────────────┼─────────────────┘  │
│              │                          │                     │
│  ┌───────────┴──────────────────────────┴─────────────────┐  │
│  │                  Model Layer                            │  │
│  │  ┌──────────────────┐    ┌──────────────────────────┐  │  │
│  │  │  OpenCLIP Model  │    │    FAISS Index Store     │  │  │
│  │  │  - Load model    │    │  - Add embeddings        │  │  │
│  │  │  - Embed images  │    │  - Search (k-NN)         │  │  │
│  │  │  - Embed text    │    │  - Save/load index       │  │  │
│  │  │  - GPU/CPU       │    │  - Metadata management   │  │  │
│  │  └──────────────────┘    └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Desktop Application (Electron + React)

#### Electron Main Process
- **Window Lifecycle**: Create, manage, and destroy application windows
- **Native OS APIs**: File dialogs, notifications, system tray
- **IPC Bridge**: Expose safe APIs to renderer via preload scripts
- **Security**: Enforce context isolation and Node.js restrictions

#### React Renderer
- **UI Components**: Screens, forms, grids, buttons
- **State Management**: React hooks and Context API
- **API Client**: HTTP calls to backend service
- **User Interactions**: Handle clicks, form submissions, keyboard shortcuts

### Backend Service (Python + FastAPI)

#### FastAPI Application
- **HTTP Endpoints**: RESTful API for search, indexing, health
- **Request Validation**: Pydantic models for type safety
- **Error Handling**: HTTP status codes and error responses
- **Async Support**: Non-blocking I/O for long-running operations

#### Business Logic Services
- **Indexing Service**: Orchestrates folder scanning and embedding generation
- **Search Service**: Converts queries to embeddings and retrieves results

#### Model Layer
- **OpenCLIP Model**: Generates embeddings for images and text
- **FAISS Index Store**: Stores embeddings and performs similarity search

---

## Data Flow

### Indexing Flow

```
User selects folders
    ↓
Electron dialog returns paths
    ↓
POST /index/start { folders: [...] }
    ↓
Backend starts background task
    ↓
For each folder:
    Scan for images (.jpg, .png)
        ↓
    Batch images (32 at a time)
        ↓
    OpenCLIP: embed_images_batch()
        ↓
    FAISS: add_batch(embeddings, paths)
        ↓
    Update progress state
        ↓
    UI polls GET /index/status every 2s
        ↓
    Show progress bar to user
        ↓
When complete:
    FAISS saves index to disk
    State = 'complete'
```

### Search Flow

```
User types query: "red car"
    ↓
Submit form (Enter or button click)
    ↓
POST /search { query: "red car", top_k: 50 }
    ↓
Backend: OpenCLIP.encode_text("red car")
    ↓
Backend: FAISS.search(query_embedding, k=50)
    ↓
Returns: [{ path: "...", score: 0.95 }, ...]
    ↓
UI renders results grid
    ↓
User clicks image
    ↓
Electron opens image in OS viewer
```

---

## Communication Protocols

### IPC (Electron Main ↔ Renderer)

**Used for**: File system and native OS operations

**Pattern**: Request-response via `ipcRenderer.invoke()` and `ipcMain.handle()`

**Channels**:
```typescript
// Folder selection
window.electron.selectFolders() → Promise<string[]>

// Open image in OS viewer
window.electron.openPath(path: string) → Promise<void>

// Notifications
window.electron.showNotification(title, body) → Promise<void>
```

**Security**: Context isolation enabled, only whitelisted APIs exposed

### HTTP REST (Renderer ↔ Backend)

**Used for**: All ML/data operations

**Base URL**: `http://localhost:8000` (configurable)

**Endpoints**: See API_BACKEND.md for details

**Error Handling**:
- Network errors: Show "Backend not running" message
- 4xx errors: Show validation or client errors
- 5xx errors: Show "Server error" with retry option

---

## Storage & Persistence

### FAISS Index Files

**Location**: `data/indices/clip_index.faiss`

**Format**:
- **clip_index.faiss**: Binary FAISS index (embeddings)
- **clip_index.pkl**: Metadata (path → ID mapping)

**Size**: ~2 KB per image (512-dim float32 + metadata)

**Lifecycle**:
- **Created**: After first indexing
- **Loaded**: On backend startup (if exists)
- **Updated**: On subsequent indexing operations
- **Deleted**: User action or manual cleanup

### Configuration Files

**Electron**:
- **Location**: `~/.config/openclip-desktop/` (Linux/macOS) or `%APPDATA%\openclip-desktop\` (Windows)
- **Contents**: User preferences, window state, last folder paths

**Backend**:
- **Location**: `.env` file or environment variables
- **Contents**: Model settings, device (CPU/GPU), batch size

---

## Deployment Architecture

### Development

```
Terminal 1: Backend
  cd apps/clip-backend
  uvicorn src.main:app --reload --port 8000

Terminal 2: Frontend
  cd apps/desktop-ui
  pnpm dev          # Vite dev server (port 3000)

Terminal 3: Electron
  cd apps/desktop-ui
  pnpm electron:dev  # Loads from localhost:3000
```

### Production

**Packaged App**:
```
OpenCLIP-Desktop.exe (or .app, .AppImage)
├── electron/         # Electron runtime
├── app/
│   ├── dist/         # Built React app
│   └── dist-electron/ # Compiled main process
└── backend/          # Embedded Python + dependencies (optional)
    ├── python/       # Portable Python runtime
    └── src/          # Backend code
```

**Startup**:
1. Electron starts
2. Main process launches Python backend as child process (or expects user to run separately)
3. Renderer loads and connects to backend
4. App ready

**Alternative (MVP)**: User runs backend separately (developer-friendly)

---

## Scalability Considerations

### Current Limits (MVP)

- **Images**: 10k-100k per index
- **Embedding Dim**: 512 (ViT-B-32)
- **Memory**: ~500 MB (model) + ~10 MB per 10k images (index)
- **Search Time**: < 2s for 100k images (flat index)

### Future Optimizations

1. **GPU Acceleration**: Use CUDA for embedding and search
2. **IVF Index**: Switch to approximate search for > 100k images
3. **Incremental Indexing**: Only embed new/changed images
4. **Distributed Indexing**: Split across multiple processes
5. **Smaller Models**: Use ViT-B-16 or smaller for faster embedding

---

## Security Model

### Threats & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Path traversal | Validate folder paths before scanning |
| Malicious images | Use Pillow safely, catch decode errors |
| Code injection | No eval(), no user code execution |
| Data exfiltration | No network except localhost backend |
| Electron vulnerabilities | Context isolation, no node integration in renderer |

### Permissions

- **File System**: Read-only access to user-selected folders
- **Network**: Localhost only (no external requests)
- **Native APIs**: Only via whitelisted IPC channels

---

## Testing Strategy

### Unit Tests

**Frontend**:
- Component rendering (React Testing Library)
- API client methods (mocked fetch)
- Utility functions

**Backend**:
- Model wrappers (mocked PyTorch)
- Index operations (mocked FAISS)
- API endpoints (TestClient)

### Integration Tests

- **Backend**: FastAPI TestClient with real OpenCLIP and FAISS
- **Frontend**: Test IPC calls with mocked Electron

### End-to-End Tests

- **Manual for MVP**: Select folder, index, search, verify results
- **Future**: Playwright for automated E2E tests

---

## Technology Choices & Rationale

| Technology | Alternative | Reason |
|-----------|------------|--------|
| Electron | Tauri | More mature, larger ecosystem |
| React | Vue, Svelte | Team familiarity, large component library |
| FastAPI | Flask, Django | Async support, auto docs, type safety |
| OpenCLIP | CLIP (official) | Open-source, multiple models |
| FAISS | Annoy, Hnswlib | Facebook-backed, well-tested, GPU support |
| TypeScript | JavaScript | Type safety, better tooling |
| pnpm | npm, yarn | Faster, disk-efficient |

---

## Monitoring & Observability (Future)

### Metrics

- **Indexing**: Images/second, errors, memory usage
- **Search**: Latency (p50, p95, p99), throughput
- **Errors**: Exception counts by type

### Logging

- **Structured Logs**: JSON format with timestamps, levels, context
- **Destinations**: Console (dev), file (production)
- **Levels**: ERROR, WARN, INFO, DEBUG

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
