# OpenCLIP Desktop Image Search

A complete semantic image search application combining OpenCLIP embeddings, FAISS similarity search, and an Electron desktop interface.

This project also serves as a **template repository** with reusable AI infrastructure (skills, hooks, dev docs workflow) for future projects.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Usage](#usage)
- [AI Infrastructure Templates](#ai-infrastructure-templates)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This application allows you to:
1. **Index** folders of images using OpenCLIP to generate semantic embeddings
2. **Search** using natural language queries (e.g., "sunset over mountains", "happy dog")
3. **Browse** results ranked by semantic similarity
4. **Open** images directly from the app in your system viewer

**Tech Stack:**
- **Backend**: Python 3.9+, FastAPI, OpenCLIP, PyTorch, FAISS
- **Frontend**: Electron, React 18, TypeScript, Vite
- **AI Tooling**: Claude Code skills, hooks, and dev docs templates

---

## Features

### Core Functionality
- ✅ **Semantic Image Search**: Natural language queries using OpenCLIP embeddings
- ✅ **Fast Similarity Search**: FAISS for efficient nearest-neighbor search
- ✅ **Background Indexing**: Index images with real-time progress tracking
- ✅ **Desktop Integration**: Native folder/file dialogs, system image viewer integration
- ✅ **Type-Safe**: Full TypeScript + Python type hints throughout

### AI Development Infrastructure
- ✅ **Skills System**: Auto-activating domain-specific guidance for Claude Code
- ✅ **Hooks System**: Automated checks, skill suggestions, edit tracking
- ✅ **Dev Docs Workflow**: Structured planning with plan/context/tasks documents
- ✅ **Reusable Templates**: Copy `ai-infra-templates/` to new projects

---

## Architecture

```
┌─────────────────────┐
│   Electron Desktop  │  (TypeScript + React)
│   - Folder Selection│
│   - Indexing UI     │
│   - Search Interface│
└──────────┬──────────┘
           │ HTTP (REST API)
           │
┌──────────▼──────────┐
│   FastAPI Backend   │  (Python + FastAPI)
│   - Index Management│
│   - Search Endpoint │
└──────────┬──────────┘
           │
     ┌─────▼─────┐
     │  OpenCLIP │  (PyTorch Model)
     │  Encoder  │
     └─────┬─────┘
           │
     ┌─────▼─────┐
     │   FAISS   │  (Similarity Search)
     │   Index   │
     └───────────┘
```

**Data Flow:**
1. User selects image folders via Electron UI
2. Backend scans folders and generates embeddings using OpenCLIP
3. Embeddings stored in FAISS index for fast search
4. User enters text query → OpenCLIP encodes query → FAISS finds similar images
5. Results displayed in UI, clickable to open in system viewer

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed design.

---

## Quick Start

### Prerequisites

- **Python 3.9+** with pip
- **Node.js 18+** with pnpm (or npm)
- ~2 GB free disk space (for model weights)

### 1. Clone and Install

```bash
git clone <repository-url>
cd devOpsStuff

# Backend setup
cd apps/clip-backend
pip install -r requirements.txt

# Frontend setup
cd ../desktop-ui
pnpm install  # or npm install
```

### 2. Start Backend

```bash
cd apps/clip-backend
uvicorn src.main:app --reload
```

Backend will be available at `http://localhost:8000`. On first run, OpenCLIP will download the model (~350 MB).

### 3. Start Frontend

```bash
cd apps/desktop-ui
pnpm electron:dev
```

The Electron app will launch and connect to the backend.

### 4. Index and Search

1. Click **"+ Add Folders"** to select image directories
2. Click **"Start Indexing"** and wait for completion
3. Enter a search query (e.g., "red sports car") and click **Search**
4. Click any result to open in your default image viewer

---

## Detailed Setup

### Backend Setup

```bash
cd apps/clip-backend

# Option 1: Install with pip
pip install -r requirements.txt

# Option 2: Install as editable package with dev dependencies
pip install -e ".[dev]"

# Option 3: Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Configuration** (optional):

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key settings:
- `MODEL_NAME`: OpenCLIP architecture (default: `ViT-B-32`)
- `DEVICE`: `cpu` or `cuda` (GPU support)
- `BATCH_SIZE`: Images per batch during indexing (default: `32`)
- `INDEX_SAVE_PATH`: Path to save FAISS index

**Run Backend:**

```bash
# Development (with auto-reload)
uvicorn src.main:app --reload

# Production (with multiple workers)
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**API Docs:** Visit `http://localhost:8000/docs` for interactive Swagger UI.

### Frontend Setup

```bash
cd apps/desktop-ui

# Install dependencies
pnpm install  # or npm install

# Development options:

# Option 1: Run as web app (Vite dev server)
pnpm dev

# Option 2: Run as Electron app (recommended)
pnpm electron:dev

# Build for production
pnpm build
pnpm electron:build
```

**Environment Variables:**

The frontend expects the backend at `http://localhost:8000`. To change, edit `src/api/client.ts`:

```typescript
const BASE_URL = 'http://localhost:8000';  // Change if needed
```

---

## Usage

### Indexing Images

1. Launch the Electron app
2. Click **"+ Add Folders"** and select directories containing images
3. Supported formats: `.jpg`, `.jpeg`, `.png`
4. Click **"Start Indexing"**
5. Wait for indexing to complete (progress shown in real-time)

**Performance:**
- CPU: ~10-50 images/second (depends on image size)
- GPU: ~100-500 images/second with `DEVICE=cuda`
- Memory: ~500 MB (model) + ~2 KB per image

### Searching

1. After indexing completes, you'll see the search screen
2. Enter a natural language query:
   - "sunset over mountains"
   - "red sports car"
   - "happy dog playing"
   - "person wearing sunglasses"
3. Adjust **Max results** (default: 50)
4. Click **Search**
5. Results ranked by semantic similarity (score 0-100%)

**Tips:**
- Be descriptive: "golden retriever puppy" > "dog"
- Use adjectives: "old wooden bridge" > "bridge"
- Combine concepts: "sunset beach palm tree"

### Opening Images

- Click any result card to open the image in your system's default viewer
- Right-click (future): Context menu with "Open Folder", "Copy Path", etc.

### Re-indexing

Click **"Re-index Folders"** in the search screen to:
- Add new folders
- Re-index existing folders (e.g., after adding new images)

**Note:** Re-indexing replaces the existing index. To add folders without clearing, this feature is planned for a future update.

---

## AI Infrastructure Templates

This project includes **reusable AI development infrastructure** for use with Claude Code:

### What's Included

Located in `ai-infra-templates/`:

1. **Skills** (`skills/`):
   - `frontend-desktop-guidelines`: Electron + React + TypeScript patterns
   - `backend-ml-guidelines`: FastAPI + ML model patterns
   - `project-setup-guidelines`: How to set up skills, hooks, dev docs

2. **Hooks** (`hooks/`):
   - `userPromptSubmit.ts`: Auto-suggests relevant skills based on context
   - `postToolUse-edit-tracker.ts`: Tracks file edits
   - `stop-build-checker.ts`: Runs build/lint checks after responses
   - `stop-error-handling-reminder.ts`: Reminds about error handling

3. **Dev Docs Templates** (`dev/templates/`):
   - Structured planning with `*-plan.md`, `*-context.md`, `*-tasks.md`

4. **Skill Rules** (`skill-rules.json`):
   - Defines when skills should activate (file patterns, keywords)

### Using Templates in New Projects

```bash
# Copy templates to your new project
cp -r ai-infra-templates/ /path/to/new-project/

# Activate skills and hooks
cd /path/to/new-project
mkdir -p .claude/skills .claude/hooks
cp -r ai-infra-templates/skills/* .claude/skills/
cp -r ai-infra-templates/hooks/* .claude/hooks/
cp ai-infra-templates/skill-rules.json .claude/skill-rules.json

# Customize CLAUDE.md from template
cp ai-infra-templates/CLAUDE.base.md CLAUDE.md
# Edit CLAUDE.md to match your project
```

### How Skills Work

**Skills** are auto-activated based on:
- **File paths**: Editing `apps/desktop-ui/**/*.tsx` → frontend skill
- **Keywords**: Prompt contains "React", "Electron" → frontend skill
- **Intent**: "create new component" → frontend skill

Configured in `.claude/skill-rules.json`.

### How Hooks Work

**Hooks** run at specific workflow points:
- `userPromptSubmit`: Before processing user prompt (suggests skills)
- `postToolUse`: After tool execution (tracks edits)
- `stop`: After assistant response (runs checks)

See `ai-infra-templates/hooks/` for examples.

---

## Development Workflow

### Starting a New Feature

1. **Plan** (optional for complex features):
   ```
   "Let's plan out how to implement <feature>"
   ```

2. **Create dev docs**:
   ```bash
   cp -r dev/templates/new-feature-template dev/active/<feature-name>
   ```
   Or ask Claude: `"Create dev docs for <feature-name>"`

3. **Implement**:
   Claude will create a todo list and track progress automatically.

4. **Test and review**:
   Hooks will run build checks and remind about error handling.

### Running Tests

**Backend:**
```bash
cd apps/clip-backend
pytest                          # Run all tests
pytest --cov=src                # With coverage
pytest tests/test_api.py        # Specific file
```

**Frontend:**
```bash
cd apps/desktop-ui
pnpm test                       # Run all tests
pnpm test:watch                 # Watch mode
pnpm test:coverage              # With coverage
```

### Code Quality

**Backend:**
```bash
ruff check src                  # Linting
ruff format src                 # Formatting
mypy src                        # Type checking
```

**Frontend:**
```bash
pnpm lint                       # ESLint
pnpm type-check                 # TypeScript checking
```

### Git Workflow

This project uses feature branches with the pattern `claude/<feature>-<session-id>`.

```bash
# Current branch (auto-created by Claude Code)
git branch
# claude/openclip-desktop-setup-011CUq3QJ79fGNJEADdJW8GH

# Commit and push
git add .
git commit -m "Your message"
git push -u origin <branch-name>
```

---

## Project Structure

```
devOpsStuff/
├── ai-infra-templates/          # Reusable AI development infrastructure
│   ├── skills/                  # Claude Code skills (domain guidance)
│   ├── hooks/                   # Workflow automation hooks
│   ├── skill-rules.json         # Skill activation rules
│   └── CLAUDE.base.md           # Template for CLAUDE.md
│
├── apps/
│   ├── clip-backend/            # Python FastAPI backend
│   │   ├── src/
│   │   │   ├── models/          # OpenCLIP + FAISS wrappers
│   │   │   ├── services/        # Business logic
│   │   │   ├── schemas/         # Pydantic models
│   │   │   ├── api.py           # API routes
│   │   │   ├── main.py          # FastAPI app
│   │   │   └── config.py        # Configuration
│   │   ├── tests/               # Backend tests
│   │   ├── requirements.txt
│   │   └── README.md
│   │
│   └── desktop-ui/              # Electron + React frontend
│       ├── electron/            # Electron main process
│       ├── src/
│       │   ├── screens/         # UI screens
│       │   ├── components/      # Reusable components
│       │   ├── api/             # Backend client
│       │   ├── types/           # TypeScript types
│       │   └── styles/          # CSS
│       ├── tests/               # Frontend tests
│       ├── package.json
│       └── README.md
│
├── docs/                        # Project documentation
│   ├── PROJECT_KNOWLEDGE.md     # Project overview
│   ├── ARCHITECTURE.md          # System design
│   ├── API_BACKEND.md           # API specification
│   └── UI_FLOWS.md              # UI/UX flows
│
├── dev/                         # Development workflow
│   ├── active/                  # Current feature work
│   │   └── text-search-mvp/    # Example: MVP planning docs
│   └── templates/               # Templates for new features
│
├── CLAUDE.md                    # Claude Code project instructions
└── README.md                    # This file
```

---

## Troubleshooting

### Backend Issues

**Model download fails:**
- Check internet connection
- Manually download via `scripts/download_models.py` (if available)
- OpenCLIP models cached in `~/.cache/clip/`

**Out of memory during indexing:**
- Reduce `BATCH_SIZE` in `.env`
- Use smaller model: `MODEL_NAME=RN50`

**Slow indexing:**
- Use GPU: `DEVICE=cuda`
- Increase `BATCH_SIZE` if RAM allows

**API returns 404/500:**
- Check backend logs in terminal
- Verify backend is running: `curl http://localhost:8000/health`

### Frontend Issues

**"Backend Not Available" error:**
- Ensure backend is running at `http://localhost:8000`
- Check backend health: `curl http://localhost:8000/health`

**Images not loading in results:**
- Ensure file paths are absolute
- Check file permissions
- Verify images exist at reported paths

**Electron app won't start:**
- Rebuild: `pnpm electron:dev`
- Check TypeScript errors: `pnpm type-check`
- Clear and rebuild: `rm -rf dist-electron && pnpm electron:dev`

### General Issues

**Dependencies won't install:**
- Backend: Ensure Python 3.9+ (`python --version`)
- Frontend: Ensure Node 18+ (`node --version`)
- Try clearing caches:
  - Backend: `pip cache purge`
  - Frontend: `pnpm store prune` or `npm cache clean --force`

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow existing code style (linters are configured)
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

**Code Style:**
- Python: Follow PEP 8, use type hints, run `ruff` and `mypy`
- TypeScript: Follow existing patterns, run `eslint`, ensure type safety

---

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Acknowledgments

- **OpenCLIP**: Vision-language models ([https://github.com/mlfoundations/open_clip](https://github.com/mlfoundations/open_clip))
- **FAISS**: Similarity search library ([https://github.com/facebookresearch/faiss](https://github.com/facebookresearch/faiss))
- **FastAPI**: Modern Python web framework ([https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/))
- **Electron**: Desktop app framework ([https://www.electronjs.org/](https://www.electronjs.org/))
- **Claude Code**: AI-powered development assistant

---

**Questions or Issues?** Open an issue on GitHub or check the documentation in `docs/`.

**Last Updated:** 2025-11-05
