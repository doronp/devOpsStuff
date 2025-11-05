"""FAISS index management for image search."""

import logging
import pickle
from pathlib import Path
from typing import Dict, List, Tuple, Union

import faiss
import numpy as np

logger = logging.getLogger(__name__)


class IndexStore:
    """Manage FAISS index and metadata for image search."""

    def __init__(
        self,
        embedding_dim: int = 512,
        save_path: Union[Path, str] = "data/indices/clip_index.faiss",
    ):
        """Initialize index store.

        Args:
            embedding_dim: Dimension of embeddings (512 for ViT-B-32)
            save_path: Path to save/load index
        """
        self.embedding_dim = embedding_dim
        self.save_path = Path(save_path)

        # Create flat index for exact search (inner product = cosine for normalized vectors)
        self.index = faiss.IndexFlatIP(embedding_dim)

        # Metadata: map index ID to image path
        self.id_to_path: Dict[int, str] = {}
        self.path_to_id: Dict[str, int] = {}

        logger.info(f"Created flat index with dim={embedding_dim}")

    def add(self, embedding: np.ndarray, image_path: Union[str, Path]) -> int:
        """Add single image embedding to index.

        Args:
            embedding: Normalized embedding vector
            image_path: Path to the image file

        Returns:
            Index ID of added item
        """
        image_path_str = str(image_path)

        # Check if already indexed
        if image_path_str in self.path_to_id:
            logger.debug(f"Image already indexed: {image_path_str}")
            return self.path_to_id[image_path_str]

        # Add to FAISS index
        embedding_array = embedding.reshape(1, -1).astype(np.float32)
        self.index.add(embedding_array)

        # Get ID (FAISS uses sequential IDs)
        idx = self.index.ntotal - 1

        # Store metadata
        self.id_to_path[idx] = image_path_str
        self.path_to_id[image_path_str] = idx

        return idx

    def add_batch(
        self, embeddings: np.ndarray, image_paths: List[Union[str, Path]]
    ) -> List[int]:
        """Add multiple embeddings in batch.

        Args:
            embeddings: Array of shape (n, embedding_dim)
            image_paths: List of image paths

        Returns:
            List of index IDs

        Raises:
            ValueError: If number of embeddings doesn't match paths
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
        self, query_embedding: np.ndarray, top_k: int = 50
    ) -> List[Tuple[str, float]]:
        """Search for similar images.

        Args:
            query_embedding: Normalized query embedding
            top_k: Number of results to return

        Returns:
            List of (image_path, similarity_score) tuples, sorted by score (high to low)
        """
        if self.index.ntotal == 0:
            logger.warning("Index is empty")
            return []

        # Ensure correct shape and type
        query = query_embedding.reshape(1, -1).astype(np.float32)

        # Search (higher scores = more similar for inner product)
        k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query, k)

        # Convert to results
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx == -1:  # FAISS returns -1 for empty slots
                continue
            image_path = self.id_to_path.get(idx)
            if image_path:
                results.append((image_path, float(score)))

        return results

    def size(self) -> int:
        """Get number of items in index.

        Returns:
            Number of indexed images
        """
        return self.index.ntotal

    def save(self, path: Union[Path, str, None] = None) -> None:
        """Save index and metadata to disk.

        Args:
            path: Path to save to (defaults to self.save_path)
        """
        if path is None:
            path = self.save_path

        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)

        # Save FAISS index
        faiss.write_index(self.index, str(save_path))

        # Save metadata
        metadata_path = save_path.with_suffix(".pkl")
        with open(metadata_path, "wb") as f:
            pickle.dump(
                {
                    "id_to_path": self.id_to_path,
                    "path_to_id": self.path_to_id,
                    "embedding_dim": self.embedding_dim,
                },
                f,
            )

        logger.info(f"Saved index to {save_path}")

    def load(self, path: Union[Path, str, None] = None) -> bool:
        """Load index and metadata from disk.

        Args:
            path: Path to load from (defaults to self.save_path)

        Returns:
            True if loaded successfully, False if file doesn't exist
        """
        if path is None:
            path = self.save_path

        load_path = Path(path)

        if not load_path.exists():
            logger.warning(f"Index file not found: {load_path}")
            return False

        try:
            # Load FAISS index
            self.index = faiss.read_index(str(load_path))

            # Load metadata
            metadata_path = load_path.with_suffix(".pkl")
            with open(metadata_path, "rb") as f:
                metadata = pickle.load(f)

            self.id_to_path = metadata["id_to_path"]
            self.path_to_id = metadata["path_to_id"]
            self.embedding_dim = metadata["embedding_dim"]

            logger.info(f"Loaded index from {load_path} ({self.size()} items)")
            return True

        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            return False

    def clear(self) -> None:
        """Clear all data from index."""
        # Recreate index
        self.index = faiss.IndexFlatIP(self.embedding_dim)

        # Clear metadata
        self.id_to_path.clear()
        self.path_to_id.clear()

        logger.info("Cleared index")

    def get_info(self) -> dict:
        """Get index information.

        Returns:
            Dictionary with index metadata
        """
        return {
            "index_type": "flat",
            "embedding_dim": self.embedding_dim,
            "size": self.size(),
            "save_path": str(self.save_path),
        }
