from .health import router as health_router
from .rag import router as rag_router
from .voice import router as voice_router
from .evaluation import router as evaluation_router
from .system import router as system_router

__all__ = [
    "health_router",
    "rag_router",
    "voice_router",
    "evaluation_router",
    "system_router",
]
