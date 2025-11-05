"""Indexing service with progress tracking."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Literal

from ..models.clip_model import ClipModel
from ..models.index_store import IndexStore

logger = logging.getLogger(__name__)


@dataclass
class IndexingStatus:
    """Track indexing progress."""

    state: Literal["idle", "running", "complete", "error"]
    total: int
    indexed: int
    error: str | None = None


class IndexingService:
    """Service for managing indexing operations."""

    def __init__(self, clip_model: ClipModel, index_store: IndexStore):
        """Initialize indexing service.

        Args:
            clip_model: OpenCLIP model for generating embeddings
            index_store: FAISS index for storing embeddings
        """
        self.clip_model = clip_model
        self.index_store = index_store
        self.status = IndexingStatus("idle", 0, 0)

    def index_folders(self, folders: List[Path]) -> None:
        """Index all images in given folders.

        Args:
            folders: List of folder paths containing images

        Raises:
            Exception: If indexing fails
        """
        try:
            # Collect all image files
            image_paths: List[Path] = []
            for folder in folders:
                image_paths.extend(folder.glob("**/*.jpg"))
                image_paths.extend(folder.glob("**/*.jpeg"))
                image_paths.extend(folder.glob("**/*.png"))
                image_paths.extend(folder.glob("**/*.JPG"))
                image_paths.extend(folder.glob("**/*.PNG"))

            self.status = IndexingStatus("running", len(image_paths), 0)
            logger.info(f"Starting indexing of {len(image_paths)} images")

            # Process in batches
            batch_size = 32
            for i in range(0, len(image_paths), batch_size):
                batch_paths = image_paths[i : i + batch_size]

                try:
                    # Embed batch
                    embeddings = self.clip_model.encode_images_batch(
                        batch_paths, batch_size=batch_size
                    )

                    # Add to index
                    if len(embeddings) > 0:
                        self.index_store.add_batch(embeddings, batch_paths)

                    # Update progress
                    self.status.indexed = min(i + batch_size, len(image_paths))

                except Exception as e:
                    logger.warning(f"Failed to process batch: {e}")
                    continue

            self.status.state = "complete"
            logger.info(f"Indexing complete: {len(image_paths)} images")

            # Save index
            self.index_store.save()

        except Exception as e:
            self.status = IndexingStatus("error", 0, 0, str(e))
            logger.error(f"Indexing failed: {e}", exc_info=True)
            raise

    def get_status(self) -> IndexingStatus:
        """Get current indexing status.

        Returns:
            Current indexing status
        """
        return self.status

    def is_running(self) -> bool:
        """Check if indexing is currently running.

        Returns:
            True if indexing is in progress
        """
        return self.status.state == "running"
