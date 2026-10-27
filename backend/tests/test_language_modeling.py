import math

from app.algorithms.language_modeling import (
    build_corpus_counts,
    ngram_table,
    perplexity_from_probability,
    sentence_probability,
)

CORPUS = [
    "the student learns nlp",
    "the student learns fast",
    "the teacher teaches nlp",
]


def test_unigram_counts_basic():
    counts = build_corpus_counts(CORPUS, 1)
    # "the" appears 3 times, once per sentence
    assert counts["ngram_counts"][("the",)] == 3
    assert counts["total_tokens"] == 12  # 4 + 4 + 4 tokens


def test_bigram_counts_basic():
    counts = build_corpus_counts(CORPUS, 2)
    assert counts["ngram_counts"][("the", "student")] == 2
    assert counts["ngram_counts"][("the", "teacher")] == 1


def test_ngram_table_is_sorted_by_count_desc():
    table = ngram_table(CORPUS, 1)
    counts = [row["count"] for row in table["rows"]]
    assert counts == sorted(counts, reverse=True)


def test_ngram_table_laplace_never_zero():
    table = ngram_table(CORPUS, 2)
    assert all(row["probability_laplace"] > 0 for row in table["rows"])


def test_sentence_probability_seen_bigrams_is_nonzero():
    result = sentence_probability(CORPUS, "the student learns nlp", n=2, smoothing="none")
    assert result["zero_probability"] is False
    assert result["total_probability"] > 0
    assert result["perplexity"] is not None


def test_sentence_probability_unseen_bigram_is_honestly_zero_unsmoothed():
    # "teacher learns" never occurs in the corpus.
    result = sentence_probability(CORPUS, "the teacher learns nlp", n=2, smoothing="none")
    assert result["zero_probability"] is True
    assert result["total_probability"] == 0.0
    assert result["perplexity"] is None


def test_sentence_probability_laplace_never_zero_even_for_unseen_ngram():
    result = sentence_probability(CORPUS, "the teacher learns nlp", n=2, smoothing="laplace")
    assert result["zero_probability"] is False
    assert result["total_probability"] > 0
    assert result["perplexity"] is not None


def test_sentence_probability_flags_out_of_vocabulary_word():
    result = sentence_probability(CORPUS, "the student learns quantum", n=1, smoothing="laplace")
    oov_steps = [s for s in result["steps"] if s["out_of_vocabulary"]]
    assert any(s["target"] == "quantum" for s in oov_steps)


def test_sentence_probability_steps_count_matches_padded_length():
    # n=1: one step per token plus </s>
    result = sentence_probability(CORPUS, "the student learns nlp", n=1, smoothing="none")
    assert len(result["steps"]) == 5  # 4 words + </s>


def test_perplexity_from_probability_matches_formula():
    pp = perplexity_from_probability(0.01, 4)
    assert math.isclose(pp, 0.01 ** (-1 / 4), rel_tol=1e-9)


def test_perplexity_lower_for_higher_probability():
    pp_high = perplexity_from_probability(0.5, 5)
    pp_low = perplexity_from_probability(0.01, 5)
    assert pp_high < pp_low
