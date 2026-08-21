import os
import sys
import json
import time
import logging
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.dependencies import get_settings
from scripts.download_dataset import download_or_generate_dataset
from rag.chunker import ChunkingPipeline, ChunkStrategyType
from rag.embeddings import embed_documents
from rag.retriever import get_retriever

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build_index")


def build_full_index(dataset_limit: int = 500):
    """
    Complete index building pipeline:
      1. Download/Load dataset
      2. Multi-strategy chunking across all 5 strategies
      3. Compute normalized dense embeddings
      4. Construct FAISS index & BM25 index
      5. Save index artifacts to backend/index/
    """
    settings = get_settings()
    logger.info("=== Starting VaaniRAG Index Build Pipeline ===")
    start_total = time.perf_counter()

    # Step 1: Ensure dataset is downloaded/ready
    raw_path = settings.RAW_DATA_DIR / "dataset.json"
    if not raw_path.exists():
        logger.info("Dataset not found locally. Triggering download...")
        documents = download_or_generate_dataset(limit=dataset_limit)
    else:
        with open(raw_path, "r", encoding="utf-8") as f:
            documents = json.load(f)
        logger.info(f"Loaded {len(documents)} documents from {raw_path}")

    # Step 2: Multi-Strategy Chunking
    pipeline = ChunkingPipeline()
    all_chunks_dict = []

    logger.info("Executing Multi-Strategy Chunking (Fixed-Size, Sentence, Passage, Metadata-Aware, Semantic)...")
    
    # Process documents through all 5 strategies to ensure complete representation
    strategies = [
        ChunkStrategyType.METADATA_AWARE.value,
        ChunkStrategyType.PASSAGE_AWARE.value,
        ChunkStrategyType.SENTENCE_AWARE.value,
        ChunkStrategyType.FIXED_SIZE.value,
        ChunkStrategyType.SEMANTIC.value,
    ]

    for strat in strategies:
        strat_chunks = pipeline.chunk_dataset(documents[:dataset_limit], strategy=strat)
        for c in strat_chunks:
            all_chunks_dict.append(c.to_dict())

    logger.info(f"Generated a total of {len(all_chunks_dict)} indexed chunks across {len(strategies)} strategies.")

    # Save processed chunks
    processed_path = settings.PROCESSED_DATA_DIR / "chunks.json"
    with open(processed_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks_dict, f, ensure_ascii=False, indent=2)

    # Step 3: Compute Embeddings
    texts = [c["text"] for c in all_chunks_dict]
    logger.info(f"Computing dense vector embeddings for {len(texts)} chunks...")
    t_emb = time.perf_counter()
    embeddings = embed_documents(texts, batch_size=64, show_progress_bar=False)
    logger.info(f"Embeddings generated in {(time.perf_counter() - t_emb)*1000:.2f}ms. Shape: {embeddings.shape}")

    # Step 4: Build & Save FAISS + BM25 Index
    retriever = get_retriever()
    success = retriever.build_index(chunks=all_chunks_dict, embeddings=embeddings, save=True)

    if success:
        total_time = time.perf_counter() - start_total
        logger.info(f"=== Index Build Completed Successfully in {total_time:.2f}s ===")
        return True
    else:
        logger.error("Failed to build hybrid index.")
        return False


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    build_full_index(dataset_limit=limit)
