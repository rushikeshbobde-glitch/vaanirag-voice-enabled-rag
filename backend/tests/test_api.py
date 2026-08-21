import pytest
import sys
from pathlib import Path
from starlette.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "VaaniRAG"
    assert "timestamp" in data


def test_system_status_endpoint():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["backend_status"] == "ONLINE"
    assert "total_chunks" in data
    assert "active_chunking_strategies" in data


def test_text_query_endpoint():
    payload = {
        "query": "What is the primary function of solar photovoltaic cells?",
        "language": "en",
        "top_k": 3,
        "rerank": True,
    }
    response = client.post("/api/rag/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert "latency" in data
    assert "guardrails" in data
    assert data["latency"]["total_ms"] > 0.0


def test_empty_query_guardrail_endpoint():
    payload = {
        "query": "   ",
        "language": "en",
    }
    # Handled cleanly with guardrail status
    response = client.post("/api/rag/query", json=payload)
    assert response.status_code in [200, 422]
    if response.status_code == 200:
        data = response.json()
        assert data["guardrails"]["passed"] is False


def test_latency_stats_endpoint():
    response = client.get("/api/latency")
    assert response.status_code == 200
    data = response.json()
    assert "overall" in data
    assert "retrieval_core" in data
