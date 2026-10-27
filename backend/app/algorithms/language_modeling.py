"""
N-gram language modeling, implemented from scratch: unigram/bigram/trigram
counting, unsmoothed and Laplace-smoothed conditional probability, sentence
probability with a full step-by-step trace, and perplexity.

Zero FastAPI/Pydantic dependency — unit-testable in isolation, same
philosophy as app/algorithms/semantics.py and app/algorithms/cyk.py.

Stateless by design: every endpoint takes the corpus in the request body and
recomputes counts from it. Nothing is persisted between requests — matching
how the existing Jaccard/Cosine/TF-IDF endpoints work.
"""
import math
import re
from collections import Counter

START = "<s>"
END = "</s>"
UNK = "<unk>"


def _tokenize(sentence: str) -> list[str]:
    """Lowercase word tokenization — same pattern as app/algorithms/semantics.py's
    re_split, so a token here means the same thing it means in Semantic Lab."""
    return re.findall(r"[a-z']+", sentence.lower())


def _pad(tokens: list[str], n: int) -> list[str]:
    """Pads a token sequence with (n-1) start markers and one end marker.
    Standard n-gram convention: lets a model assign a real probability to
    "where the sentence ends," which is what perplexity needs to be
    well-defined."""
    pad_left = [START] * max(n - 1, 1) if n > 1 else []
    return pad_left + tokens + [END]


def build_corpus_counts(corpus: list[str], n: int) -> dict:
    """Tokenizes every sentence in the corpus, pads it, and counts every
    n-gram and its (n-1)-gram context across the whole corpus."""
    ngram_counts: Counter = Counter()
    context_counts: Counter = Counter()
    total_tokens = 0
    vocab: set[str] = set()

    for sentence in corpus:
        tokens = _tokenize(sentence)
        total_tokens += len(tokens)
        padded = _pad(tokens, n)
        for i in range(len(padded) - n + 1):
            ngram = tuple(padded[i : i + n])
            context = ngram[:-1]
            ngram_counts[ngram] += 1
            context_counts[context] += 1
            vocab.add(ngram[-1])  # the predicted token — never <s>

    return {
        "ngram_counts": ngram_counts,
        "context_counts": context_counts,
        "vocab": vocab,
        "vocab_size": len(vocab),
        "total_tokens": total_tokens,
    }


def _readable(ngram: tuple[str, ...]) -> str:
    return " ".join(ngram)


def ngram_table(corpus: list[str], n: int, top_k: int = 30) -> dict:
    """Real n-gram counts for display, plus both unsmoothed and
    Laplace-smoothed conditional probability for every n-gram shown."""
    counts = build_corpus_counts(corpus, n)
    ngram_counts = counts["ngram_counts"]
    context_counts = counts["context_counts"]
    vocab_size = counts["vocab_size"]
    total_tokens = counts["total_tokens"]

    rows = []
    for ngram, count in ngram_counts.most_common():
        context = ngram[:-1]
        # Unigram context is "the whole corpus" — condition on total tokens.
        context_count = context_counts[context] if n > 1 else total_tokens
        unsmoothed = count / context_count if context_count > 0 else 0.0
        laplace = (count + 1) / (context_count + vocab_size + 1)  # +1 reserves the <unk> slot
        rows.append(
            {
                "ngram": _readable(ngram),
                "context": _readable(context) if context else None,
                "count": count,
                "context_count": context_count,
                "probability_unsmoothed": unsmoothed,
                "probability_laplace": laplace,
            }
        )

    return {
        "n": n,
        "vocab_size": vocab_size,
        "total_tokens": total_tokens,
        "total_ngrams": sum(ngram_counts.values()),
        "distinct_ngrams": len(ngram_counts),
        "rows": rows[:top_k],
        "truncated": len(rows) > top_k,
    }


def sentence_probability(corpus: list[str], sentence: str, n: int, smoothing: str) -> dict:
    """P(sentence) under an n-gram model built from `corpus`, with a
    step-by-step trace of every conditional probability multiplied in.
    smoothing: "none" or "laplace". With "none", a single unseen n-gram
    makes the whole sentence probability exactly 0 — shown honestly,
    not patched over, because that's the textbook reason smoothing exists."""
    counts = build_corpus_counts(corpus, n)
    ngram_counts = counts["ngram_counts"]
    context_counts = counts["context_counts"]
    vocab = counts["vocab"]
    vocab_size = counts["vocab_size"]
    total_tokens = counts["total_tokens"]

    raw_tokens = _tokenize(sentence)
    padded = _pad(raw_tokens, n)
    steps = []
    log_prob = 0.0
    zero_probability = False

    for i in range(len(padded) - n + 1):
        ngram = tuple(padded[i : i + n])
        context = ngram[:-1]
        target = ngram[-1]
        is_oov = target not in vocab and target not in (START, END)

        count_ngram = ngram_counts[ngram]
        context_count = context_counts[context] if n > 1 else total_tokens

        if smoothing == "laplace":
            probability = (count_ngram + 1) / (context_count + vocab_size + 1)
        else:
            probability = count_ngram / context_count if context_count > 0 else 0.0

        if probability <= 0:
            zero_probability = True
        else:
            log_prob += math.log(probability)

        steps.append(
            {
                "ngram": _readable(ngram),
                "context": _readable(context) if context else "(none)",
                "target": target,
                "count_ngram": count_ngram,
                "context_count": context_count,
                "probability": probability,
                "out_of_vocabulary": is_oov,
            }
        )

    total_probability = 0.0 if zero_probability else math.exp(log_prob)
    n_predicted = len(steps)  # includes the </s> step, matches standard perplexity convention

    perplexity = None
    if not zero_probability and n_predicted > 0:
        perplexity = math.exp(-log_prob / n_predicted)

    return {
        "sentence": sentence,
        "n": n,
        "smoothing": smoothing,
        "tokens": raw_tokens,
        "steps": steps,
        "log_probability": None if zero_probability else log_prob,
        "total_probability": total_probability,
        "zero_probability": zero_probability,
        "perplexity": perplexity,
    }


def perplexity_from_probability(probability: float, n_words: int) -> float:
    """PP = P(sentence) ^ (-1/N) — the standalone calculator variant, given
    a probability and word count directly rather than derived from a
    corpus."""
    return math.pow(probability, -1.0 / n_words)
