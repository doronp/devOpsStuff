"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import api
from .config import settings
from .models.clip_model import ClipModel
from .models.index_store import IndexStore
from .services.indexing import IndexingService
from .services.search import SearchService

# Setup logging
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown.

    Args:
        app: FastAPI application instance
    """
    # Startup
    logger.info("Loading models...")

    try:
        # Load CLIP model
        clip_model = ClipModel(
            model_name=settings.model_name,
            pretrained=settings.model_pretrained,
            device=settings.device,
        )

        # Load or create index
        index_store = IndexStore(save_path=settings.index_save_path)
        index_store.load()  # Try to load existing index

        # Initialize services
        indexing_service = IndexingService(clip_model, index_store)
        search_service_instance = SearchService(clip_model, index_store)

        # Set global references (for API handlers)
        api.clip_model = clip_model
        api.index_store = index_store
        api.indexing_service = indexing_service
        api.search_service = search_service_instance

        logger.info("Models loaded successfully")
        logger.info(f"Index size: {index_store.size()} images")

    except Exception as e:
        logger.error(f"Failed to load models: {e}", exc_info=True)
        raise

    yield

    # Shutdown
    logger.info("Shutting down...")
    if api.index_store:
        api.index_store.save()


# Create FastAPI app
app = FastAPI(
    title="OpenCLIP Image Search API",
    version="1.0.0",
    description="Semantic image search using OpenCLIP and FAISS",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api.router)


@app.get("/")
async def root():
    """Root endpoint.

    Returns:
        Welcome message
    """
    return {"message": "OpenCLIP Image Search API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
