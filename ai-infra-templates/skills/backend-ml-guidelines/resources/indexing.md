# FAISS Indexing and Search

This document covers using FAISS for efficient similarity search with embeddings.

---

## FAISS Overview

FAISS (Facebook AI Similarity Search) is a library for efficient similarity search of dense vectors.

**Key Features**:
- Exact and approximate nearest neighbor search
- GPU acceleration support
- Handles millions of vectors efficiently
- Multiple index types for speed/accuracy trade-offs

---

## Index Types

### For This Project (< 1M images)

| Index Type | Description | Use Case |
|-----------|-------------|----------|
| IndexFlatL2 | Exact search (L2 distance) | < 100k vectors |
| IndexFlatIP | Exact search (inner product/cosine) | < 100k vectors |
| IndexIVFFlat | Approximate search | 100k - 1M vectors |
| IndexHNSW | Graph-based approximate | Best for most cases |

**Recommendation**: Use `IndexFlatIP` for MVP (exact cosine similarity search).

---

## Implementation

### `models/index_store.py`

```python
"""FAISS index management for image search."""

import logging
from pathlib import Path
from typing import Literal

import faiss
import numpy as np
import pickle

logger = logging.getLogger(__name__)


class IndexStore:
    """Manage FAISS index and metadata for image search."""

    def __init__(
        self,
        embedding_dim: int = 512,
        index_type: Literal["flat", "ivf"] = "flat",
        save_path: Path | str = "data/indices/clip_index.faiss"
    ):
        """Initialize index store.

        Args:
            embedding_dim: Dimension of embeddings (512 for ViT-B-32)
            index_type: Type of FAISS index ('flat' for exact, 'ivf' for approximate)
            save_path: Path to save/load index
        """
        self.embedding_dim = embedding_dim
        self.index_type = index_type
        self.save_path = Path(save_path)

        # Create index
        if index_type == "flat":
            # Flat index for exact search (inner product = cosine for normalized vectors)
            self.index = faiss.IndexFlatIP(embedding_dim)
        elif index_type == "ivf":
            # IVF for approximate search
            quantizer = faiss.IndexFlatIP(embedding_dim)
            self.index = faiss.IndexIVFFlat(quantizer, embedding_dim, 100)  # 100 clusters
        else:
            raise ValueError(f"Unknown index type: {index_type}")

        # Metadata: map index ID to image path
        self.id_to_path: dict[int, str] = {}
        self.path_to_id: dict[str, int] = {}

        logger.info(f"Created {index_type} index with dim={embedding_dim}")

    def add(self, embedding: np.ndarray, image_path: str | Path) -> int:
        """Add single image embedding to index.

        Args:
            embedding: Normalized embedding vector
            image_path: Path to the image file

        Returns:
            Index ID of added item
        """
        image_path = str(image_path)

        # Check if already indexed
        if image_path in self.path_to_id:
            logger.debug(f"Image already indexed: {image_path}")
            return self.path_to_id[image_path]

        # Add to FAISS index
        embedding = embedding.reshape(1, -1).astype(np.float32)
        self.index.add(embedding)

        # Get ID (FAISS uses sequential IDs)
        idx = self.index.ntotal - 1

        # Store metadata
        self.id_to_path[idx] = image_path
        self.path_to_id[image_path] = idx

        return idx

    def add_batch(
        self,
        embeddings: np.ndarray,
        image_paths: list[str | Path]
    ) -> list[int]:
        """Add multiple embeddings in batch.

        Args:
            embeddings: Array of shape (n, embedding_dim)
            image_paths: List of image paths

        Returns:
            List of index IDs
        """
        if len(embeddings) != len(image_paths):
            raise ValueError("Number of embeddings must match number of paths")

        # Filter out already indexed
        new_embeddings = []
        new_paths = []

        for emb, path in zip(embeddings, image_paths):
            path_str = str(path)
            if path_str not in self.path_to_id:
                new_embeddings.append(emb)
                new_paths.append(path_str)

        if not new_embeddings:
            logger.debug("All images already indexed")
            return [self.path_to_id[str(p)] for p in image_paths]

        # Add to FAISS
        embeddings_array = np.array(new_embeddings, dtype=np.float32)
        start_idx = self.index.ntotal
        self.index.add(embeddings_array)

        # Update metadata
        indices = []
        for i, path in enumerate(new_paths):
            idx = start_idx + i
            self.id_to_path[idx] = path
            self.path_to_id[path] = idx
            indices.append(idx)

        logger.info(f"Added {len(new_paths)} new images to index")

        return indices

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 50
    ) -> list[tuple[str, float]]:
        """Search for similar images.

        Args:
            query_embedding: Normalized query embedding
            top_k: Number of results to return

        Returns:
            List of (image_path, similarity_score) tuples, sorted by score
        """
        if self.index.ntotal == 0:
            logger.warning("Index is empty")
            return []

        # Ensure correct shape and type
        query = query_embedding.reshape(1, -1).astype(np.float32)

        # Search (higher scores = more similar for inner product)
        scores, indices = self.index.search(query, min(top_k, self.index.ntotal))

        # Convert to results
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx == -1:  # FAISS returns -1 for empty slots
                continue
            image_path = self.id_to_path.get(idx)
            if image_path:
                results.append((image_path, float(score)))

        return results

    def remove(self, image_path: str | Path) -> bool:
        """Remove image from index.

        Note: FAISS doesn't support efficient removal, so this marks as deleted.
        For production, consider rebuilding index periodically.

        Args:
            image_path: Path to image to remove

        Returns:
            True if removed, False if not found
        """
        image_path = str(image_path)

        if image_path not in self.path_to_id:
            return False

        idx = self.path_to_id[image_path]

        # Remove from metadata
        del self.id_to_path[idx]
        del self.path_to_id[image_path]

        logger.warning("FAISS doesn't support efficient removal. Consider rebuilding index.")

        return True

    def size(self) -> int:
        """Get number of items in index."""
        return self.index.ntotal

    def save(self, path: Path | str | None = None):
        """Save index and metadata to disk.

        Args:
            path: Path to save to (defaults to self.save_path)
        """
        if path is None:
            path = self.save_path

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        # Save FAISS index
        faiss.write_index(self.index, str(path))

        # Save metadata
        metadata_path = path.with_suffix(".pkl")
        with open(metadata_path, "wb") as f:
            pickle.dump(
                {
                    "id_to_path": self.id_to_path,
                    "path_to_id": self.path_to_id,
                    "embedding_dim": self.embedding_dim,
                    "index_type": self.index_type,
                },
                f
            )

        logger.info(f"Saved index to {path}")

    def load(self, path: Path | str | None = None):
        """Load index and metadata from disk.

        Args:
            path: Path to load from (defaults to self.save_path)
        """
        if path is None:
            path = self.save_path

        path = Path(path)

        if not path.exists():
            logger.warning(f"Index file not found: {path}")
            return

        # Load FAISS index
        self.index = faiss.read_index(str(path))

        # Load metadata
        metadata_path = path.with_suffix(".pkl")
        with open(metadata_path, "rb") as f:
            metadata = pickle.load(f)

        self.id_to_path = metadata["id_to_path"]
        self.path_to_id = metadata["path_to_id"]
        self.embedding_dim = metadata["embedding_dim"]
        self.index_type = metadata["index_type"]

        logger.info(f"Loaded index from {path} ({self.size()} items)")

    def clear(self):
        """Clear all data from index."""
        # Recreate index
        if self.index_type == "flat":
            self.index = faiss.IndexFlatIP(self.embedding_dim)
        else:
            quantizer = faiss.IndexFlatIP(self.embedding_dim)
            self.index = faiss.IndexIVFFlat(quantizer, self.embedding_dim, 100)

        # Clear metadata
        self.id_to_path.clear()
        self.path_to_id.clear()

        logger.info("Cleared index")

    def get_info(self) -> dict:
        """Get index information."""
        return {
            "index_type": self.index_type,
            "embedding_dim": self.embedding_dim,
            "size": self.size(),
            "save_path": str(self.save_path),
        }
```

---

## Usage Examples

### Basic Indexing and Search

```python
from models.clip_model import ClipModel
from models.index_store import IndexStore

# Initialize
model = ClipModel()
index = IndexStore()

# Index images
from pathlib import Path
image_paths = list(Path("/path/to/images").glob("*.jpg"))

for img_path in image_paths:
    embedding = model.encode_image(img_path)
    index.add(embedding, img_path)

# Search
query_embedding = model.encode_text("red sports car")
results = index.search(query_embedding, top_k=10)

for path, score in results:
    print(f"{score:.4f}: {path}")
```

### Batch Indexing

```python
# More efficient for large collections
image_paths = list(Path("/path/to/images").glob("*.jpg"))

# Embed in batch
embeddings = model.encode_images_batch(image_paths, batch_size=32)

# Add to index in batch
index.add_batch(embeddings, image_paths)
```

### Persistence

```python
# Save index
index.save("data/indices/my_index.faiss")

# Load later
new_index = IndexStore()
new_index.load("data/indices/my_index.faiss")

# Continue using
results = new_index.search(query_embedding)
```

---

## Integration with Services

### `services/indexing.py`

```python
"""Indexing service with progress tracking."""

import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Literal

from ..models.clip_model import ClipModel
from ..models.index_store import IndexStore

logger = logging.getLogger(__name__)


@dataclass
class IndexingStatus:
    """Track indexing progress."""
    state: Literal['idle', 'running', 'complete', 'error']
    total: int
    indexed: int
    error: str | None = None


class IndexingService:
    """Service for managing indexing operations."""

    def __init__(self, clip_model: ClipModel, index_store: IndexStore):
        self.clip_model = clip_model
        self.index_store = index_store
        self.status = IndexingStatus('idle', 0, 0)

    def index_folders(self, folders: list[Path]):
        """Index all images in given folders."""
        try:
            # Collect all image files
            image_paths = []
            for folder in folders:
                image_paths.extend(folder.glob("**/*.jpg"))
                image_paths.extend(folder.glob("**/*.jpeg"))
                image_paths.extend(folder.glob("**/*.png"))

            self.status = IndexingStatus('running', len(image_paths), 0)
            logger.info(f"Starting indexing of {len(image_paths)} images")

            # Process in batches
            batch_size = 32
            for i in range(0, len(image_paths), batch_size):
                batch_paths = image_paths[i:i + batch_size]

                # Embed batch
                embeddings = self.clip_model.encode_images_batch(batch_paths)

                # Add to index
                self.index_store.add_batch(embeddings, batch_paths)

                # Update progress
                self.status.indexed = min(i + batch_size, len(image_paths))

            self.status.state = 'complete'
            logger.info(f"Indexing complete: {len(image_paths)} images")

            # Save index
            self.index_store.save()

        except Exception as e:
            self.status = IndexingStatus('error', 0, 0, str(e))
            logger.error(f"Indexing failed: {e}", exc_info=True)
            raise

    def get_status(self) -> IndexingStatus:
        """Get current indexing status."""
        return self.status

    def is_running(self) -> bool:
        """Check if indexing is currently running."""
        return self.status.state == 'running'


# Global service instance (use dependency injection in production)
indexing_service = IndexingService(None, None)  # Initialize with actual instances
```

### `services/search.py`

```python
"""Search service."""

import logging
from typing import NamedTuple

from ..models.clip_model import ClipModel
from ..models.index_store import IndexStore

logger = logging.getLogger(__name__)


class SearchResult(NamedTuple):
    """Search result item."""
    path: str
    score: float


class SearchService:
    """Service for search operations."""

    def __init__(self, clip_model: ClipModel, index_store: IndexStore):
        self.clip_model = clip_model
        self.index_store = index_store

    async def search(self, query: str, top_k: int = 50) -> list[SearchResult]:
        """Search for images by text query.

        Args:
            query: Text search query
            top_k: Number of results to return

        Returns:
            List of search results sorted by relevance
        """
        logger.info(f"Searching for: '{query}' (top_k={top_k})")

        # Generate text embedding
        query_embedding = self.clip_model.encode_text(query)

        # Search index
        results = self.index_store.search(query_embedding, top_k)

        # Convert to result objects
        search_results = [
            SearchResult(path=path, score=score)
            for path, score in results
        ]

        logger.info(f"Found {len(search_results)} results")

        return search_results


# Global service instance
search_service = SearchService(None, None)  # Initialize with actual instances
```

---

## Performance Optimization

### GPU Acceleration

```python
import faiss

# Use GPU for large indices (requires faiss-gpu)
if faiss.get_num_gpus() > 0:
    gpu_index = faiss.index_cpu_to_gpu(
        faiss.StandardGpuResources(),
        0,  # GPU ID
        cpu_index
    )
```

### Approximate Search (IVF Index)

```python
# For > 100k vectors, use IVF for faster search
quantizer = faiss.IndexFlatIP(embedding_dim)
index = faiss.IndexIVFFlat(quantizer, embedding_dim, 100)  # 100 clusters

# Train on sample of data
training_embeddings = embeddings[:10000]  # Use subset
index.train(training_embeddings)

# Then add all data
index.add(all_embeddings)

# Set search parameters (nprobe = number of clusters to search)
index.nprobe = 10  # Higher = more accurate but slower
```

---

## Testing

```python
import pytest
import numpy as np
from models.index_store import IndexStore


def test_add_and_search():
    index = IndexStore(embedding_dim=512)

    # Add some embeddings
    emb1 = np.random.randn(512).astype(np.float32)
    emb1 /= np.linalg.norm(emb1)

    index.add(emb1, "/path/to/image1.jpg")

    # Search
    results = index.search(emb1, top_k=1)

    assert len(results) == 1
    assert results[0][0] == "/path/to/image1.jpg"
    assert results[0][1] > 0.99  # Should be almost 1.0


def test_batch_add():
    index = IndexStore(embedding_dim=512)

    # Create random embeddings
    embeddings = np.random.randn(10, 512).astype(np.float32)
    embeddings /= np.linalg.norm(embeddings, axis=1, keepdims=True)

    paths = [f"/path/to/image{i}.jpg" for i in range(10)]

    index.add_batch(embeddings, paths)

    assert index.size() == 10


def test_save_load(tmp_path):
    index = IndexStore(embedding_dim=512)

    # Add data
    emb = np.random.randn(512).astype(np.float32)
    emb /= np.linalg.norm(emb)
    index.add(emb, "/test/image.jpg")

    # Save
    save_path = tmp_path / "test_index.faiss"
    index.save(save_path)

    # Load in new instance
    new_index = IndexStore(embedding_dim=512)
    new_index.load(save_path)

    assert new_index.size() == 1
```

---

**Last Updated**: 2025-11-05
