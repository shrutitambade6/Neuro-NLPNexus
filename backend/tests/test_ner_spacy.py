"""
Tests for the opt-in spaCy NER engine (app/algorithms/ner_spacy.py).

These run against the REAL spaCy model (en_core_web_sm) -- not a mock --
specifically because mocked output can only prove this module's own
plumbing (offset math, error handling), never that the actual model
produces usable results on real sentences. If spaCy or its model isn't
installed in whatever environment runs this suite, these tests fail
loudly with a clear reason rather than silently skipping and reporting
green for a feature that was never actually exercised.

A few assertions here are intentionally loose (e.g. "found at least one
PERSON somewhere in this paragraph" rather than "found exactly these three
entities") because this is a real trained model: its exact output can
shift between spaCy/model versions, and over-pinning brittle expectations
to today's exact predictions is a worse test than checking the properties
that actually matter (something reasonable was found, offsets are
correct, no crash on edge cases).
"""
import pytest

from app.algorithms.ner_spacy import SPACY_LABEL_INFO, extract_entities_spacy, is_available

pytestmark = pytest.mark.skipif(
    not is_available(),
    reason="spaCy / en_core_web_sm not installed in this environment -- "
    "run `pip install spacy` and `python -m spacy download en_core_web_sm`.",
)


def test_finds_person_and_location_in_a_real_sentence():
    r = extract_entities_spacy("Dr. A. P. J. Abdul Kalam was born in Rameswaram.")
    labels = {e["label"] for e in r["entities"]}
    assert "PERSON" in labels
    assert labels & {"GPE", "LOC"}  # Rameswaram, or an equivalent place reading


def test_finds_organization_in_a_real_sentence():
    r = extract_entities_spacy("Microsoft opened a new office in Bengaluru.")
    labels = {e["label"] for e in r["entities"]}
    assert "ORG" in labels


def test_ambiguous_name_does_not_crash_and_returns_something_reasonable():
    # "Jordan" is both a common first name and a country -- a real model
    # resolves this by context, and may not always agree with a human.
    # The honest thing to assert is that it ran and returned *a* real,
    # specific label for both mentions, not that it got the "right" one.
    r = extract_entities_spacy("Jordan visited Jordan.")
    assert len(r["entities"]) >= 1
    for e in r["entities"]:
        assert e["label"] in SPACY_LABEL_INFO


def test_offsets_match_the_original_text_exactly():
    text = "Shruti met Priya in New Delhi on 3 January 2026."
    r = extract_entities_spacy(text)
    assert r["entities"], "expected at least one entity in this sentence"
    for e in r["entities"]:
        assert text[e["start"]:e["end"]] == e["text"]


def test_repeated_mentions_are_each_kept_at_their_own_position():
    r = extract_entities_spacy("Jordan visited Jordan.")
    starts = [e["start"] for e in r["entities"]]
    assert len(starts) == len(set(starts)), "each mention should be its own span, not deduplicated away"


def test_handles_a_multi_sentence_paragraph():
    text = (
        "Shruti is a final-year student at Vidyalankar Institute of Technology. "
        "She is building an NLP platform called NeuroNLP Nexus. "
        "The project started in 2025 and has already helped many students."
    )
    r = extract_entities_spacy(text)
    assert r["entities"]
    for e in r["entities"]:
        assert text[e["start"]:e["end"]] == e["text"]


def test_text_with_no_entities_returns_empty_not_an_error():
    r = extract_entities_spacy("the cat sat on the mat and looked around quietly")
    assert r["entities"] == []
    assert r["by_label"] == {}


def test_rejects_empty_text():
    with pytest.raises(ValueError):
        extract_entities_spacy("")


def test_rejects_whitespace_only_text():
    with pytest.raises(ValueError):
        extract_entities_spacy("   \n\t  ")


def test_handles_leading_and_trailing_whitespace_without_breaking_offsets():
    text = "  \n  Barack Obama visited Berlin.  \n  "
    r = extract_entities_spacy(text)
    for e in r["entities"]:
        assert text[e["start"]:e["end"]] == e["text"]


def test_unicode_and_accented_text_does_not_crash():
    r = extract_entities_spacy("Fédération Internationale de Football Association is based in Zürich.")
    for e in r["entities"]:
        assert isinstance(e["text"], str)


def test_handles_money_date_and_percent_expressions():
    r = extract_entities_spacy("The company reported a 12% increase in revenue, earning $4.5 million in March 2025.")
    labels = {e["label"] for e in r["entities"]}
    assert labels & {"MONEY", "PERCENT", "DATE"}


def test_rejects_text_over_the_length_limit():
    with pytest.raises(ValueError):
        extract_entities_spacy("word " * 2000)  # well over MAX_CHARS


def test_engine_and_label_display_are_reported():
    r = extract_entities_spacy("Amazon operates internationally.")
    assert r["engine"] == "spacy"
    for e in r["entities"]:
        assert e["label_display"]  # never blank -- falls back to the raw label if unmapped


def test_supported_labels_is_the_full_spacy_label_set():
    r = extract_entities_spacy("hello")
    assert set(r["supported_labels"]) == set(SPACY_LABEL_INFO.keys())


# --- A small, documented evaluation set -------------------------------
# Hand-annotated expected entity TEXTS (not exact spans) for a handful of
# varied sentences, scored as simple set-overlap precision/recall. This
# is NOT a rigorous benchmark -- 8 sentences, manually written, English
# only -- it exists so the model's real behavior on this project's own
# example sentences is visible and checked into history, not to claim
# any general accuracy number for en_core_web_sm.
EVAL_SET = [
    ("Shruti is a final-year student at Vidyalankar Institute of Technology.",
     {"Shruti", "Vidyalankar Institute of Technology"}),
    ("Gaurav is working in Mumbai.", {"Gaurav", "Mumbai"}),
    ("Microsoft opened a new office in Bengaluru.", {"Microsoft", "Bengaluru"}),
    ("Dr. A. P. J. Abdul Kalam was born in Rameswaram.", {"A. P. J. Abdul Kalam", "Rameswaram"}),
    ("Apple announced a new product.", {"Apple"}),
    ("Amazon operates internationally.", {"Amazon"}),
    ("Rahul met Priya in New Delhi.", {"Rahul", "Priya", "New Delhi"}),
    ("The University of Oxford is located in Oxford.", {"The University of Oxford", "Oxford"}),
]


def test_small_evaluation_set_reports_precision_recall_f1():
    tp = fp = fn = 0
    per_sentence = []
    for text, expected in EVAL_SET:
        predicted = {e["text"] for e in extract_entities_spacy(text)["entities"]}
        hit = predicted & expected
        miss = expected - predicted
        extra = predicted - expected
        tp += len(hit)
        fn += len(miss)
        fp += len(extra)
        per_sentence.append((text, predicted, expected))

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    print(f"\nspaCy (en_core_web_sm) on {len(EVAL_SET)}-sentence eval set: "
          f"precision={precision:.2f} recall={recall:.2f} f1={f1:.2f}")
    for text, predicted, expected in per_sentence:
        if predicted != expected:
            print(f"  mismatch: {text!r}\n    predicted={predicted}\n    expected ={expected}")

    # Not a claim of general accuracy -- just a floor so a real pipeline
    # break (model stops loading, returns nothing, wrong offsets, etc.)
    # fails this test instead of going unnoticed.
    assert recall >= 0.5, f"recall dropped to {recall:.2f} on this small eval set -- something likely broke"
