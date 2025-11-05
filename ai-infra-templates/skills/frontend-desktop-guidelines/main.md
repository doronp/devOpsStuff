# Frontend Desktop Guidelines

**Skill Type**: Domain-specific guidance for Electron + React + TypeScript desktop applications

**When to Use This Skill**:
- Working on desktop UI components and screens
- Implementing Electron main/renderer processes
- Setting up IPC (Inter-Process Communication)
- Managing application state in desktop contexts
- Handling native OS integrations

**Auto-Activation Triggers**:
- Editing files in desktop UI directories (e.g., `apps/desktop-ui/`, `src/renderer/`, `src/main/`)
- Keywords: "Electron", "desktop", "window", "IPC", "renderer", "main process", "React", "UI"
- Intent patterns: "create component", "add screen", "implement window", "desktop feature"

---

## Overview

This skill provides guidance for building desktop applications using:
- **Electron**: Cross-platform desktop app framework
- **React**: UI component library
- **TypeScript**: Type-safe JavaScript
- **Vite** (recommended): Fast build tool and dev server

**Key Principles**:
1. Separate concerns: main process vs renderer process
2. Type-safe IPC communication
3. Performance-conscious rendering
4. Graceful error handling
5. Native OS integration when appropriate

---

## Quick Reference

### Common Tasks

| Task | See Resource File | Key Patterns |
|------|------------------|--------------|
| Project structure | `structure.md` | Main/renderer separation |
| State management | `state-management.md` | Context, hooks, local state |
| IPC between processes | `ipc-and-api.md` | Typed channels, preload scripts |
| API calls to backend | `ipc-and-api.md` | REST client, error handling |
| UI patterns | `ux-patterns.md` | Search bars, grids, modals |
| File system access | `ipc-and-api.md` | Dialog APIs, path handling |
| Build & packaging | `structure.md` | Electron Builder config |

### Resource Files

1. **structure.md**: File layout, module organization, naming conventions
2. **state-management.md**: React hooks, Context API, local vs global state
3. **ipc-and-api.md**: IPC patterns, API client setup, when to use each
4. **ux-patterns.md**: Common UI components, keyboard shortcuts, accessibility

---

## Core Concepts

### Electron Architecture

Electron apps have two main process types:

```
┌─────────────────────────────────────┐
│       Main Process (Node.js)        │
│  - Window management                │
│  - Native OS APIs                   │
│  - File system access               │
│  - App lifecycle                    │
└──────────────┬──────────────────────┘
               │
               │ IPC
               │
┌──────────────┴──────────────────────┐
│   Renderer Process (Chromium)       │
│  - React UI                         │
│  - User interactions                │
│  - HTTP requests to backend         │
│  - Limited Node.js access           │
└─────────────────────────────────────┘
```

**Main Process**:
- One per application
- Full Node.js access
- Creates and manages windows
- Handles native APIs (file dialogs, menus, notifications)

**Renderer Process**:
- One per window
- Runs the web UI (React)
- Limited Node.js access (via preload scripts)
- Communicates with main via IPC

**Preload Scripts**:
- Bridges main and renderer
- Exposes safe APIs to renderer
- Type-safe IPC channels

### When to Use IPC vs Direct Backend API Calls

**Use IPC (main process) for**:
- File system operations
- Native OS features (notifications, dialogs)
- App-level operations (quit, hide, minimize)

**Use Direct HTTP API Calls (renderer) for**:
- Backend service requests (search, indexing status)
- Data fetching
- Long-running operations with progress updates

See `ipc-and-api.md` for detailed patterns.

---

## Development Workflow

### 1. Starting the App

Typical dev setup:

```bash
# Terminal 1: Start Vite dev server (renderer)
pnpm dev

# Terminal 2: Start Electron (main process)
pnpm electron:dev
```

Or combined:
```bash
pnpm dev:desktop
```

### 2. Hot Reload

- **Renderer**: Vite provides instant HMR (Hot Module Replacement)
- **Main process**: Requires restart (use `electron-reloader` for auto-restart)

### 3. Debugging

**Renderer**:
- Open DevTools in Electron window (View → Toggle Developer Tools)
- Or: `webContents.openDevTools()` in main process

**Main Process**:
- Use `console.log()` (appears in terminal)
- Or: VS Code debugger with `launch.json` config

---

## Best Practices

### TypeScript

1. **Strict Mode**: Enable `strict: true` in `tsconfig.json`
2. **Type Everything**: Props, state, IPC channels, API responses
3. **No `any`**: Use `unknown` or proper types

Example:
```typescript
// Good
interface SearchResult {
  path: string;
  score: number;
}

async function search(query: string): Promise<SearchResult[]> {
  // ...
}

// Bad
async function search(query: any): Promise<any> {
  // ...
}
```

### React Components

1. **Functional Components**: Use hooks, not class components
2. **Single Responsibility**: One component, one purpose
3. **Props Interface**: Always define prop types

Example:
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchBar({ onSearch, placeholder, disabled }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

### Error Handling

1. **User-Facing Errors**: Show friendly messages
2. **Developer Errors**: Log to console with context
3. **IPC Errors**: Handle in both main and renderer

Example:
```typescript
try {
  const results = await api.search(query);
  setResults(results);
} catch (error) {
  console.error('Search failed:', error);
  setErrorMessage('Search failed. Please try again.');
}
```

### Performance

1. **Memoization**: Use `useMemo` and `useCallback` for expensive operations
2. **Lazy Loading**: Code-split large components
3. **Virtualization**: Use libraries like `react-window` for large lists
4. **Debouncing**: Delay API calls on rapid user input

Example:
```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    api.search(query).then(setResults);
  }, 300),
  []
);
```

---

## Common Patterns

### 1. Folder Selection (Native Dialog)

**Main Process** (`main.ts`):
```typescript
import { dialog, ipcMain } from 'electron';

ipcMain.handle('select-folders', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections']
  });
  return result.filePaths;
});
```

**Preload** (`preload.ts`):
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  selectFolders: () => ipcRenderer.invoke('select-folders')
});
```

**Renderer** (React component):
```typescript
const [folders, setFolders] = useState<string[]>([]);

const handleSelectFolders = async () => {
  const selected = await window.electron.selectFolders();
  setFolders(selected);
};
```

### 2. API Client Setup

**Client** (`src/api/client.ts`):
```typescript
const API_BASE_URL = 'http://localhost:8000';

export class ApiClient {
  async search(query: string): Promise<SearchResult[]> {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
```

### 3. Loading States

```typescript
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

function SearchScreen() {
  const [state, setState] = useState<LoadingState>('idle');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setState('loading');
    setError(null);

    try {
      const data = await apiClient.search(query);
      setResults(data);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  };

  return (
    <div>
      {state === 'loading' && <Spinner />}
      {state === 'error' && <ErrorMessage message={error} />}
      {state === 'success' && <ResultsGrid results={results} />}
    </div>
  );
}
```

---

## Testing

### Unit Tests (Components)

Use **Vitest** + **React Testing Library**:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('calls onSearch when form is submitted', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });
});
```

### Integration Tests (IPC)

Mock Electron APIs:

```typescript
import { vi } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn()
  }
}));
```

---

## Common Pitfalls

### 1. Mixing Main and Renderer Code

**Problem**: Importing Node.js modules directly in renderer
```typescript
// ❌ Bad: In renderer component
import fs from 'fs';
```

**Solution**: Use IPC or preload scripts
```typescript
// ✅ Good: In main process, expose via IPC
ipcMain.handle('read-file', async (_, path) => {
  return fs.readFile(path, 'utf-8');
});
```

### 2. Not Handling Async Errors

**Problem**: Unhandled promise rejections
```typescript
// ❌ Bad
function loadData() {
  apiClient.getData(); // No error handling
}
```

**Solution**: Always use try-catch or .catch()
```typescript
// ✅ Good
async function loadData() {
  try {
    const data = await apiClient.getData();
    // ...
  } catch (error) {
    console.error('Failed to load data:', error);
    showErrorToUser('Failed to load data');
  }
}
```

### 3. Unnecessary Re-renders

**Problem**: Creating new objects/functions on every render
```typescript
// ❌ Bad
function MyComponent() {
  const handleClick = () => { /* ... */ }; // New function every render
  return <Button onClick={handleClick} />;
}
```

**Solution**: Use useCallback
```typescript
// ✅ Good
function MyComponent() {
  const handleClick = useCallback(() => { /* ... */ }, []);
  return <Button onClick={handleClick} />;
}
```

---

## Additional Resources

For detailed information on specific topics, see:

- **structure.md**: Project file organization and module layout
- **state-management.md**: React state patterns, Context API, custom hooks
- **ipc-and-api.md**: IPC communication patterns and backend API integration
- **ux-patterns.md**: Common UI patterns, keyboard shortcuts, accessibility

---

## Checklist for New Desktop UI Features

Before considering a desktop UI feature complete:

- [ ] TypeScript types defined for all props, state, API responses
- [ ] Error handling implemented (user-facing and developer logging)
- [ ] Loading states shown to user
- [ ] IPC channels use typed preload scripts (if applicable)
- [ ] API calls have proper error handling and timeouts
- [ ] Components are tested (at least critical paths)
- [ ] Keyboard shortcuts work (if applicable)
- [ ] UI is responsive and performs well with large datasets
- [ ] DevTools console shows no errors or warnings
- [ ] Code is linted and formatted

---

**Last Updated**: 2025-11-05
**Skill Version**: 1.0.0
