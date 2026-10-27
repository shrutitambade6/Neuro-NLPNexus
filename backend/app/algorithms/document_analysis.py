"""
Document Intelligence — composes this project's existing real algorithms
(NER, sentiment, summarization) plus a simple frequency-based keyword
extractor, rather than reimplementing anything. Every field in the result
is produced by one of those real, independently-tested functions.
"""
import re
from collections import Counter

from app.algorithms.ner import extract_entities
from app.algorithms.pipeline import STOPWORDS
from app.algorithms.sentiment import analyze_sentiment
from app.algorithms.summarization import summarize
from app.algorithms.tokenization import sentence_tokenize, whitespace_tokenize


def _keywords(text: str, top_n: int = 8) -> list[dict]:
    words = [w.lower() for w in re.findall(r"[a-zA-Z']+", text) if w.lower() not in STOPWORDS and len(w) > 2]
    counts = Counter(words)
    return [{"word": w, "count": c} for w, c in counts.most_common(top_n)]


def analyze_document(text: str) -> dict:
    sentences = sentence_tokenize(text)
    words = whitespace_tokenize(text)

    ner_result = extract_entities(text)
    sentiment_result = analyze_sentiment(text)
    n_target = min(3, max(1, len(sentences) // 3)) if sentences else 1
    summary_result = summarize(text, n_sentences=n_target) if len(sentences) > 1 else {
        "summary": text, "compression_ratio": 0.0,
    }
    keywords = _keywords(text)

    return {
        "text": text,
        "sentence_count": len(sentences),
        "word_count": len(words),
        "keywords": keywords,
        "entities": ner_result["entities"],
        "entities_by_label": ner_result["by_label"],
        "sentiment": {"label": sentiment_result["label"], "confidence": sentiment_result["confidence"]},
        "summary": summary_result["summary"],
        "compression_ratio": summary_result.get("compression_ratio", 0.0),
        "pipeline": [
            {"stage": "Document", "detail": f"{len(words)} words, {len(sentences)} sentences"},
            {"stage": "Analyze", "detail": "Sentiment + keyword frequency computed"},
            {"stage": "Extract", "detail": f"{len(ner_result['entities'])} entities found via rule-based NER"},
            {"stage": "Understand", "detail": "Extractive summary generated"},
        ],
    }
