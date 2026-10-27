"""
Extractive text summarization, implemented from scratch using a real,
well-known technique: word-frequency sentence scoring (in the spirit of
Luhn, 1958). No sentence here is generated — every summary sentence is a
verbatim sentence pulled from the input, so the output can never contain a
fabricated claim the source text didn't make.

Reuses this project's existing sentence tokenizer (tokenization.py) rather
than reimplementing sentence splitting.
"""
import re
from collections import Counter

from app.algorithms.pipeline import STOPWORDS
from app.algorithms.tokenization import sentence_tokenize


def _words(sentence: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", sentence.lower())


def summarize(text: str, n_sentences: int = 3) -> dict:
    sentences = sentence_tokenize(text)
    original_word_count = len(re.findall(r"\S+", text))

    if len(sentences) <= n_sentences:
        summary_sentences = sentences
        scores = [{"index": i, "sentence": s, "score": None, "selected": True} for i, s in enumerate(sentences)]
    else:
        freq = Counter()
        for s in sentences:
            for w in _words(s):
                if w not in STOPWORDS:
                    freq[w] += 1
        max_freq = max(freq.values()) if freq else 1

        scored = []
        for i, s in enumerate(sentences):
            words = [w for w in _words(s) if w not in STOPWORDS]
            if not words:
                score = 0.0
            else:
                score = sum(freq[w] / max_freq for w in words) / len(words)
            scored.append({"index": i, "sentence": s, "score": round(score, 4)})

        ranked = sorted(scored, key=lambda r: r["score"], reverse=True)[:n_sentences]
        selected_indices = {r["index"] for r in ranked}
        summary_sentences = [s for i, s in enumerate(sentences) if i in selected_indices]
        scores = [{**r, "selected": r["index"] in selected_indices} for r in scored]
        scores.sort(key=lambda r: r["index"])

    summary = " ".join(summary_sentences)
    summary_word_count = len(re.findall(r"\S+", summary))
    compression_ratio = round(1 - (summary_word_count / original_word_count), 3) if original_word_count else 0.0

    return {
        "original_text": text,
        "summary": summary,
        "original_sentence_count": len(sentences),
        "summary_sentence_count": len(summary_sentences),
        "original_word_count": original_word_count,
        "summary_word_count": summary_word_count,
        "compression_ratio": compression_ratio,
        "sentence_scores": scores,
    }
