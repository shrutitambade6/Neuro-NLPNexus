"""
Extractive question answering via a heuristic pipeline — explicitly NOT a
trained QA model (no BERT/transformer QA head is used anywhere in this
project). It splits the context into sentences, scores each sentence by
keyword overlap with the question, and for who/when/where questions tries
to narrow the answer down to a matching named entity (reusing this
project's own rule-based NER) within the best sentence. Real, traceable
steps — no answer is generated, only ever extracted from the given context.
"""
import re

from app.algorithms.ner import extract_entities
from app.algorithms.pipeline import STOPWORDS
from app.algorithms.tokenization import sentence_tokenize

# "where" accepts either LOCATION or ORGANIZATION — real answers to "where"
# questions are often an institution/place name, and this project's NER
# correctly classifies e.g. "Mumbai University" as ORGANIZATION, not
# LOCATION, so QA has to be willing to accept either.
QUESTION_TYPE_ENTITY: dict[str, list[str]] = {
    "who": ["PERSON"],
    "when": ["DATE"],
    "where": ["LOCATION", "ORGANIZATION"],
    "how much": ["MONEY"],
    "how many": ["MONEY"],
}


def _question_type(question: str) -> tuple[str, list[str]]:
    q = question.lower().strip()
    for prefix, labels in QUESTION_TYPE_ENTITY.items():
        if q.startswith(prefix):
            return prefix, labels
    for prefix in ("what", "why", "how", "which", "did", "is", "are", "does", "do"):
        if q.startswith(prefix):
            return prefix, []
    return "other", []


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-zA-Z']+", text.lower()) if w not in STOPWORDS}


def answer_question(context: str, question: str) -> dict:
    sentences = sentence_tokenize(context)
    q_type, entity_labels = _question_type(question)
    q_words = _words(question)

    scored = []
    for i, s in enumerate(sentences):
        overlap = q_words & _words(s)
        scored.append({"index": i, "sentence": s, "overlap_words": sorted(overlap), "overlap_count": len(overlap)})

    scored.sort(key=lambda r: r["overlap_count"], reverse=True)

    if not scored or scored[0]["overlap_count"] == 0:
        return {
            "context": context,
            "question": question,
            "question_type": q_type,
            "answer": None,
            "answer_sentence": None,
            "supporting_entities": [],
            "message": "No sentence in the context shares any real keyword with the question — no answer extracted.",
            "method_note": "Heuristic keyword-overlap extractive QA, not a trained model.",
        }

    best = scored[0]
    best_sentence = best["sentence"]
    answer = best_sentence
    supporting_entities: list[dict] = []

    if entity_labels:
        ner_result = extract_entities(best_sentence)
        candidates = [e for e in ner_result["entities"] if e["label"] in entity_labels]
        supporting_entities = candidates
        if candidates:
            answer = candidates[0]["text"]

    return {
        "context": context,
        "question": question,
        "question_type": q_type,
        "answer": answer,
        "answer_sentence": best_sentence,
        "supporting_entities": supporting_entities,
        "message": None,
        "all_sentence_scores": scored,
        "method_note": "Heuristic keyword-overlap extractive QA"
        + (f", narrowed to a {'/'.join(entity_labels)} entity via rule-based NER" if entity_labels else "")
        + ", not a trained model.",
    }
