import re
import time
import logging
from typing import List, Dict, Any, Tuple, Optional

from app.dependencies import get_settings
from app.schemas.rag import SourceChunk, GuardrailStatus

logger = logging.getLogger("vaani_rag.guardrails")


class GuardrailEngine:
    """
    Comprehensive 6-layer Guardrail Safety and Validation Suite:
      1. Empty / Whitespace Query Filter
      2. Off-Topic & Domain Relevance Check
      3. Retrieval Confidence Score Threshold
      4. Hallucination & Faithfulness Verification
      5. Unsafe / Inappropriate / Prompt Injection Detection
      6. API Failure & Timeout Graceful Recovery
    """
    # Blocklist patterns for prompt injection and malicious keywords
    UNSAFE_PATTERNS = [
        re.compile(r"ignore\s+all\s+previous\s+instructions", re.IGNORECASE),
        re.compile(r"system\s+prompt", re.IGNORECASE),
        re.compile(r"reveal\s+your\s+secret", re.IGNORECASE),
        re.compile(r"<script.*?>", re.IGNORECASE),
        re.compile(r"drop\s+table", re.IGNORECASE),
        re.compile(r"rm\s+-rf", re.IGNORECASE),
    ]

    def __init__(self):
        self.settings = get_settings()
        self.retrieval_threshold = self.settings.RETRIEVAL_THRESHOLD

    def validate_input(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Guardrail 1 (Empty) & Guardrail 5 (Unsafe/Prompt Injection).
        Returns: (is_valid, error_message_or_refusal)
        """
        if not query or not query.strip():
            return False, "Query cannot be empty or solely whitespace."

        cleaned = query.strip()
        if len(cleaned) < 2:
            return False, "Query is too short to process."

        # Guardrail 5: Unsafe / Injection Check
        for pat in self.UNSAFE_PATTERNS:
            if pat.search(cleaned):
                logger.warning(f"Guardrail 5 triggered: Malicious pattern matched in query '{cleaned}'")
                return False, "I cannot process this request as it contains unsafe patterns or restricted instructions."

        return True, None

    def validate_retrieval(self, sources: List[SourceChunk]) -> Tuple[bool, str, float]:
        """
        Guardrail 2 (Off-topic) & Guardrail 3 (Low Retrieval Score).
        Evaluates top score against threshold.
        Returns: (is_valid, reason, top_score)
        """
        if not sources:
            return False, "I don't have enough relevant information in the indexed dataset to answer that.", 0.0

        top_score = sources[0].score
        if top_score < self.retrieval_threshold:
            logger.info(f"Guardrail 3 triggered: Top retrieval score {top_score:.3f} < threshold {self.retrieval_threshold}")
            return False, "Insufficient retrieved context to provide a reliable grounded answer.", top_score

        return True, "Context passed relevance and score thresholds.", top_score

    def validate_grounding(self, answer: str, sources: List[SourceChunk]) -> Tuple[bool, float, List[str]]:
        """
        Guardrail 4 (Hallucination & Faithfulness Verification).
        Checks if content words in the generated answer appear in the retrieved context passages.
        Returns: (is_grounded, grounding_confidence_score, triggered_warnings)
        """
        if not sources or not answer:
            return False, 0.0, ["No sources or empty answer provided"]

        # Collect context vocabulary (lowercased content words >= 2 chars)
        context_words = set()
        for src in sources:
            words = re.findall(r'\w+', src.text.lower(), flags=re.UNICODE)
            context_words.update([w for w in words if len(w) >= 2])

        # Check answer words
        answer_words = [w for w in re.findall(r'\w+', answer.lower(), flags=re.UNICODE) if len(w) >= 2]
        if not answer_words:
            return True, 0.9, []

        # Common stop/grammatical words to exclude from overlap calculation
        stopwords = {
            "the", "and", "that", "this", "with", "from", "for", "are", "was", "were", "been", "have", "has",
            "source", "based", "retrieved", "according", "context", "dataset", "information", "answer", "passage",
            "hai", "aur", "yeh", "mein", "par", "hota", "hoti", "hote", "hain", "ke", "ki", "ka", "se", "ko"
        }
        content_answer_words = [w for w in answer_words if w not in stopwords]

        if not content_answer_words:
            return True, 0.85, []

        overlap_count = sum(1 for w in content_answer_words if w in context_words)
        overlap_ratio = overlap_count / len(content_answer_words)

        warnings = []
        is_grounded = True

        # If answer has less than 20% overlap with context, flag as potential hallucination
        if overlap_ratio < 0.20:
            is_grounded = False
            warnings.append(f"Low factual overlap ({overlap_ratio*100:.1f}%) with retrieved context.")

        confidence_score = min(0.99, max(0.40, (overlap_ratio * 0.7) + (sources[0].score * 0.3)))

        return is_grounded, round(confidence_score, 3), warnings


# Singleton instance
_GUARDRAIL_INSTANCE: Optional[GuardrailEngine] = None


def get_guardrails() -> GuardrailEngine:
    global _GUARDRAIL_INSTANCE
    if _GUARDRAIL_INSTANCE is None:
        _GUARDRAIL_INSTANCE = GuardrailEngine()
    return _GUARDRAIL_INSTANCE
