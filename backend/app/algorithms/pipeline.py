"""
NLP Playground — a user-configurable chain of text-processing stages.

This module deliberately does not implement any new NLP technique. It
composes functions that are already real and already tested elsewhere in
this codebase (tokenization.py, morphology.py, semantics.py) into a
sequence the user picks, and records a full step trace so the frontend can
show the running token list after every stage. Reusing those functions
directly (not re-implementing them) means the Playground can never disagree
with what the Text Processing / Semantic Lab pages themselves compute.
"""
from app.algorithms.morphology import porter_stem, simple_lemmatize
from app.algorithms.semantics import cosine_similarity, jaccard_similarity
from app.algorithms.tokenization import regex_tokenize, whitespace_tokenize

TOKENIZERS = {
    "whitespace": whitespace_tokenize,
    "regex": regex_tokenize,
}

# A small, common English stopword list — real words, not a fabricated
# "complete" list. Good enough to demonstrate the effect of removing them.
STOPWORDS = {
    "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
    "and", "or", "but", "if", "then", "so", "of", "in", "on", "at", "to",
    "for", "with", "as", "by", "this", "that", "these", "those", "it", "its",
}

STAGE_LABELS = {
    "lowercase": "Lowercase",
    "remove_stopwords": "Remove stopwords",
    "stem": "Porter stem",
    "lemmatize": "Lemmatize",
}


def _apply_stage(stage: str, tokens: list[str]) -> list[str]:
    if stage == "lowercase":
        return [t.lower() for t in tokens]
    if stage == "remove_stopwords":
        return [t for t in tokens if t.lower() not in STOPWORDS]
    if stage == "stem":
        return [porter_stem(t) for t in tokens]
    if stage == "lemmatize":
        return [simple_lemmatize(t)["lemma"] for t in tokens]
    raise ValueError(f"Unknown pipeline stage: {stage!r}. Valid stages: {sorted(STAGE_LABELS)}")


def run_pipeline(text: str, tokenizer: str, stages: list[str]) -> dict:
    if tokenizer not in TOKENIZERS:
        raise ValueError(f"Unknown tokenizer: {tokenizer!r}. Valid tokenizers: {sorted(TOKENIZERS)}")

    tokens = TOKENIZERS[tokenizer](text)
    trace = [{"stage": f"tokenize ({tokenizer})", "tokens": list(tokens)}]
    for stage in stages:
        tokens = _apply_stage(stage, tokens)
        trace.append({"stage": STAGE_LABELS.get(stage, stage), "tokens": list(tokens)})

    return {
        "input_text": text,
        "tokenizer": tokenizer,
        "stages": stages,
        "trace": trace,
        "final_tokens": tokens,
    }


def compare_pipelines(text_a: str, text_b: str, tokenizer: str, stages: list[str]) -> dict:
    """Runs the same pipeline on two texts, then measures how similar the
    final token sets are — a real, composed demonstration of why
    preprocessing choices (stemming, stopword removal, ...) change
    similarity scores, reusing Semantic Lab's own jaccard/cosine functions
    rather than a second implementation of them."""
    result_a = run_pipeline(text_a, tokenizer, stages)
    result_b = run_pipeline(text_b, tokenizer, stages)
    tokens_a, tokens_b = result_a["final_tokens"], result_b["final_tokens"]

    jaccard = jaccard_similarity(tokens_a, tokens_b)

    vocab = sorted(set(tokens_a) | set(tokens_b))
    vec_a = [float(tokens_a.count(term)) for term in vocab]
    vec_b = [float(tokens_b.count(term)) for term in vocab]
    cosine = cosine_similarity(vec_a, vec_b)

    return {
        "pipeline_a": result_a,
        "pipeline_b": result_b,
        "vocab": vocab,
        "jaccard": jaccard,
        "cosine": cosine,
    }
