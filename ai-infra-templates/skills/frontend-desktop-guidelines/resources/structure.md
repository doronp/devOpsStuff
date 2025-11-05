# Frontend Desktop Structure

This document covers project file organization and module layout for Electron + React + TypeScript desktop applications.

---

## Recommended Project Structure

```
apps/desktop-ui/
├── electron/                      # Electron main process
│   ├── main.ts                   # Main entry point
│   ├── preload.ts                # Preload script (IPC bridge)
│   ├── menu.ts                   # Application menu (optional)
│   └── config.ts                 # Main process config
│
├── src/                          # React renderer
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component
│   │
│   ├── screens/                  # Top-level screens/pages
│   │   ├── FolderSelectionScreen.tsx
│   │   ├── IndexingStatusScreen.tsx
│   │   └── SearchScreen.tsx
│   │
│   ├── components/               # Reusable UI components
│   │   ├── common/              # Generic components
│   │   │   ├── Button.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── ErrorMessage.tsx
│   │   │
│   │   ├── search/              # Search-specific
│   │   │   ├── SearchBar.tsx
│   │   │   ├── ResultsGrid.tsx
│   │   │   └── ResultCard.tsx
│   │   │
│   │   └── indexing/            # Indexing-specific
│   │       └── ProgressBar.tsx
│   │
│   ├── api/                      # Backend API clients
│   │   ├── client.ts            # Main API client class
│   │   ├── types.ts             # API request/response types
│   │   └── errors.ts            # Custom error classes
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useSearch.ts
│   │   ├── useIndexing.ts
│   │   └── useDebounce.ts
│   │
│   ├── context/                  # React Context providers
│   │   ├── AppContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── utils/                    # Utility functions
│   │   ├── formatting.ts
│   │   └── validation.ts
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── electron.d.ts        # Electron API types
│   │   └── common.ts
│   │
│   └── styles/                   # Global styles
│       ├── index.css
│       └── variables.css
│
├── tests/                        # Tests
│   ├── unit/
│   ├── integration/
│   └── setup.ts
│
├── public/                       # Static assets
│   ├── icons/
│   └── images/
│
├── dist/                         # Build output (gitignored)
├── dist-electron/                # Electron build output (gitignored)
│
├── electron-builder.json         # Electron Builder config
├── package.json
├── tsconfig.json                 # Main TS config
├── tsconfig.node.json            # Node (main process) TS config
├── vite.config.ts                # Vite config
└── vitest.config.ts              # Test config
```

---

## File Naming Conventions

### Components

- **PascalCase**: `SearchBar.tsx`, `ResultCard.tsx`
- **Index files**: `index.ts` for barrel exports

```typescript
// components/search/index.ts
export { SearchBar } from './SearchBar';
export { ResultsGrid } from './ResultsGrid';
export { ResultCard } from './ResultCard';
```

### Hooks

- **camelCase with `use` prefix**: `useSearch.ts`, `useDebounce.ts`

### Utilities

- **camelCase**: `formatting.ts`, `validation.ts`

### Types

- **camelCase**: `common.ts`, `api.ts`
- **`.d.ts` for declaration files**: `electron.d.ts`

---

## Module Organization Patterns

### 1. Barrel Exports

Group related exports in `index.ts` files:

```typescript
// components/search/index.ts
export { SearchBar } from './SearchBar';
export { ResultsGrid } from './ResultsGrid';
export type { SearchBarProps, ResultsGridProps } from './types';
```

Import:
```typescript
import { SearchBar, ResultsGrid } from '@/components/search';
```

### 2. Colocation

Keep related files together:

```
components/search/
  SearchBar.tsx
  SearchBar.test.tsx
  SearchBar.module.css
  types.ts
  index.ts
```

### 3. Feature Folders

For complex features, group by feature:

```
features/
  search/
    components/
    hooks/
    api/
    types.ts
    index.ts
```

---

## TypeScript Configuration

### Root `tsconfig.json` (Renderer)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `tsconfig.node.json` (Main Process)

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["electron"]
}
```

---

## Vite Configuration

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Development server
  server: {
    port: 3000
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

---

## Electron Builder Configuration

### `electron-builder.json`

```json
{
  "appId": "com.example.openclip-desktop",
  "productName": "OpenCLIP Desktop",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json"
  ],
  "mac": {
    "target": ["dmg", "zip"],
    "category": "public.app-category.productivity"
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Utility"
  }
}
```

---

## Package.json Scripts

```json
{
  "name": "desktop-ui",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",

    "electron:dev": "tsc -p tsconfig.node.json && electron .",
    "electron:build": "tsc -p tsconfig.node.json && electron-builder",

    "dev:desktop": "concurrently \"pnpm dev\" \"wait-on http://localhost:3000 && pnpm electron:dev\"",

    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",

    "lint": "eslint src electron --ext .ts,.tsx",
    "lint:fix": "eslint src electron --ext .ts,.tsx --fix",

    "type-check": "tsc --noEmit && tsc -p tsconfig.node.json --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "electron": "^27.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "concurrently": "^8.0.0",
    "wait-on": "^7.0.0"
  }
}
```

---

## Main Process Structure

### `electron/main.ts`

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('app:version', () => app.getVersion());
```

### `electron/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electron', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),

  // File operations
  selectFolders: () => ipcRenderer.invoke('select-folders'),

  // Add more as needed
});

// Type definitions for renderer (in src/types/electron.d.ts)
```

---

## Renderer Structure

### `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `src/App.tsx`

```typescript
import { useState } from 'react';
import { FolderSelectionScreen } from './screens/FolderSelectionScreen';
import { SearchScreen } from './screens/SearchScreen';

type Screen = 'folder-selection' | 'search';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('folder-selection');

  return (
    <div className="app">
      {currentScreen === 'folder-selection' && (
        <FolderSelectionScreen onComplete={() => setCurrentScreen('search')} />
      )}
      {currentScreen === 'search' && <SearchScreen />}
    </div>
  );
}
```

---

## Type Safety for Electron APIs

### `src/types/electron.d.ts`

```typescript
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  selectFolders: () => Promise<string[]>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

---

## Build Process

### Development

1. **Start Vite dev server**: `pnpm dev`
   - Runs on `http://localhost:3000`
   - Hot module replacement enabled

2. **Start Electron**: `pnpm electron:dev`
   - Loads from Vite dev server
   - DevTools open automatically

Or combined: `pnpm dev:desktop`

### Production Build

1. **Build renderer**: `pnpm build`
   - Compiles TypeScript
   - Bundles with Vite
   - Outputs to `dist/`

2. **Build main process**: `tsc -p tsconfig.node.json`
   - Compiles main process TypeScript
   - Outputs to `dist-electron/`

3. **Package app**: `pnpm electron:build`
   - Uses Electron Builder
   - Creates installers for target platforms
   - Outputs to `release/`

---

## Mono-repo Considerations

If using a mono-repo (e.g., with pnpm workspaces):

### Root `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Running Commands

```bash
# In specific workspace
pnpm --filter desktop-ui dev

# From root
pnpm -r build  # Build all workspaces
```

---

## Common Structure Patterns

### Screen Components

Place in `src/screens/`:
- One file per screen
- Handle routing/navigation logic
- Compose smaller components

Example:
```typescript
// src/screens/SearchScreen.tsx
import { SearchBar } from '@/components/search/SearchBar';
import { ResultsGrid } from '@/components/search/ResultsGrid';

export function SearchScreen() {
  // Screen-level state and logic
  return (
    <div className="search-screen">
      <SearchBar onSearch={handleSearch} />
      <ResultsGrid results={results} />
    </div>
  );
}
```

### Reusable Components

Place in `src/components/`:
- Organized by domain (search, indexing, common)
- Self-contained with own styles
- Props interface for configuration

### API Clients

Place in `src/api/`:
- One class per service
- Type-safe requests and responses
- Centralized error handling

---

## Checklist for New Files

When creating a new file:

- [ ] Place in appropriate directory (screens/components/api/hooks/utils)
- [ ] Use correct naming convention (PascalCase for components, camelCase for others)
- [ ] Add TypeScript types for all exports
- [ ] Create corresponding test file if applicable
- [ ] Add to barrel export (index.ts) if part of a module
- [ ] Update path aliases if needed (tsconfig.json)

---

**Last Updated**: 2025-11-05
