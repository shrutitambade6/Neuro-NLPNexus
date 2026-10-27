"""
The canonical list of chapter ids per Digital Book — the same role
progress_catalog.py plays for lessons: a real, finite checklist so a book's
reading-progress percentage means something concrete, and so a chapter id
coming in from the API can be validated before being persisted.

Kept as plain ids + labels, not the actual chapter content (that lives in
the frontend's utils/nlpBookChapters.ts / dlBookChapters.ts, since this
app's book content is static, display-side data, not something the backend
serves). This file exists purely so the backend has its own, independent
source of truth for "which chapter ids are real" — mirrored by hand to
match the frontend chapter ids, the same relationship concept_catalog.py's
module_id/quiz_id fields have to the frontend pages they describe, rather
than a build step keeping two languages' files in lockstep automatically.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class BookChapter:
    chapter_id: str
    label: str


# Mirrors frontend/src/utils/nlpBookChapters.ts's chapter `id`s, in order.
NLP_BOOK_CHAPTERS: list[BookChapter] = [
    BookChapter("introduction-to-nlp", "Introduction to NLP"),
    BookChapter("ambiguity-in-language", "Ambiguity in Language"),
    BookChapter("text-preprocessing", "Text Preprocessing"),
    BookChapter("pos-tagging", "Part-of-Speech Tagging"),
    BookChapter("syntax-and-parsing", "Syntax & Parsing"),
    BookChapter("discourse-and-anaphora", "Discourse & Anaphora Resolution"),
    BookChapter("language-modeling", "Language Modeling"),
    BookChapter("lexical-semantics", "Lexical Semantics & Semantic Relations"),
    BookChapter("word-sense-disambiguation", "Word Sense Disambiguation & WordNet"),
    BookChapter("similarity-and-tfidf", "Similarity, TF-IDF & Embeddings"),
    BookChapter("knowledge-graphs", "Knowledge Graphs & Ontologies"),
    BookChapter("real-world-nlp", "Real-World NLP Applications"),
    BookChapter("evolution-of-language-models", "Evolution of Language Models"),
    BookChapter("nlp-and-deep-learning", "NLP + Deep Learning"),
    BookChapter("quick-revision", "Quick Revision"),
    BookChapter("glossary", "Glossary"),
]

# Mirrors frontend/src/utils/dlBookChapters.ts's chapter `id`s, in order.
DL_BOOK_CHAPTERS: list[BookChapter] = [
    BookChapter("introduction-to-deep-learning", "Introduction to Deep Learning"),
    BookChapter("the-artificial-neuron", "The Artificial Neuron"),
    BookChapter("mp-neuron-and-perceptron", "M-P Neuron & the Perceptron"),
    BookChapter("mlps-and-sigmoid-neurons", "MLPs, Sigmoid Neurons & the Universal Approximation Theorem"),
    BookChapter("neural-network-fundamentals", "Neural Network Fundamentals & Learning Types"),
    BookChapter("forward-propagation-and-loss", "Forward Propagation & Loss Functions"),
    BookChapter("backpropagation", "Backpropagation"),
    BookChapter("gradient-descent", "Gradient Descent & Training Mechanics"),
    BookChapter("cnn", "Convolutional Neural Networks"),
    BookChapter("rnn-and-lstm", "Recurrent Networks & LSTM"),
    BookChapter("attention-and-transformers", "Attention & Transformers"),
    BookChapter("autoencoders", "Autoencoders"),
    BookChapter("regularization", "Regularization Techniques"),
    BookChapter("dl-applications", "Deep Learning Applications & NLP Connections"),
    BookChapter("quick-revision", "Quick Revision"),
    BookChapter("glossary", "Glossary"),
]

CATALOG_BY_BOOK: dict[str, list[BookChapter]] = {
    "nlp": NLP_BOOK_CHAPTERS,
    "dl": DL_BOOK_CHAPTERS,
}


def valid_chapter_ids(book_id: str) -> set[str]:
    return {c.chapter_id for c in CATALOG_BY_BOOK.get(book_id, [])}


def total_chapters(book_id: str) -> int:
    return len(CATALOG_BY_BOOK.get(book_id, []))
