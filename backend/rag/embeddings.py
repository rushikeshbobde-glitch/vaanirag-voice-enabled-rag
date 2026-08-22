import os
import gc
import time
import logging
from typing import List, Union, Optional
import numpy as np

# Optimize thread count to prevent memory spikes in 512MB RAM environments (Render Free Tier)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

try:
    import torch
    torch.set_num_threads(1)
    torch.set_grad_enabled(False)
except Exception:
    pass

from sentence_transformers import SentenceTransformer

from app.dependencies import get_settings

logger = logging.getLogger("vaani_rag.embeddings")

_EMBEDDING_MODEL_INSTANCE: Optional[SentenceTransformer] = None
_EMBEDDING_CACHE: dict = {}


def load_embedding_model(model_name: Optional[str] = None) -> SentenceTransformer:
    """
    Singleton loader for the multilingual SentenceTransformer embedding model.
    """
    global _EMBEDDING_MODEL_INSTANCE
    settings = get_settings()
    name = model_name or settings.EMBEDDING_MODEL

    if _EMBEDDING_MODEL_INSTANCE is None:
        logger.info(f"Loading multilingual embedding model: {name}")
        start_t = time.perf_counter()
        try:
            _EMBEDDING_MODEL_INSTANCE = SentenceTransformer(name)
            elapsed = (time.perf_counter() - start_t) * 1000
            logger.info(f"Loaded embedding model in {elapsed:.2f}ms")
        except Exception as e:
            logger.warning(f"Error loading {name}: {e}. Falling back to 'all-MiniLM-L6-v2'")
            _EMBEDDING_MODEL_INSTANCE = SentenceTransformer("all-MiniLM-L6-v2")

    return _EMBEDDING_MODEL_INSTANCE


def embed_query(query: str, model_name: Optional[str] = None) -> np.ndarray:
    """
    Embeds a single user query string into a normalized numpy vector.
    Results are cached in memory for sub-millisecond repeat latency.
    """
    cleaned_query = query.strip()
    cache_key = f"q:{cleaned_query}"
    if cache_key in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[cache_key]

    model = load_embedding_model(model_name)
    embedding = model.encode(
        cleaned_query,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    vec = np.ascontiguousarray(embedding, dtype=np.float32)

    # Manage cache size
    settings = get_settings()
    if len(_EMBEDDING_CACHE) >= settings.CACHE_SIZE:
        _EMBEDDING_CACHE.clear()
    _EMBEDDING_CACHE[cache_key] = vec

    return vec


def embed_documents(
    texts: List[str],
    batch_size: int = 64,
    model_name: Optional[str] = None,
    show_progress_bar: bool = False,
) -> np.ndarray:
    """
    Embeds a list of document strings in batches with L2 vector normalization.
    """
    if not texts:
        return np.empty((0, 384), dtype=np.float32)

    model = load_embedding_model(model_name)
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=show_progress_bar,
    )
    return np.ascontiguousarray(embeddings, dtype=np.float32)


def get_embedding_dimension(model_name: Optional[str] = None) -> int:
    """Returns the embedding dimension of the current model."""
    model = load_embedding_model(model_name)
    return model.get_sentence_embedding_dimension()
