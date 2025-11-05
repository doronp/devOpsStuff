# State Management

This document covers state management patterns for React desktop applications using hooks and Context API.

---

## State Management Overview

### Types of State

1. **Local State**: Component-specific data (e.g., form input values)
2. **Shared State**: Data needed by multiple components (e.g., user preferences)
3. **Server State**: Data from backend APIs (e.g., search results)
4. **URL State**: Navigation and routing state

### When to Use What

| State Type | Tool | Example |
|------------|------|---------|
| Local, single component | `useState` | Form input, toggle state |
| Derived from props | `useMemo` | Filtered/sorted lists |
| Side effects | `useEffect` | API calls, subscriptions |
| Expensive computation | `useMemo` | Heavy calculations |
| Callback stability | `useCallback` | Event handlers |
| Shared across tree | Context API | Theme, user settings |
| Server data | Custom hooks | Search results, indexing status |

---

## Local State with useState

### Basic Usage

```typescript
import { useState } from 'react';

function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

### Complex State Objects

**Approach 1: Multiple useState calls** (Recommended)

```typescript
function FolderSelector() {
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Easy to update individual pieces
  setIsLoading(true);
  setError('Failed to load');
}
```

**Approach 2: Single state object**

```typescript
interface State {
  folders: string[];
  isLoading: boolean;
  error: string | null;
}

function FolderSelector() {
  const [state, setState] = useState<State>({
    folders: [],
    isLoading: false,
    error: null
  });

  // Must spread to preserve other properties
  setState(prev => ({ ...prev, isLoading: true }));
}
```

Recommendation: Use multiple `useState` calls unless state pieces are always updated together.

### State Updates Based on Previous State

```typescript
// ❌ Bad: Doesn't use previous state
const handleAdd = (item: string) => {
  setItems([...items, item]);
};

// ✅ Good: Uses functional update
const handleAdd = (item: string) => {
  setItems(prev => [...prev, item]);
};
```

---

## Derived State with useMemo

Use `useMemo` for expensive computations based on props or state.

```typescript
import { useMemo } from 'react';

interface Props {
  results: SearchResult[];
  minScore: number;
}

function ResultsGrid({ results, minScore }: Props) {
  // Only recompute when results or minScore changes
  const filteredResults = useMemo(
    () => results.filter(r => r.score >= minScore),
    [results, minScore]
  );

  return (
    <div>
      {filteredResults.map(result => (
        <ResultCard key={result.path} result={result} />
      ))}
    </div>
  );
}
```

**When NOT to use useMemo**:
- Simple calculations (array.length, object.property)
- Rarely re-rendering components
- Arrays with < 100 items

---

## Side Effects with useEffect

### API Calls

```typescript
import { useEffect, useState } from 'react';

function IndexingStatus() {
  const [status, setStatus] = useState<IndexStatus | null>(null);

  useEffect(() => {
    // Fetch on mount
    const fetchStatus = async () => {
      const data = await api.getIndexingStatus();
      setStatus(data);
    };

    fetchStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000);

    // Cleanup
    return () => clearInterval(interval);
  }, []); // Empty deps = run once on mount

  return <div>{status?.progress}%</div>;
}
```

### Cleanup Functions

Always clean up side effects:

```typescript
useEffect(() => {
  // Subscribe
  const subscription = api.onProgress(handleProgress);

  // Cleanup on unmount
  return () => subscription.unsubscribe();
}, []);
```

### Dependencies

```typescript
// ✅ Good: All used variables in deps
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ❌ Bad: Missing dependency
useEffect(() => {
  fetchData(userId);
}, []); // Warning: missing userId

// ❌ Bad: Unnecessary dependency
useEffect(() => {
  console.log('Mounted');
}, [userId]); // userId not used, effect runs on every change
```

---

## Callback Memoization with useCallback

Use `useCallback` to prevent unnecessary re-renders of child components.

```typescript
import { useCallback, useState } from 'react';

function SearchScreen() {
  const [results, setResults] = useState<SearchResult[]>([]);

  // Without useCallback: new function on every render
  // SearchBar would re-render even if results don't change
  const handleSearch = useCallback(async (query: string) => {
    const data = await api.search(query);
    setResults(data);
  }, []); // No deps: function never changes

  return <SearchBar onSearch={handleSearch} />;
}
```

**When to use useCallback**:
- Passing callbacks to memoized child components
- Callbacks used in useEffect dependencies
- Expensive child component re-renders

**When NOT needed**:
- Simple event handlers
- Callbacks not passed to children

---

## Context API for Shared State

### Creating a Context

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

interface AppState {
  folders: string[];
  addFolder: (folder: string) => void;
  removeFolder: (folder: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export function AppProvider({ children }: Props) {
  const [folders, setFolders] = useState<string[]>([]);

  const addFolder = (folder: string) => {
    setFolders(prev => [...prev, folder]);
  };

  const removeFolder = (folder: string) => {
    setFolders(prev => prev.filter(f => f !== folder));
  };

  const value: AppState = {
    folders,
    addFolder,
    removeFolder
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook for consuming context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

### Using the Context

```typescript
// Wrap app with provider
function App() {
  return (
    <AppProvider>
      <SearchScreen />
    </AppProvider>
  );
}

// Consume in any component
function FolderList() {
  const { folders, removeFolder } = useApp();

  return (
    <ul>
      {folders.map(folder => (
        <li key={folder}>
          {folder}
          <button onClick={() => removeFolder(folder)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```

### Context Performance Optimization

**Problem**: All consumers re-render when any part of context changes.

**Solution 1**: Split contexts by concern

```typescript
// Separate read-only and mutable state
const FoldersContext = createContext<string[]>([]);
const FoldersActionsContext = createContext<FolderActions>({} as FolderActions);

// Components only re-render when their specific context changes
```

**Solution 2**: Memoize context value

```typescript
export function AppProvider({ children }: Props) {
  const [folders, setFolders] = useState<string[]>([]);

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      folders,
      addFolder: (folder: string) => setFolders(prev => [...prev, folder]),
      removeFolder: (folder: string) => setFolders(prev => prev.filter(f => f !== folder))
    }),
    [folders]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

---

## Custom Hooks

Extract reusable stateful logic into custom hooks.

### Example: useSearch Hook

```typescript
import { useState, useCallback } from 'react';
import { apiClient } from '@/api/client';

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null
  });

  const search = useCallback(async (query: string) => {
    setState({ results: [], isLoading: true, error: null });

    try {
      const results = await apiClient.search(query);
      setState({ results, isLoading: false, error: null });
    } catch (err) {
      setState({
        results: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Search failed'
      });
    }
  }, []);

  const clear = useCallback(() => {
    setState({ results: [], isLoading: false, error: null });
  }, []);

  return {
    ...state,
    search,
    clear
  };
}
```

### Using the Hook

```typescript
function SearchScreen() {
  const { results, isLoading, error, search } = useSearch();

  return (
    <div>
      <SearchBar onSearch={search} disabled={isLoading} />
      {isLoading && <Spinner />}
      {error && <ErrorMessage message={error} />}
      {results.length > 0 && <ResultsGrid results={results} />}
    </div>
  );
}
```

### Example: useDebounce Hook

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

Usage:
```typescript
function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### Example: useIndexingStatus Hook

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

interface IndexingStatus {
  state: 'idle' | 'running' | 'complete' | 'error';
  total: number;
  indexed: number;
  error?: string;
}

export function useIndexingStatus(pollInterval = 1000) {
  const [status, setStatus] = useState<IndexingStatus>({
    state: 'idle',
    total: 0,
    indexed: 0
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await apiClient.getIndexingStatus();
        setStatus(data);
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          error: error instanceof Error ? error.message : 'Failed to fetch status'
        }));
      }
    };

    fetchStatus();

    // Only poll if indexing is running
    if (status.state === 'running') {
      const interval = setInterval(fetchStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [status.state, pollInterval]);

  return status;
}
```

---

## State Management Patterns

### Loading States

```typescript
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

function DataComponent() {
  const [state, setState] = useState<LoadingState>('idle');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setState('loading');
    try {
      const result = await api.fetchData();
      setData(result);
      setState('success');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  return (
    <div>
      {state === 'idle' && <button onClick={loadData}>Load</button>}
      {state === 'loading' && <Spinner />}
      {state === 'error' && <ErrorMessage message={error} />}
      {state === 'success' && <DataDisplay data={data} />}
    </div>
  );
}
```

### Optimistic Updates

Update UI immediately, revert on error:

```typescript
function FolderList() {
  const [folders, setFolders] = useState<string[]>([]);

  const removeFolder = async (folder: string) => {
    // Optimistically remove
    setFolders(prev => prev.filter(f => f !== folder));

    try {
      await api.removeFolder(folder);
    } catch (error) {
      // Revert on error
      setFolders(prev => [...prev, folder]);
      showError('Failed to remove folder');
    }
  };

  return (
    <ul>
      {folders.map(folder => (
        <li key={folder}>
          {folder}
          <button onClick={() => removeFolder(folder)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```

### Pagination

```typescript
interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

function usePagination(initialPageSize = 20) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    pageSize: initialPageSize,
    total: 0
  });

  const nextPage = () => {
    setPagination(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, Math.floor(prev.total / prev.pageSize))
    }));
  };

  const prevPage = () => {
    setPagination(prev => ({ ...prev, page: Math.max(0, prev.page - 1) }));
  };

  const setTotal = (total: number) => {
    setPagination(prev => ({ ...prev, total }));
  };

  return {
    ...pagination,
    nextPage,
    prevPage,
    setTotal,
    hasNext: pagination.page < Math.floor(pagination.total / pagination.pageSize),
    hasPrev: pagination.page > 0
  };
}
```

---

## Common Pitfalls

### 1. Stale Closures

**Problem**: useEffect or useCallback references old state/props

```typescript
// ❌ Bad
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1); // Always uses initial count (0)
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty deps = stale closure

  return <div>{count}</div>;
}
```

**Solution**: Use functional updates

```typescript
// ✅ Good
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1); // Uses current count
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

### 2. Unnecessary Re-renders

**Problem**: Creating new objects/arrays on every render

```typescript
// ❌ Bad
function Parent() {
  return <Child items={[1, 2, 3]} />; // New array every render
}
```

**Solution**: Define outside or use useMemo

```typescript
// ✅ Good
const ITEMS = [1, 2, 3];

function Parent() {
  return <Child items={ITEMS} />;
}
```

### 3. Setting State After Unmount

**Problem**: Async operation completes after component unmounts

```typescript
// ❌ Bad
useEffect(() => {
  fetchData().then(data => {
    setState(data); // May error if unmounted
  });
}, []);
```

**Solution**: Check if mounted

```typescript
// ✅ Good
useEffect(() => {
  let isMounted = true;

  fetchData().then(data => {
    if (isMounted) {
      setState(data);
    }
  });

  return () => {
    isMounted = false;
  };
}, []);
```

---

## Best Practices

1. **Start with local state**: Only lift to context when truly shared
2. **Colocate state**: Keep state close to where it's used
3. **Use custom hooks**: Extract reusable logic
4. **Memoize appropriately**: Don't over-optimize, but memoize expensive operations
5. **Keep effects focused**: One effect per concern
6. **Clean up side effects**: Always return cleanup functions
7. **Type everything**: Use TypeScript for state, props, and context

---

**Last Updated**: 2025-11-05
