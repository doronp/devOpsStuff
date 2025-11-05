# Text Search MVP - Plan

## Goal

Build a working end-to-end semantic image search application where users can:
1. Select folders containing images
2. Index them using OpenCLIP embeddings
3. Search using natural language queries
4. View ranked results

## Approach

### Phase 1: Backend Foundation
1. Set up Python project structure with FastAPI
2. Implement OpenCLIP model wrapper for generating embeddings
3. Implement FAISS index store for similarity search
4. Create REST API endpoints for indexing and search
5. Add basic tests

### Phase 2: Frontend Foundation
1. Set up Electron + React + TypeScript project
2. Implement folder selection screen (IPC for native dialogs)
3. Implement indexing status screen (polling backend)
4. Implement search screen with results grid
5. Wire everything to backend API

### Phase 3: Integration & Polish
1. End-to-end testing with real images
2. Error handling and loading states
3. Basic packaging configuration

## Design Decisions

### Backend Architecture

**Decision**: Use FastAPI + background tasks for indexing
- **Rationale**: FastAPI provides async support, auto-docs, and Pydantic validation
- **Alternative considered**: Flask - rejected due to lack of async and built-in validation
- **Trade-off**: More complex than Flask, but better DX and type safety

**Decision**: Use FAISS Flat index (exact search)
- **Rationale**: Simple, accurate, handles 10k-100k images well
- **Alternative considered**: IVF index - not needed for MVP scale
- **Trade-off**: Slower for > 100k images, but acceptable for MVP

**Decision**: CPU-only FAISS for MVP
- **Rationale**: Broader compatibility, simpler setup
- **Alternative considered**: GPU FAISS - adds complexity
- **Trade-off**: Slower indexing/search, but good enough for testing

### Frontend Architecture

**Decision**: Electron + React
- **Rationale**: Cross-platform, familiar tech stack, large ecosystem
- **Alternative considered**: Tauri - rejected due to less mature ecosystem
- **Trade-off**: Larger bundle size, but easier development

**Decision**: Direct HTTP calls from renderer to backend
- **Rationale**: Backend is separate service, not part of Electron app
- **Alternative considered**: All via IPC - adds unnecessary complexity
- **Trade-off**: Need to ensure backend is running separately

**Decision**: Polling for indexing status
- **Rationale**: Simple, works well for MVP
- **Alternative considered**: WebSockets - overkill for MVP
- **Trade-off**: Slight delay in updates, but acceptable UX

### Model Selection

**Decision**: ViT-B-32 with laion2b_s34b_b79k weights
- **Rationale**: Good balance of speed and accuracy, well-tested
- **Alternative considered**: ViT-L-14 - too slow for MVP
- **Trade-off**: Lower accuracy than larger models, but much faster

## Non-Goals

**Explicitly out of scope for MVP**:
- Video search (frames extraction)
- Real-time indexing (file watchers)
- Advanced filters (date, resolution, file type)
- Cloud sync or multi-device
- User authentication
- Image editing or management
- Duplicate detection
- Face recognition

## Success Criteria

MVP is complete when:

- [ ] Backend can index 10,000 images without crashing
- [ ] Search returns results in < 2 seconds (with precomputed embeddings)
- [ ] UI shows clear progress during indexing
- [ ] Search results are semantically relevant (manual testing)
- [ ] Index persists across app restarts
- [ ] Error messages are user-friendly
- [ ] Code has basic test coverage (core logic)
- [ ] App can be packaged for at least one platform

## Risks & Mitigations

### Risk: Model download fails
- **Impact**: App unusable
- **Mitigation**: Clear error message with instructions, fallback to cached model if available

### Risk: Out of memory during indexing
- **Impact**: Indexing crashes
- **Mitigation**: Batch processing (32 images at a time), clear memory between batches

### Risk: Backend not running when UI starts
- **Impact**: UI shows errors
- **Mitigation**: Health check on startup, clear message to user, retry button

### Risk: Poor search quality
- **Impact**: User frustration
- **Mitigation**: Use proven model (ViT-B-32), test with diverse images, add example queries

## Timeline Estimate

**Optimistic**: 2-3 days (full-time)
**Realistic**: 4-5 days (full-time)
**Pessimistic**: 7-10 days (with debugging and polish)

Breakdown:
- Backend: 1-2 days
- Frontend: 1-2 days
- Integration & testing: 1 day
- Polish & packaging: 0.5-1 day

---

**Created**: 2025-11-05
**Status**: Planning complete, ready for implementation
