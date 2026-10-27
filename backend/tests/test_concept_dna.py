"""
Concept DNA tests. Two layers, matching this project's established
pattern (see test_autoencoder_concepts.py vs. ..._api.py): pure unit
tests directly against app/algorithms/concept_dna.py's scoring logic
(no DB), plus an integration test that drives the REAL API endpoint
through the REAL existing /progress and /dl-challenges endpoints — the
same way a real student's actions would — rather than writing rows
directly into the test DB.
"""
import pytest
from fastapi.testclient import TestClient

from app.algorithms.concept_dna import ConceptSignals, compute_concept_dna
from app.main import app

client = TestClient(app)


def test_empty_signals_everything_is_not_started_or_locked():
    result = compute_concept_dna({})
    assert result.has_any_activity is False
    assert result.weak_concepts == []
    for state in result.states.values():
        assert state.status in ("not_started", "locked")
        if state.concept.prerequisite_ids:
            assert state.status == "locked"
        else:
            assert state.status == "not_started"


def test_completion_only_caps_below_strong():
    """Lesson completion alone (no quiz/challenge evidence) must land in
    Developing, never Strong — the module docstring's central honesty
    rule."""
    result = compute_concept_dna({"tokenization": ConceptSignals(completed=True)})
    state = result.states["tokenization"]
    assert state.status == "developing"
    assert state.mastery_score < 80


def test_strong_quiz_score_reaches_strong():
    result = compute_concept_dna(
        {"perceptron-mlp": ConceptSignals(completed=True, quiz_attempts=1, quiz_average_score=95.0)}
    )
    assert result.states["perceptron-mlp"].status == "strong"


def test_low_challenge_score_is_needs_attention_and_listed_as_weak():
    result = compute_concept_dna(
        {"gradient-descent": ConceptSignals(completed=True, challenge_attempts=4, challenge_correct=0)}
    )
    state = result.states["gradient-descent"]
    assert state.status == "needs_attention"
    weak_ids = [w.concept.id for w in result.weak_concepts]
    assert "gradient-descent" in weak_ids
    reasons = next(w.reasons for w in result.weak_concepts if w.concept.id == "gradient-descent")
    assert any("incorrect" in r.lower() for r in reasons)


def test_prerequisite_gates_locked_status():
    # pos-tagging requires tokenization. With zero activity anywhere,
    # tokenization (no prerequisites) is not_started, pos-tagging (has a
    # prerequisite) is locked.
    result = compute_concept_dna({})
    assert result.states["tokenization"].status == "not_started"
    assert result.states["pos-tagging"].status == "locked"
    # Completing tokenization's module unlocks pos-tagging (no longer
    # locked), even though pos-tagging itself has no activity yet.
    result2 = compute_concept_dna({"tokenization": ConceptSignals(completed=True)})
    assert result2.states["pos-tagging"].status == "not_started"


def test_recommendation_prefers_a_concept_with_completed_prerequisites():
    result = compute_concept_dna({"perceptron-mlp": ConceptSignals(completed=True)})
    assert result.recommendation is not None
    assert result.recommendation.concept is not None
    assert result.recommendation.concept.id == "neural-networks"
    assert "Perceptrons" in result.recommendation.reason


def test_cross_domain_highlight_only_appears_with_real_source_activity():
    # No activity on "similarity" (the source of one curated cross-domain
    # edge) -> no highlight invented.
    result = compute_concept_dna({})
    assert result.cross_domain_highlights == []

    result2 = compute_concept_dna({"similarity": ConceptSignals(completed=True)})
    highlighted_sources = [h.path_ids[0] for h in result2.cross_domain_highlights]
    assert "similarity" in highlighted_sources


def test_concept_dna_endpoint_requires_auth():
    response = client.get("/api/concept-dna")
    assert response.status_code == 401


def test_concept_dna_endpoint_reflects_real_progress(auth_headers):
    # Fresh account: empty-state shape.
    empty = client.get("/api/concept-dna", headers=auth_headers)
    assert empty.status_code == 200
    empty_body = empty.json()
    assert empty_body["has_any_activity"] is False
    assert empty_body["weak_concepts"] == []
    assert empty_body["summary"]["total_concepts"] == len(empty_body["concepts"])

    # Drive real state through the REAL progress API — never writing to
    # the test DB directly — exactly like a real student completing a
    # lesson and a quiz would.
    complete = client.post(
        "/api/progress/complete",
        json={"domain": "nlp", "module_id": "preprocessing", "status": "completed"},
        headers=auth_headers,
    )
    assert complete.status_code == 200

    quiz = client.post(
        "/api/progress/quiz-result",
        json={"domain": "dl", "quiz_id": "dl-module-1-quiz", "total_questions": 5, "correct_answers": 1},
        headers=auth_headers,
    )
    assert quiz.status_code == 200

    populated = client.get("/api/concept-dna", headers=auth_headers)
    assert populated.status_code == 200
    body = populated.json()
    assert body["has_any_activity"] is True

    by_id = {c["id"]: c for c in body["concepts"]}
    assert by_id["tokenization"]["completed"] is True
    assert by_id["tokenization"]["status"] == "developing"
    assert by_id["perceptron-mlp"]["quiz_attempts"] == 1
    assert by_id["perceptron-mlp"]["quiz_average_score"] == pytest.approx(20.0)
    # A 20% quiz score with a completed lesson should read as a real
    # weakness, not a success.
    assert by_id["perceptron-mlp"]["status"] == "needs_attention"
    weak_ids = [w["id"] for w in body["weak_concepts"]]
    assert "perceptron-mlp" in weak_ids

    # Never exposes raw QuizResult/ChallengeAttempt internals or another
    # user's data — just the derived per-concept numbers.
    for concept in body["concepts"]:
        assert set(concept.keys()) == {
            "id", "label", "domain", "description", "difficulty", "route", "status", "mastery_score",
            "prerequisite_ids", "related_ids", "completed", "quiz_attempts", "quiz_average_score",
            "challenge_attempts", "challenge_correct",
        }
