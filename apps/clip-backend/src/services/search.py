"""Search service."""

import logging
from typing import List

from ..models.clip_model import ClipModel
from ..models.index_store import IndexStore
from ..schemas.responses import SearchResponse

logger = logging.getLogger(__name__)


class SearchService:
    """Service for search operations."""

    def __init__(self, clip_model: ClipModel, index_store: IndexStore):
        """Initialize search service.

        Args:
            clip_model: OpenCLIP model for generating embeddings
            index_store: FAISS index for similarity search
        """
        self.clip_model = clip_model
        self.index_store = index_store

    async def search(self, query: str, top_k: int = 50) -> List[SearchResponse]:
        """Search for images by text query.

        Args:
            query: Text search query
            top_k: Number of results to return

        Returns:
            List of search results sorted by relevance

        Raises:
            Exception: If search fails
        """
        logger.info(f"Searching for: '{query}' (top_k={top_k})")

        try:
            # Generate text embedding
            query_embedding = self.clip_model.encode_text(query)

            # Search index
            results = self.index_store.search(query_embedding, top_k)

            # Convert to response objects
            search_results = [
                SearchResponse(path=path, score=score) for path, score in results
            ]

            logger.info(f"Found {len(search_results)} results")

            return search_results

        except Exception as e:
            logger.error(f"Search failed: {e}", exc_info=True)
            raise
