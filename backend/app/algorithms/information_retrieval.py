"""
A small real search engine over a fixed educational NLP-topics collection,
implemented from scratch: TF-IDF term weighting + cosine similarity ranking
against a query — the standard vector-space IR model (Salton, 1975). Every
relevance score is a real computed cosine similarity, not a hand-picked
number.
"""
import math
import re
from collections import Counter

# A small, fixed local document collection — real short educational
# descriptions, not scraped/invented content. Honestly small: this
# demonstrates the IR pipeline, it is not a general web search engine.
CORPUS: list[dict] = [
    {
        "id": "tokenization",
        "title": "Tokenization",
        "text": "Tokenization splits text into words or subword units called tokens. "
                "It is usually the first step in an NLP pipeline, and different "
                "tokenizers (whitespace, rule-based, regex) disagree on punctuation and contractions.",
    },
    {
        "id": "parsing",
        "title": "Syntactic Parsing",
        "text": "Parsing analyzes the grammatical structure of a sentence, building a parse tree "
                "that shows how words combine into phrases. The CYK algorithm parses sentences "
                "against a context-free grammar in Chomsky normal form.",
    },
    {
        "id": "semantics",
        "title": "Semantics and Word Meaning",
        "text": "Semantic analysis studies word and sentence meaning: similarity measures like "
                "Jaccard and cosine similarity, word sense disambiguation, and relations like "
                "synonymy, hypernymy, and meronymy connect words to their meanings.",
    },
    {
        "id": "language-modeling",
        "title": "Language Modeling",
        "text": "A language model assigns probabilities to sequences of words using n-gram counts. "
                "Smoothing techniques like Laplace smoothing handle unseen n-grams, and perplexity "
                "measures how well a model predicts held-out text.",
    },
    {
        "id": "information-retrieval",
        "title": "NLP Fundamentals",
        "text": "Natural language processing combines linguistics and computer science to let "
                "computers process human language: tokenization, parsing, semantics, and "
                "information retrieval are core subfields taught together.",
    },
    {
        "id": "sentiment",
        "title": "Sentiment Analysis",
        "text": "Sentiment analysis classifies text as positive, negative, or neutral. "
                "Lexicon-based approaches score words from a curated opinion lexicon, "
                "while trained classifiers learn sentiment from labeled examples.",
    },
    {
        "id": "ner",
        "title": "Named Entity Recognition",
        "text": "Named entity recognition finds and classifies real-world entities in text, "
                "such as people, locations, organizations, and dates. Approaches range from "
                "rule-based gazetteers to trained sequence-labeling models.",
    },
    {
        "id": "discourse",
        "title": "Discourse and Coreference",
        "text": "Discourse analysis studies how sentences connect across a text, including "
                "resolving pronouns to their antecedents (coreference resolution) using "
                "agreement constraints and algorithms like Hobbs' naive algorithm.",
    },
    {
        "id": "edit-distance",
        "title": "Edit Distance",
        "text": "Edit distance measures how many insertions, deletions, and substitutions are "
                "needed to turn one string into another. The Levenshtein algorithm computes this "
                "with dynamic programming and is used in spell-checking.",
    },
    {
        "id": "morphology",
        "title": "Morphology and Stemming",
        "text": "Morphology studies word structure: prefixes, roots, and suffixes. Stemming "
                "algorithms like the Porter stemmer strip suffixes to a common root form, while "
                "lemmatization maps words to their dictionary base form.",
    },
]

STOPWORDS = {
    "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
    "and", "or", "but", "if", "then", "so", "of", "in", "on", "at", "to",
    "for", "with", "as", "by", "this", "that", "these", "those", "it", "its",
    "how", "what", "does", "do",
}


def _tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-zA-Z']+", text.lower()) if t not in STOPWORDS]


def _build_index():
    doc_tokens = [_tokenize(doc["text"] + " " + doc["title"]) for doc in CORPUS]
    n_docs = len(CORPUS)
    vocab = sorted({w for toks in doc_tokens for w in toks})
    doc_freq = {term: sum(1 for toks in doc_tokens if term in toks) for term in vocab}
    idf = {term: math.log(n_docs / (1 + doc_freq[term])) + 1 for term in vocab}

    doc_vectors = []
    for toks in doc_tokens:
        counts = Counter(toks)
        vec = {term: (counts[term] / len(toks) if toks else 0.0) * idf[term] for term in counts}
        doc_vectors.append(vec)

    return vocab, idf, doc_vectors, doc_tokens


_VOCAB, _IDF, _DOC_VECTORS, _DOC_TOKENS = _build_index()


def _cosine(vec_a: dict, vec_b: dict) -> float:
    terms = set(vec_a) | set(vec_b)
    dot = sum(vec_a.get(t, 0.0) * vec_b.get(t, 0.0) for t in terms)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    return dot / (mag_a * mag_b) if mag_a > 0 and mag_b > 0 else 0.0


def search(query: str, top_k: int = 5) -> dict:
    q_tokens = _tokenize(query)
    q_counts = Counter(q_tokens)
    q_vector = {
        term: (q_counts[term] / len(q_tokens)) * _IDF.get(term, math.log(len(CORPUS) + 1))
        for term in q_counts
    }

    results = []
    for doc, doc_vec, doc_toks in zip(CORPUS, _DOC_VECTORS, _DOC_TOKENS):
        score = _cosine(q_vector, doc_vec)
        matched = sorted(set(q_tokens) & set(doc_toks))
        results.append({
            "doc_id": doc["id"],
            "title": doc["title"],
            "snippet": doc["text"][:180] + ("…" if len(doc["text"]) > 180 else ""),
            "relevance": round(score, 4),
            "matched_terms": matched,
        })

    results.sort(key=lambda r: r["relevance"], reverse=True)
    results = [r for r in results if r["relevance"] > 0][:top_k]

    return {
        "query": query,
        "method": "TF-IDF (smoothed, ln(N/(1+df))+1) + cosine similarity",
        "corpus_size": len(CORPUS),
        "results": results,
    }
