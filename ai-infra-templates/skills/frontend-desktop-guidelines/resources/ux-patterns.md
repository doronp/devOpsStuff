# UX Patterns for Desktop Applications

This document covers common UI/UX patterns for desktop applications built with Electron and React.

---

## Search Interface Patterns

### Basic Search Bar

```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  disabled = false,
  autoFocus = true
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="search-input"
      />
      <button
        type="submit"
        disabled={disabled || !query.trim()}
        className="search-button"
      >
        Search
      </button>
    </form>
  );
}
```

### Search with Debouncing (Live Search)

```typescript
import { useDebounce } from '@/hooks/useDebounce';

interface LiveSearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
  minQueryLength?: number;
}

export function LiveSearchBar({
  onSearch,
  debounceMs = 300,
  minQueryLength = 2
}: LiveSearchBarProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (debouncedQuery.length >= minQueryLength) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch, minQueryLength]);

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Type to search..."
      className="search-input"
    />
  );
}
```

### Search with Suggestions

```typescript
interface SearchWithSuggestionsProps {
  onSearch: (query: string) => void;
  suggestions: string[];
}

export function SearchWithSuggestions({
  onSearch,
  suggestions
}: SearchWithSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  return (
    <div className="search-with-suggestions">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onFocus={() => setShowSuggestions(true)}
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="suggestions-list">
          {filteredSuggestions.map((suggestion, i) => (
            <li
              key={i}
              onClick={() => handleSelect(suggestion)}
              className="suggestion-item"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Results Display Patterns

### Grid Layout

```typescript
interface ResultsGridProps {
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
}

export function ResultsGrid({ results, onResultClick }: ResultsGridProps) {
  if (results.length === 0) {
    return <EmptyState message="No results found" />;
  }

  return (
    <div className="results-grid">
      {results.map((result) => (
        <ResultCard
          key={result.path}
          result={result}
          onClick={() => onResultClick?.(result)}
        />
      ))}
    </div>
  );
}

// CSS
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
}
```

### Virtual Scrolling (for large lists)

Use `react-window` or `react-virtualized` for performance:

```typescript
import { FixedSizeGrid as Grid } from 'react-window';

interface VirtualizedGridProps {
  results: SearchResult[];
  containerWidth: number;
  containerHeight: number;
}

export function VirtualizedGrid({
  results,
  containerWidth,
  containerHeight
}: VirtualizedGridProps) {
  const columnCount = Math.floor(containerWidth / 220);
  const rowCount = Math.ceil(results.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= results.length) return null;

    return (
      <div style={style}>
        <ResultCard result={results[index]} />
      </div>
    );
  };

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={220}
      height={containerHeight}
      rowCount={rowCount}
      rowHeight={240}
      width={containerWidth}
    >
      {Cell}
    </Grid>
  );
}
```

### Result Card with Preview

```typescript
interface ResultCardProps {
  result: SearchResult;
  onClick?: () => void;
}

export function ResultCard({ result, onClick }: ResultCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="result-card" onClick={onClick}>
      <div className="result-image">
        {!imageError ? (
          <img
            src={`file://${result.path}`}
            alt={result.path}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="image-error">Failed to load</div>
        )}
      </div>

      <div className="result-info">
        <div className="result-score">
          {(result.score * 100).toFixed(1)}%
        </div>
        <div className="result-path" title={result.path}>
          {result.path.split('/').pop()}
        </div>
      </div>
    </div>
  );
}

// CSS
.result-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.result-card:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.result-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f5f5f5;
}

.result-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## Loading States

### Spinner

```typescript
export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div className="spinner-container">
      <div
        className="spinner"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// CSS
.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Skeleton Loader

```typescript
export function ResultCardSkeleton() {
  return (
    <div className="result-card skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-text" />
      <div className="skeleton-text short" />
    </div>
  );
}

// CSS
.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: #e0e0e0;
}

.skeleton-text {
  height: 16px;
  margin: 8px;
  background: #e0e0e0;
  border-radius: 4px;
}

.skeleton-text.short {
  width: 60%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Progress Bar

```typescript
interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="progress-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-text">
        {current} / {total} ({percentage.toFixed(0)}%)
      </div>
    </div>
  );
}

// CSS
.progress-bar {
  width: 100%;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.3s ease;
}
```

---

## Error Handling UI

### Error Message

```typescript
interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({
  message,
  onRetry,
  onDismiss
}: ErrorMessageProps) {
  return (
    <div className="error-message">
      <div className="error-icon">⚠️</div>
      <div className="error-text">{message}</div>
      <div className="error-actions">
        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            Retry
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="dismiss-button">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// CSS
.error-message {
  padding: 16px;
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### Toast Notifications

```typescript
import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Context for managing toasts
const ToastContext = createContext<{
  showToast: (message: string, type: ToastType) => void;
}>({} as any);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// CSS
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.toast {
  padding: 12px 20px;
  margin-top: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

.toast-success { background: #4caf50; color: white; }
.toast-error { background: #f44336; color: white; }
.toast-info { background: #2196f3; color: white; }

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

---

## Modals and Dialogs

### Basic Modal

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// CSS
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

### Image Preview Modal

```typescript
interface ImagePreviewProps {
  imagePath: string | null;
  onClose: () => void;
}

export function ImagePreview({ imagePath, onClose }: ImagePreviewProps) {
  if (!imagePath) return null;

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="image-preview-content">
        <button onClick={onClose} className="close-button">×</button>
        <img src={`file://${imagePath}`} alt="Preview" />
        <div className="image-path">{imagePath}</div>
      </div>
    </div>
  );
}
```

---

## Empty States

```typescript
interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon = '🔍',
  title = 'No Results',
  message,
  action
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action && (
        <button onClick={action.onClick} className="empty-action">
          {action.label}
        </button>
      )}
    </div>
  );
}

// CSS
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
```

---

## Keyboard Shortcuts

### Global Shortcuts

```typescript
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  } = {}
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (modifiers.ctrl && !e.ctrlKey) return;
      if (modifiers.shift && !e.shiftKey) return;
      if (modifiers.alt && !e.altKey) return;

      e.preventDefault();
      callback();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, modifiers]);
}

// Usage
function SearchScreen() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K to focus search
  useKeyboardShortcut('k', () => {
    searchInputRef.current?.focus();
  }, { ctrl: true });

  // Escape to clear
  useKeyboardShortcut('Escape', () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.blur();
    }
  });

  return <input ref={searchInputRef} />;
}
```

### Arrow Key Navigation

```typescript
export function useArrowKeyNavigation(
  itemCount: number,
  onSelect: (index: number) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, itemCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(selectedIndex);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [itemCount, selectedIndex, onSelect]);

  return selectedIndex;
}
```

---

## Drag and Drop

### File/Folder Drop Zone

```typescript
export function DropZone({
  onDrop
}: {
  onDrop: (paths: string[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const paths = Array.from(e.dataTransfer.files).map(f => f.path);
    onDrop(paths);
  };

  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? 'Drop folders here' : 'Drag folders here'}
    </div>
  );
}

// CSS
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s;
}

.drop-zone.dragging {
  border-color: #2196f3;
  background: #e3f2fd;
}
```

---

## Accessibility

### Screen Reader Support

```typescript
// Use semantic HTML
<button aria-label="Search">🔍</button>

// Announce dynamic content changes
<div role="status" aria-live="polite">
  {isLoading ? 'Loading results...' : `Found ${results.length} results`}
</div>

// Focus management
const firstResultRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (results.length > 0) {
    firstResultRef.current?.focus();
  }
}, [results]);
```

### Keyboard Navigation

```typescript
// Ensure all interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click me
</div>
```

---

## Performance Tips

1. **Virtualize long lists**: Use `react-window` for 100+ items
2. **Lazy load images**: Use loading="lazy" or intersection observer
3. **Debounce user input**: Especially for search/filter
4. **Memoize expensive renders**: Use `React.memo` for pure components
5. **Code split large features**: Use `React.lazy` and `Suspense`

---

## Checklist for UX Polish

- [ ] Loading states for all async operations
- [ ] Error messages with retry options
- [ ] Empty states with helpful guidance
- [ ] Keyboard shortcuts for common actions
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Responsive to different window sizes
- [ ] Smooth transitions and animations
- [ ] Clear visual feedback for interactions
- [ ] Consistent spacing and typography
- [ ] Dark mode support (if applicable)

---

**Last Updated**: 2025-11-05
