# UI Flows - OpenCLIP Desktop

## Overview

The application has three main screens:
1. **Folder Selection**: Choose folders to index
2. **Indexing Status**: Monitor indexing progress
3. **Search**: Query and browse results

---

## Screen: Folder Selection

### Purpose
Allow users to select one or more folders containing images to index.

### Layout

```
┌─────────────────────────────────────────────┐
│  OpenCLIP Desktop - Image Search            │
├─────────────────────────────────────────────┤
│                                             │
│   Welcome! Select folders to search.        │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │  Select Folders                    │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   Selected folders:                         │
│   ┌─────────────────────────────────────┐  │
│   │  /Users/me/Pictures           [X]   │  │
│   │  /Users/me/Photos             [X]   │  │
│   │                                     │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │  Start Indexing                     │  │
│   └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Components

1. **Select Folders Button**
   - Opens native folder picker (multi-select)
   - Adds selected folders to list below
   - Keyboard: Ctrl+O / Cmd+O

2. **Folders List**
   - Shows selected folder paths
   - Each has [X] button to remove
   - Empty state: "No folders selected"

3. **Start Indexing Button**
   - Enabled only when folders selected
   - Sends folders to backend
   - Transitions to Indexing Status screen

### User Flow

```
User opens app
    ↓
Clicks "Select Folders"
    ↓
Native folder dialog opens
    ↓
User selects one or more folders
    ↓
Folders added to list
    ↓
(Optional) User removes unwanted folders with [X]
    ↓
Clicks "Start Indexing"
    ↓
API: POST /index/start
    ↓
Transition to Indexing Status screen
```

### Validation

- At least one folder must be selected to enable "Start Indexing"
- Duplicate folders are ignored
- Non-existent folders show error (caught by backend)

---

## Screen: Indexing Status

### Purpose
Show indexing progress in real-time.

### Layout

```
┌─────────────────────────────────────────────┐
│  OpenCLIP Desktop - Image Search            │
├─────────────────────────────────────────────┤
│                                             │
│   Indexing images...                        │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │  ████████████░░░░░░░░░░░░░  45%    │  │
│   └─────────────────────────────────────┘  │
│                                             │
│   450 of 1,000 images indexed               │
│                                             │
│   Currently indexing:                       │
│   /Users/me/Pictures/vacation/IMG_1234.jpg  │
│                                             │
└─────────────────────────────────────────────┘
```

### Components

1. **Progress Bar**
   - Visual indicator (0-100%)
   - Updates in real-time

2. **Progress Text**
   - "X of Y images indexed"
   - Updates every second

3. **Current File** (optional)
   - Shows file currently being processed
   - Truncate long paths

### States

**Running**:
```
Indexing images...
████████████░░░░░░░░░░░░░  45%
450 of 1,000 images indexed
```

**Complete**:
```
Indexing complete! ✓
████████████████████████████  100%
1,000 of 1,000 images indexed

[Start Searching →]
```

**Error**:
```
Indexing failed ✗
Error: Model failed to load

[Try Again]  [Cancel]
```

### User Flow

```
POST /index/start completes
    ↓
Show progress bar at 0%
    ↓
Poll GET /index/status every 1-2 seconds
    ↓
Update progress bar and text
    ↓
Repeat until state === "complete" or "error"
    ↓
If complete: Show "Start Searching" button
    ↓
User clicks button
    ↓
Transition to Search screen
```

### Polling Logic

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await api.getIndexingStatus();

    setProgress({
      total: status.total,
      indexed: status.indexed,
      state: status.state
    });

    if (status.state === 'complete' || status.state === 'error') {
      clearInterval(interval);
    }
  }, 1000); // Poll every second

  return () => clearInterval(interval);
}, []);
```

---

## Screen: Search

### Purpose
Search indexed images with natural language queries and browse results.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  OpenCLIP Desktop - Image Search                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────┐   [Search]  │
│   │  red sports car at sunset               │             │
│   └─────────────────────────────────────────┘             │
│                                                             │
│   Found 50 results                                          │
│                                                             │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│   │        │  │        │  │        │  │        │          │
│   │  IMG   │  │  IMG   │  │  IMG   │  │  IMG   │          │
│   │        │  │        │  │        │  │        │          │
│   │  95%   │  │  92%   │  │  89%   │  │  87%   │          │
│   └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                             │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│   │        │  │        │  │        │  │        │          │
│   │  IMG   │  │  IMG   │  │  IMG   │  │  IMG   │          │
│   │        │  │        │  │        │  │        │          │
│   │  85%   │  │  83%   │  │  81%   │  │  79%   │          │
│   └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **Search Bar**
   - Text input with placeholder: "Describe what you're looking for..."
   - Search button (or Enter to submit)
   - Clear button (X) when text present
   - Keyboard: Focus on Ctrl+K / Cmd+K

2. **Results Count**
   - "Found X results"
   - Shows after search completes

3. **Results Grid**
   - 4 columns (responsive)
   - Each card shows:
     - Image thumbnail
     - Similarity score (percentage)
     - File name (on hover)
   - Click to open in OS viewer

4. **Empty State** (no results)
   - "No results found"
   - "Try a different search term"

5. **Loading State**
   - Spinner
   - "Searching..."

### States

**Idle** (no search yet):
```
┌─────────────────────────────────────┐
│  Describe what you're looking for   │
└─────────────────────────────────────┘

Search your indexed images using natural language.

Examples:
- "red sports car at sunset"
- "dog playing in park"
- "mountains with snow"
```

**Loading**:
```
┌─────────────────────────────────────┐
│  red sports car at sunset           │
└─────────────────────────────────────┘

[Spinner] Searching...
```

**Results**:
```
┌─────────────────────────────────────┐
│  red sports car at sunset           │
└─────────────────────────────────────┘

Found 50 results

[Grid of image thumbnails]
```

**No Results**:
```
┌─────────────────────────────────────┐
│  unicorn on skateboard              │
└─────────────────────────────────────┘

No results found

Try a different search term or index more images.
```

**Error**:
```
┌─────────────────────────────────────┐
│  red sports car at sunset           │
└─────────────────────────────────────┘

⚠️  Search failed
Cannot connect to backend. Is it running?

[Retry]
```

### User Flow

```
User types query
    ↓
User presses Enter or clicks Search
    ↓
Show loading spinner
    ↓
API: POST /search { query, top_k: 50 }
    ↓
Receive results
    ↓
Render results grid
    ↓
User clicks image
    ↓
Electron: window.electron.openPath(imagePath)
    ↓
OS opens image in default viewer
```

### Result Card Interaction

**On Hover**:
- Scale up slightly (1.05x)
- Show full file path
- Highlight border

**On Click**:
- Open image in OS viewer
- Or: Show full-size preview in modal (future enhancement)

**On Right Click**:
- Context menu:
  - Open in Finder/Explorer
  - Copy path
  - Delete from index (future)

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Focus search bar
- **Escape**: Clear search
- **Arrow keys**: Navigate results (future)
- **Enter**: Open selected result (future)

---

## Navigation

### App Structure

```
┌──────────────────┐
│ Folder Selection │
└────────┬─────────┘
         │
         │ Start Indexing
         ↓
┌──────────────────┐
│ Indexing Status  │
└────────┬─────────┘
         │
         │ Complete
         ↓
┌──────────────────┐
│     Search       │  ←──────┐
└────────┬─────────┘         │
         │                   │
         │ New Search        │
         └───────────────────┘
```

### Navigation Controls

**From Search screen**:
- File menu → "Re-index" → Back to Folder Selection
- File menu → "Clear index" → Confirm → Back to Folder Selection
- Command/Ctrl + R → Reload (stay on same screen)

---

## Responsive Design

### Window Sizes

- **Minimum**: 800x600px
- **Default**: 1200x800px
- **Maximum**: Unrestricted (scales content)

### Grid Columns

- < 900px: 2 columns
- 900px - 1200px: 3 columns
- > 1200px: 4 columns

---

## Accessibility

### Screen Reader Support

- All images have alt text: "Search result, score: 95%"
- ARIA labels on buttons
- Form labels associated with inputs

### Keyboard Navigation

- Tab through interactive elements
- Enter to activate buttons
- Escape to dismiss modals/clear search

### Color Contrast

- Text: WCAG AA compliant
- Focus indicators: Visible outlines

---

## Error Handling

### Network Errors

**Symptom**: Cannot reach backend

**UI**:
```
⚠️  Cannot connect to backend
Make sure the backend service is running on http://localhost:8000

[Retry]  [Settings]
```

### Validation Errors

**Symptom**: Empty search query

**UI**:
```
Please enter a search term
```

### Backend Errors

**Symptom**: 500 error from API

**UI**:
```
⚠️  Search failed
An error occurred on the server. Please try again.

[Retry]
```

---

## Future Enhancements

1. **Filters**: Date range, file type, resolution
2. **Sort**: By relevance, date, file size
3. **Collections**: Save search results
4. **Tags**: Manual tagging of images
5. **Multi-select**: Batch operations
6. **Export**: Export results as list

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
