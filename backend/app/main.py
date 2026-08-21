import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.dependencies import get_settings
from app.api import health_router, rag_router, voice_router, evaluation_router, system_router
from rag.retriever import get_retriever
from rag.embeddings import load_embedding_model
from scripts.build_index import build_full_index

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
    Initializes models and verifies FAISS vector index readiness on server startup.
    """
    settings = get_settings()
    logger.info("Initializing VaaniRAG: Multilingual Voice-Enabled Retrieval Intelligence...")

    # 1. Warm up embedding model in memory
    try:
        load_embedding_model(settings.EMBEDDING_MODEL)
    except Exception as e:
        logger.warning(f"Error warming up embedding model: {e}")

    # 2. Check and load or build index
    retriever = get_retriever()
    if not retriever.is_ready:
        logger.info("No index found on startup. Automatically building initial index...")
        try:
            build_full_index(dataset_limit=500)
            retriever.load_index_if_exists()
        except Exception as e:
            logger.error(f"Failed to build initial index on startup: {e}")

    logger.info(f"VaaniRAG Backend Online! Vector Index Ready: {retriever.is_ready} ({len(retriever.metadata)} chunks)")
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(rag_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")
app.include_router(system_router, prefix="/api")


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve built frontend in production if available
FRONTEND_DIST = Path("/app/frontend/dist")
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path == "openapi.json":
            return {"detail": "Not found"}
        target = FRONTEND_DIST / full_path
        if target.exists() and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "name": "VaaniRAG",
            "subtitle": "Multilingual Voice-Enabled Retrieval Intelligence",
            "badge": "HH Goa 2026",
            "status": "online",
            "docs_url": "/docs",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
