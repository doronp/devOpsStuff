# IPC and API Communication

This document covers Inter-Process Communication (IPC) between Electron main and renderer processes, and HTTP API communication with backend services.

---

## When to Use IPC vs API Calls

### Use IPC (main process) for:

- **File system operations**: Reading/writing files, folder selection
- **Native OS APIs**: Notifications, system dialogs, clipboard
- **App-level control**: Quit, minimize, hide, show
- **System integration**: Global shortcuts, tray icons, protocol handlers
- **Security-sensitive operations**: Anything requiring elevated privileges

### Use Direct API Calls (renderer) for:

- **Backend service communication**: Search, indexing, data operations
- **HTTP/REST endpoints**: Any network-based service
- **Real-time updates**: WebSocket connections, polling
- **Data fetching**: Getting/posting data to your backend

**General Rule**: IPC for OS/native features, API calls for your backend service.

---

## IPC Communication

### Architecture

```
┌─────────────────────────────────────┐
│         Renderer Process            │
│   window.electron.someMethod()      │
└──────────────┬──────────────────────┘
               │
               │ contextBridge
               │
┌──────────────┴──────────────────────┐
│         Preload Script              │
│   ipcRenderer.invoke('channel')     │
└──────────────┬──────────────────────┘
               │
               │ IPC
               │
┌──────────────┴──────────────────────┐
│         Main Process                │
│   ipcMain.handle('channel', ...)    │
└─────────────────────────────────────┘
```

### Setting Up Type-Safe IPC

#### 1. Define API Interface

`src/types/electron.d.ts`:

```typescript
export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;

  // File operations
  selectFolders: () => Promise<string[]>;
  selectFile: (filters?: FileFilter[]) => Promise<string | null>;
  openPath: (path: string) => Promise<void>;

  // Native features
  showNotification: (title: string, body: string) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

#### 2. Implement in Main Process

`electron/main.ts`:

```typescript
import { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Notification } from 'electron';

function setupIpcHandlers() {
  // App info
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  // File operations
  ipcMain.handle('select-folders', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections']
    });
    return result.filePaths;
  });

  ipcMain.handle('select-file', async (_, filters?: FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle('open-path', async (_, path: string) => {
    await shell.openPath(path);
  });

  // Native features
  ipcMain.handle('show-notification', async (_, title: string, body: string) => {
    new Notification({ title, body }).show();
  });

  ipcMain.handle('copy-to-clipboard', async (_, text: string) => {
    clipboard.writeText(text);
  });
}

// Call in app.on('ready')
app.on('ready', () => {
  createWindow();
  setupIpcHandlers();
});
```

#### 3. Expose in Preload Script

`electron/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, FileFilter } from '../src/types/electron';

const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:version'),

  selectFolders: () => ipcRenderer.invoke('select-folders'),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  openPath: (path) => ipcRenderer.invoke('open-path', path),

  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text)
};

contextBridge.exposeInMainWorld('electron', electronAPI);
```

#### 4. Use in Renderer

```typescript
// React component
function FolderSelector() {
  const [folders, setFolders] = useState<string[]>([]);

  const handleSelectFolders = async () => {
    try {
      const selected = await window.electron.selectFolders();
      setFolders(selected);
    } catch (error) {
      console.error('Failed to select folders:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSelectFolders}>Select Folders</button>
      <ul>
        {folders.map(folder => (
          <li key={folder}>{folder}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## IPC Patterns

### One-Way Communication (Fire and Forget)

Use `send` instead of `invoke` when you don't need a response:

**Main**:
```typescript
ipcMain.on('log-message', (_, message: string) => {
  console.log('Renderer logged:', message);
});
```

**Preload**:
```typescript
contextBridge.exposeInMainWorld('electron', {
  log: (message: string) => ipcRenderer.send('log-message', message)
});
```

**Renderer**:
```typescript
window.electron.log('Something happened');
```

### Main to Renderer Communication

Use `webContents.send` to send messages from main to renderer:

**Main**:
```typescript
function sendToRenderer(window: BrowserWindow, channel: string, data: any) {
  window.webContents.send(channel, data);
}

// Example: notify renderer of indexing progress
function notifyIndexingProgress(progress: number) {
  mainWindow?.webContents.send('indexing-progress', progress);
}
```

**Preload**:
```typescript
contextBridge.exposeInMainWorld('electron', {
  onIndexingProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('indexing-progress', (_, progress) => callback(progress));

    // Return cleanup function
    return () => ipcRenderer.removeAllListeners('indexing-progress');
  }
});
```

**Renderer**:
```typescript
useEffect(() => {
  const cleanup = window.electron.onIndexingProgress((progress) => {
    setProgress(progress);
  });

  return cleanup;
}, []);
```

---

## API Client for Backend Communication

### Setting Up the Client

`src/api/client.ts`:

```typescript
import type { SearchResult, IndexStatus, IndexRequest } from './types';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          error.message || response.statusText
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Network error: ' + (error as Error).message);
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // API methods
  async search(query: string, topK: number = 50): Promise<SearchResult[]> {
    return this.post<SearchResult[]>('/search', { query, top_k: topK });
  }

  async startIndexing(folders: string[]): Promise<void> {
    await this.post('/index/start', { folders });
  }

  async getIndexingStatus(): Promise<IndexStatus> {
    return this.get<IndexStatus>('/index/status');
  }

  async checkHealth(): Promise<{ status: string }> {
    return this.get('/health');
  }
}

// Singleton instance
export const apiClient = new ApiClient();
```

### API Types

`src/api/types.ts`:

```typescript
export interface SearchResult {
  path: string;
  score: number;
}

export interface IndexStatus {
  state: 'idle' | 'running' | 'complete' | 'error';
  total: number;
  indexed: number;
  error?: string;
}

export interface IndexRequest {
  folders: string[];
}
```

### Custom Error Class

`src/api/errors.ts`:

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}
```

### Using the API Client

```typescript
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';

function SearchScreen() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.search(query);
      setResults(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isNetworkError) {
          setError('Cannot connect to backend. Is it running?');
        } else {
          setError(`Search failed: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <SearchBar onSearch={handleSearch} disabled={isLoading} />
      {error && <ErrorMessage message={error} />}
      {isLoading && <Spinner />}
      {results.length > 0 && <ResultsGrid results={results} />}
    </div>
  );
}
```

---

## Advanced API Patterns

### Request Cancellation

Use `AbortController` to cancel requests:

```typescript
export class ApiClient {
  async search(
    query: string,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    return this.request<SearchResult[]>('/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
      signal // Pass abort signal
    });
  }
}

// Usage
function SearchScreen() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = async (query: string) => {
    // Cancel previous request
    abortControllerRef.current?.abort();

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const results = await apiClient.search(query, controller.signal);
      setResults(results);
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      // Handle other errors
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);
}
```

### Retry Logic

```typescript
async function requestWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError!;
}

// Usage
const results = await requestWithRetry(
  () => apiClient.search(query),
  3,
  1000
);
```

### Request Timeout

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// Usage
const results = await withTimeout(
  apiClient.search(query),
  5000 // 5 second timeout
);
```

### Polling

```typescript
function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const result = await fetchFn();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as Error);
      }
    };

    poll(); // Initial fetch
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [fetchFn, interval, enabled]);

  return { data, error };
}

// Usage
function IndexingStatus() {
  const { data: status } = usePolling(
    () => apiClient.getIndexingStatus(),
    2000, // Poll every 2 seconds
    true
  );

  return <div>{status?.indexed} / {status?.total}</div>;
}
```

---

## Configuration

### Environment-Based Config

`src/config.ts`:

```typescript
const ENV = import.meta.env.MODE; // Vite

export const config = {
  api: {
    baseURL: ENV === 'production'
      ? 'http://localhost:8000'
      : 'http://localhost:8000'
  },
  features: {
    devTools: ENV === 'development'
  }
};
```

### User-Configurable Settings

Store in Electron's app data:

**Main process**:
```typescript
import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

export async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return getDefaultConfig();
  }
}

export async function saveConfig(config: Config) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Expose via IPC
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (_, config) => saveConfig(config));
```

---

## Security Best Practices

### 1. Context Isolation

Always enable in `BrowserWindow`:

```typescript
new BrowserWindow({
  webPreferences: {
    contextIsolation: true, // ✅ Must be enabled
    nodeIntegration: false, // ✅ Must be disabled
    preload: path.join(__dirname, 'preload.js')
  }
});
```

### 2. Validate IPC Input

```typescript
// ❌ Bad: No validation
ipcMain.handle('delete-file', async (_, filePath: string) => {
  await fs.unlink(filePath); // Dangerous!
});

// ✅ Good: Validate input
ipcMain.handle('delete-file', async (_, filePath: string) => {
  // Ensure path is within allowed directory
  const allowedDir = app.getPath('userData');
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(allowedDir)) {
    throw new Error('Invalid file path');
  }

  await fs.unlink(resolvedPath);
});
```

### 3. Sanitize API Responses

```typescript
// Don't trust backend responses
interface UntrustedData {
  path: string;
  score: number;
  [key: string]: unknown; // May have extra fields
}

function sanitizeSearchResult(data: UntrustedData): SearchResult {
  return {
    path: String(data.path),
    score: Number(data.score)
  };
}
```

---

## Testing

### Mocking IPC

```typescript
import { vi } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn()
  }
}));

// Test
test('selects folders', async () => {
  const mockFolders = ['/path/to/folder'];
  vi.mocked(ipcRenderer.invoke).mockResolvedValue(mockFolders);

  const result = await window.electron.selectFolders();
  expect(result).toEqual(mockFolders);
});
```

### Mocking API Calls

```typescript
import { vi } from 'vitest';
import { apiClient } from '@/api/client';

// Mock fetch
global.fetch = vi.fn();

test('searches successfully', async () => {
  const mockResults = [{ path: '/image.jpg', score: 0.9 }];

  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => mockResults
  } as Response);

  const results = await apiClient.search('test');
  expect(results).toEqual(mockResults);
});
```

---

**Last Updated**: 2025-11-05
