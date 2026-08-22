import os
import sys
import gc
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.dependencies import get_settings
from app.api import health_router, rag_router, voice_router, evaluation_router, system_router
from rag.retriever import get_retriever
from rag.embeddings import load_embedding_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vaani_rag")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes embedding model and loads FAISS vector index readiness on server startup.
    """
    settings = get_settings()
    # Check and load pre-built index from disk
    retriever = get_retriever()
    if not retriever.is_ready:
        logger.info("Checking for pre-built FAISS index on disk...")
        retriever.load_index_if_exists()
        if not retriever.is_ready:
            logger.warning(
                "No pre-built index found on disk. Automatic startup indexing is disabled to conserve memory. "
                "Trigger index build on-demand via POST /api/index/build or CLI (python scripts/build_index.py)."
            )

    gc.collect()

    logger.info(
        f"VaaniRAG Backend Online! Vector Index Ready: {retriever.is_ready} ({len(retriever.metadata)} chunks). Embedding model will initialize on first query."
    )
    yield
    logger.info("VaaniRAG Backend shutting down...")


app = FastAPI(
    title="VaaniRAG: Multilingual Voice-Enabled Retrieval Intelligence",
    description="Production-grade Voice-Enabled RAG System for HH Goa 2026 Task 2",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(rag_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")
app.include_router(system_router, prefix="/api")

# Determine frontend static assets path
FRONTEND_DIST_APP = Path("/app/frontend/dist")
FRONTEND_DIST_LOCAL = BASE_DIR.parent / "frontend" / "dist"
FRONTEND_DIST = FRONTEND_DIST_APP if FRONTEND_DIST_APP.exists() else FRONTEND_DIST_LOCAL

# Mount assets directory if available
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")


@app.get("/")
async def root():
    """
    Root endpoint serving frontend index.html if built, or system metadata JSON.
    """
    index_file = FRONTEND_DIST / "index.html"
    if FRONTEND_DIST.exists() and index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse(
        {
            "name": "VaaniRAG",
            "subtitle": "Multilingual Voice-Enabled Retrieval Intelligence",
            "badge": "HH Goa 2026",
            "status": "online",
            "docs_url": "/docs",
        }
    )


@app.get("/{full_path:path}")
async def serve_spa_routes(full_path: str):
    """
    SPA client-side routing fallback handler.
    """
    # Do not intercept API, docs, or OpenAPI schema endpoints
    if (
        full_path.startswith("api")
        or full_path.startswith("docs")
        or full_path.startswith("redoc")
        or full_path == "openapi.json"
    ):
        return JSONResponse({"detail": "Not found"}, status_code=404)

    target_file = FRONTEND_DIST / full_path
    if FRONTEND_DIST.exists() and target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    index_file = FRONTEND_DIST / "index.html"
    if FRONTEND_DIST.exists() and index_file.exists():
        return FileResponse(str(index_file))

    return JSONResponse({"detail": "Not found"}, status_code=404)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
