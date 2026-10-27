import math

from app.algorithms.semantics import (
    compute_tfidf,
    cosine_similarity,
    jaccard_similarity,
    lesk_wsd,
)


def test_jaccard_basic():
    result = jaccard_similarity(["apple", "banana", "orange"], ["banana", "orange", "mango"])
    assert result["intersection_size"] == 2
    assert result["union_size"] == 4
    assert result["jaccard"] == 0.5


def test_jaccard_identical_sets():
    result = jaccard_similarity(["a", "b"], ["a", "b"])
    assert result["jaccard"] == 1.0


def test_jaccard_disjoint_sets():
    result = jaccard_similarity(["a"], ["b"])
    assert result["jaccard"] == 0.0


def test_cosine_basic():
    result = cosine_similarity([1, 0, 1], [1, 1, 0])
    assert math.isclose(result["dot_product"], 1.0)
    assert math.isclose(result["cosine_similarity"], 0.5, abs_tol=0.01)


def test_cosine_identical_direction_vectors():
    result = cosine_similarity([1, 2, 3], [2, 4, 6])
    assert math.isclose(result["cosine_similarity"], 1.0, abs_tol=1e-9)


def test_cosine_mismatched_length_raises():
    try:
        cosine_similarity([1, 2], [1, 2, 3])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_cosine_zero_vector_is_zero_not_divide_by_zero():
    result = cosine_similarity([0, 0], [1, 1])
    assert result["cosine_similarity"] == 0.0


def test_tfidf_basic_structure():
    docs = ["I love NLP", "I love AI", "NLP is interesting"]
    result = compute_tfidf(docs)
    assert "nlp" in result["vocabulary"]
    nlp_row = next(r for r in result["matrix"] if r["term"] == "nlp")
    assert nlp_row["df"] == 2  # appears in doc 0 and doc 2


def test_tfidf_empty_document_does_not_crash():
    result = compute_tfidf(["", "NLP is fun"])
    assert result is not None


def test_lesk_wsd_disambiguates_bank_financial():
    result = lesk_wsd("I deposited money in the bank.", "bank")
    assert result["available"] is True
    assert result["predicted_sense"] == "financial_institution"


def test_lesk_wsd_disambiguates_bank_river():
    result = lesk_wsd("The fisherman sat near the river bank.", "bank")
    assert result["available"] is True
    assert result["predicted_sense"] == "river_side"


def test_lesk_wsd_unknown_word_is_honest():
    result = lesk_wsd("The cat sat on the mat.", "spaceship")
    assert result["available"] is False
    assert result["predicted_sense"] is None
    assert "spaceship" in result["message"]


def test_lesk_wsd_no_overlap_returns_no_prediction():
    result = lesk_wsd("xyz abc qrs", "bank")
    assert result["available"] is True
    assert result["predicted_sense"] is None
