"""
Semantic Lab algorithms, implemented from scratch: Jaccard similarity,
cosine similarity, TF-IDF, and a simplified Lesk algorithm for WSD.

Zero FastAPI/Pydantic dependency — unit-testable in isolation, same
philosophy as the other algorithm modules.
"""
import math
from collections import Counter
from dataclasses import dataclass


def jaccard_similarity(set_a: list[str], set_b: list[str]) -> dict:
    a, b = set(set_a), set(set_b)
    intersection = a & b
    union = a | b
    score = len(intersection) / len(union) if union else 0.0
    return {
        "set_a": sorted(a),
        "set_b": sorted(b),
        "intersection": sorted(intersection),
        "union": sorted(union),
        "intersection_size": len(intersection),
        "union_size": len(union),
        "jaccard": score,
    }


def cosine_similarity(vector_a: list[float], vector_b: list[float]) -> dict:
    if len(vector_a) != len(vector_b):
        raise ValueError("Vectors must be the same length to compute cosine similarity.")
    dot = sum(x * y for x, y in zip(vector_a, vector_b))
    mag_a = math.sqrt(sum(x * x for x in vector_a))
    mag_b = math.sqrt(sum(y * y for y in vector_b))
    cosine = dot / (mag_a * mag_b) if mag_a > 0 and mag_b > 0 else 0.0
    return {
        "vector_a": vector_a,
        "vector_b": vector_b,
        "dot_product": dot,
        "magnitude_a": mag_a,
        "magnitude_b": mag_b,
        "cosine_similarity": cosine,
    }


def compute_tfidf(documents: list[str]) -> dict:
    """Real TF-IDF over a small set of documents: TF = raw count / doc length,
    IDF = ln(N / (1 + DF)) — the standard smoothed formulation."""
    tokenized = [doc.lower().split() for doc in documents]
    n_docs = len(tokenized)
    vocab = sorted({word for doc in tokenized for word in doc})

    doc_freq = {term: sum(1 for doc in tokenized if term in doc) for term in vocab}

    matrix = []
    for term in vocab:
        idf = math.log(n_docs / (1 + doc_freq[term])) + 1  # smoothed idf, always > 0
        row = {"term": term, "df": doc_freq[term], "idf": idf, "per_doc": []}
        for i, doc in enumerate(tokenized):
            count = Counter(doc)
            tf = count[term] / len(doc) if doc else 0.0
            row["per_doc"].append({"doc_index": i, "tf": tf, "tfidf": tf * idf})
        matrix.append(row)

    return {"documents": documents, "vocabulary": vocab, "matrix": matrix}


@dataclass
class SenseEntry:
    sense_id: str
    gloss: str  # dictionary-style definition, used as the "signature" for Lesk overlap


# Small curated sense inventory for WSD demonstration — real words with real
# ambiguity, honestly limited in coverage (this is not a full WordNet).
SENSE_INVENTORY: dict[str, list[SenseEntry]] = {
    "bank": [
        SenseEntry("financial_institution", "a financial institution that accepts deposits and offers loans money account"),
        SenseEntry("river_side", "the land alongside a river or stream edge water flow"),
    ],
    "book": [
        SenseEntry("printed_work", "a written or printed work consisting of pages bound together read"),
        SenseEntry("reserve", "to reserve or arrange for something in advance reservation ticket"),
    ],
    "bat": [
        SenseEntry("flying_mammal", "a nocturnal flying mammal with wings that navigates by echolocation"),
        SenseEntry("sports_equipment", "a wooden or metal club used to hit a ball in a sport like cricket or baseball"),
    ],
}


def stopword_filtered(tokens: list[str]) -> list[str]:
    stopwords = {"the", "a", "an", "to", "of", "in", "is", "was", "were", "and", "went", "at"}
    return [t for t in tokens if t not in stopwords]


def lesk_wsd(sentence: str, target_word: str) -> dict:
    """A simplified Lesk algorithm: picks the sense whose gloss shares the
    most words with the sentence's context. This is a real, if basic,
    disambiguation method — the overlap counts shown are genuinely computed,
    not simulated confidence scores."""
    target = target_word.lower()
    senses = SENSE_INVENTORY.get(target)
    if not senses:
        return {
            "target_word": target_word,
            "available": False,
            "message": f'No sense inventory available for "{target_word}" in this demo dataset.',
            "candidates": [],
            "predicted_sense": None,
        }

    context_tokens = stopword_filtered(re_split(sentence.lower()))
    context_set = set(context_tokens)

    candidates = []
    for sense in senses:
        gloss_tokens = set(stopword_filtered(re_split(sense.gloss.lower())))
        overlap = context_set & gloss_tokens
        candidates.append({
            "sense_id": sense.sense_id,
            "gloss": sense.gloss,
            "overlap_words": sorted(overlap),
            "overlap_count": len(overlap),
        })

    candidates.sort(key=lambda c: c["overlap_count"], reverse=True)
    top_score = candidates[0]["overlap_count"]
    tied = [c for c in candidates if c["overlap_count"] == top_score]

    predicted = None
    if top_score > 0 and len(tied) == 1:
        predicted = candidates[0]["sense_id"]

    return {
        "target_word": target_word,
        "available": True,
        "message": None,
        "context_words": sorted(context_set),
        "candidates": candidates,
        "predicted_sense": predicted,
        "tie": top_score > 0 and len(tied) > 1,
    }


def re_split(text: str) -> list[str]:
    import re
    return re.findall(r"[a-z']+", text)
