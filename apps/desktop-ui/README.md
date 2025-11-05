# OpenCLIP Desktop UI

Electron-based desktop application for semantic image search using OpenCLIP embeddings.

## Features

- **Folder Selection**: Choose multiple image directories to index
- **Background Indexing**: Index images with progress tracking
- **Semantic Search**: Natural language queries for image search
- **Native Integration**: Open images and folders in system default apps

## Prerequisites

- Node.js 18+ (or compatible)
- pnpm (recommended) or npm
- Backend API running at `http://localhost:8000`

## Installation

```bash
# Install dependencies
pnpm install

# Or with npm
npm install
```

## Development

### Running the Web UI (Vite Dev Server)

```bash
pnpm dev
```

This starts the Vite dev server at `http://localhost:3000`. Useful for rapid UI development without Electron.

### Running the Electron App

```bash
# Start in development mode
pnpm electron:dev
```

This compiles the Electron main process and starts the Electron app with hot reload.

## Building

### Build for Production

```bash
# Build the React app
pnpm build

# Package Electron app (requires electron-builder)
pnpm electron:build
```

The built app will be in the `dist-electron/` directory.

## Project Structure

```
apps/desktop-ui/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry point
│   └── preload.ts        # Preload script (context bridge)
├── src/
│   ├── screens/          # Top-level UI screens
│   │   ├── FolderSelectionScreen.tsx
│   │   ├── IndexingStatusScreen.tsx
│   │   └── SearchScreen.tsx
│   ├── components/       # Reusable components
│   │   ├── common/      # Common UI components
│   │   └── search/      # Search-specific components
│   ├── api/             # Backend API client
│   │   └── client.ts
│   ├── types/           # TypeScript types
│   │   ├── api.ts
│   │   └── electron.d.ts
│   ├── styles/          # Global styles
│   │   └── globals.css
│   ├── App.tsx          # Root component
│   └── main.tsx         # React entry point
├── tests/               # Tests
├── index.html           # HTML template
├── package.json
├── tsconfig.json        # TypeScript config (renderer)
├── tsconfig.node.json   # TypeScript config (main process)
└── vite.config.ts       # Vite configuration
```

## Architecture

### Main Process (Electron)

- **main.ts**: Creates BrowserWindow, manages app lifecycle
- **preload.ts**: Exposes safe IPC API to renderer via context bridge

### Renderer Process (React)

- **App.tsx**: Root component, manages app state (folder-selection → indexing → search)
- **Screens**: Full-screen UI states
- **Components**: Reusable UI elements
- **API Client**: HTTP communication with FastAPI backend

### IPC Channels

Exposed via `window.electronAPI`:

- `selectFolders()`: Open folder selection dialog
- `openFolder(path)`: Open folder in file manager
- `openImage(path)`: Open image in default viewer

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Type Checking

```bash
pnpm type-check
```

## Linting

```bash
pnpm lint
```

## Backend Connection

The app expects the backend to be running at `http://localhost:8000`.

Start the backend:

```bash
cd ../clip-backend
uvicorn src.main:app --reload
```

## Common Issues

### Backend Not Available

If you see "Backend Not Available", ensure:
1. Backend is running: `uvicorn src.main:app --reload`
2. Backend is accessible at `http://localhost:8000`
3. Check backend logs for errors

### Images Not Loading

If images don't load in the results grid:
1. Ensure file paths are absolute
2. Check file permissions
3. Verify image files exist at the reported paths

### Electron App Won't Start

1. Rebuild the main process: `pnpm electron:dev`
2. Check for TypeScript errors: `pnpm type-check`
3. Clear `dist-electron/` and rebuild

## License

MIT
