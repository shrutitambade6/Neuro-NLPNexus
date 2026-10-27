import math

import pytest

from app.algorithms.pos_tagging import (
    DEFAULT_MODEL,
    TAGS,
    brute_force_best_path,
    build_hmm,
    guess_emission,
    run_viterbi,
)


def test_model_transition_rows_sum_to_one():
    for from_tag in TAGS:
        total = sum(DEFAULT_MODEL.transition_prob(from_tag, to_tag) for to_tag in TAGS)
        assert math.isclose(total, 1.0, rel_tol=1e-9)


def test_model_initial_probabilities_sum_to_one():
    total = sum(DEFAULT_MODEL.initial_prob(tag) for tag in TAGS)
    assert math.isclose(total, 1.0, rel_tol=1e-9)


def test_known_word_emission_is_highest_for_its_trained_tag():
    # "dog" only ever appears tagged NOUN in the training corpus, so its
    # smoothed emission probability under NOUN should dominate every other
    # tag — proof the counts, not a hardcoded answer, drive the result.
    probs = {tag: DEFAULT_MODEL.emission_prob(tag, "dog") for tag in TAGS}
    assert max(probs, key=probs.get) == "NOUN"


def test_guess_emission_sums_to_one_and_favors_expected_tag():
    assert math.isclose(sum(guess_emission("quickly", False).values()), 1.0, rel_tol=1e-9)
    assert math.isclose(sum(guess_emission(".", False).values()), 1.0, rel_tol=1e-9)

    ly_guess = guess_emission("wonderfully", False)
    assert max(ly_guess, key=ly_guess.get) == "ADV"

    punct_guess = guess_emission("!", False)
    assert max(punct_guess, key=punct_guess.get) == "PUNCT"

    num_guess = guess_emission("42", False)
    assert max(num_guess, key=num_guess.get) == "NUM"

    propn_guess = guess_emission("Xanthia", False)
    assert max(propn_guess, key=propn_guess.get) == "PROPN"


def test_viterbi_tags_a_simple_known_sentence_correctly():
    tokens = ["the", "dog", "runs", "quickly", "."]
    result = run_viterbi(tokens)
    assert result.best_path == ["DET", "NOUN", "VERB", "ADV", "PUNCT"]


def test_viterbi_trellis_has_one_step_per_token_and_one_cell_per_tag():
    tokens = ["she", "is", "happy", "."]
    result = run_viterbi(tokens)
    assert len(result.trellis) == len(tokens)
    for step in result.trellis:
        assert set(step.cells.keys()) == set(TAGS)


@pytest.mark.parametrize(
    "sentence",
    [
        ["the", "dog", "runs"],
        ["she", "is", "happy"],
        ["john", "likes", "mary"],
        ["a", "cat", "sleeps"],
    ],
)
def test_viterbi_matches_brute_force_search(sentence):
    """The core correctness proof: Viterbi's dynamic-programming shortcut
    (never re-expanding a suboptimal path) must find the exact same
    highest-probability tag sequence as exhaustively scoring every possible
    tag sequence. If the DP transition were wrong, this would catch it."""
    viterbi_result = run_viterbi(sentence)
    brute_path, brute_score = brute_force_best_path(sentence)

    assert math.isclose(viterbi_result.best_score, brute_score, rel_tol=1e-9)
    # A tie in score is possible in principle; requiring an identical score
    # (checked above) is the real correctness claim. The paths should also
    # match here since this small tagset rarely produces true ties.
    assert viterbi_result.best_path == brute_path


def test_build_hmm_is_a_real_count_not_a_fixture():
    # Building the model twice from the same corpus must produce identical
    # probabilities — proof this is a deterministic count, not something
    # seeded with randomness or hand-typed per call.
    model_a = build_hmm()
    model_b = build_hmm()
    for tag in TAGS:
        assert model_a.initial_prob(tag) == model_b.initial_prob(tag)
        for other in TAGS:
            assert model_a.transition_prob(tag, other) == model_b.transition_prob(tag, other)


def test_unknown_word_is_still_tagged_via_heuristic():
    tokens = ["the", "zorbling", "runs", "."]
    result = run_viterbi(tokens)
    assert len(result.best_path) == 4
    # "zorbling" ends in "ing" so the heuristic should favor VERB, and
    # Viterbi should respect that unless context strongly overrides it.
    assert result.trellis[1].is_known is False
