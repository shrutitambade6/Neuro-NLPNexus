"""
Concept DNA — the I/O half (see app/algorithms/concept_dna.py's own
docstring for the pure scoring logic). This module's only job is: query
this student's REAL rows from the three tables that already exist
(LearningProgress, QuizResult, ChallengeAttempt/Challenge — the exact same
tables app/services/progress_service.py and challenges_service.py already
read), turn them into the per-concept ConceptSignals the scoring engine
expects, and translate its result into the API response schemas. No new
table, no second progress system — see concept_catalog.py's own docstring
for why every concept maps onto signals these tables already carry.
"""
from sqlalchemy.orm import Session

from app.algorithms.concept_catalog import ALL_CONCEPTS
from app.algorithms.concept_dna import ConceptSignals, compute_concept_dna
from app.models.orm_models import Challenge, ChallengeAttempt, LearningProgress, QuizResult, User
from app.schemas.concept_dna import (
    ConceptDnaResponse,
    ConceptEdgeOut,
    ConceptStateOut,
    ConceptSummaryOut,
    CrossDomainHighlightOut,
    RecommendationOut,
    WeakConceptOut,
)


def _completed_module_ids(db: Session, user_id: int) -> set[str]:
    rows = (
        db.query(LearningProgress.module_id)
        .filter(LearningProgress.user_id == user_id, LearningProgress.status == "completed")
        .all()
    )
    return {module_id for (module_id,) in rows}


def _quiz_stats(db: Session, user_id: int) -> dict[str, tuple[int, float]]:
    """quiz_id -> (attempt_count, average_score) — every attempt counts,
    averaged, rather than only the best or most recent, so a concept's
    quiz signal reflects the student's real overall performance on it."""
    rows = db.query(QuizResult.quiz_id, QuizResult.score).filter(QuizResult.user_id == user_id).all()
    by_quiz: dict[str, list[int]] = {}
    for quiz_id, score in rows:
        by_quiz.setdefault(quiz_id, []).append(score)
    return {quiz_id: (len(scores), sum(scores) / len(scores)) for quiz_id, scores in by_quiz.items()}


def _challenge_stats(db: Session, user_id: int) -> dict[str, tuple[int, int]]:
    """Challenge.module -> (attempt_count, correct_count) — raw attempts,
    not deduplicated per-challenge (unlike challenges_service.
    get_my_dl_progress's "solved" count), because the Weak Concept Radar
    wants to say "2 incorrect attempts," which means counting every real
    attempt row, not collapsing retries."""
    rows = (
        db.query(Challenge.module, ChallengeAttempt.correct)
        .join(Challenge, Challenge.id == ChallengeAttempt.challenge_id)
        .filter(ChallengeAttempt.user_id == user_id)
        .all()
    )
    by_module: dict[str, list[bool]] = {}
    for module, correct in rows:
        by_module.setdefault(module, []).append(bool(correct))
    return {module: (len(flags), sum(1 for f in flags if f)) for module, flags in by_module.items()}


def _build_signals(db: Session, user_id: int) -> dict[str, ConceptSignals]:
    completed = _completed_module_ids(db, user_id)
    quiz_stats = _quiz_stats(db, user_id)
    challenge_stats = _challenge_stats(db, user_id)

    signals: dict[str, ConceptSignals] = {}
    for concept in ALL_CONCEPTS:
        quiz_attempts, quiz_avg = quiz_stats.get(concept.quiz_id, (0, None)) if concept.quiz_id else (0, None)
        chal_attempts, chal_correct = (
            challenge_stats.get(concept.challenge_module, (0, 0)) if concept.challenge_module else (0, 0)
        )
        signals[concept.id] = ConceptSignals(
            completed=concept.module_id in completed,
            quiz_attempts=quiz_attempts,
            quiz_average_score=quiz_avg,
            challenge_attempts=chal_attempts,
            challenge_correct=chal_correct,
        )
    return signals


def get_concept_dna(db: Session, user: User) -> ConceptDnaResponse:
    signals = _build_signals(db, user.id)
    result = compute_concept_dna(signals)

    concepts_out = [
        ConceptStateOut(
            id=state.concept.id,
            label=state.concept.label,
            domain=state.concept.domain,
            description=state.concept.description,
            difficulty=state.concept.difficulty,
            route=state.concept.route,
            status=state.status,
            mastery_score=state.mastery_score,
            prerequisite_ids=list(state.concept.prerequisite_ids),
            related_ids=list(state.concept.related_ids),
            completed=state.signals.completed,
            quiz_attempts=state.signals.quiz_attempts,
            quiz_average_score=state.signals.quiz_average_score,
            challenge_attempts=state.signals.challenge_attempts,
            challenge_correct=state.signals.challenge_correct,
        )
        for state in result.states.values()
    ]

    edges_out = [
        ConceptEdgeOut(
            source_id=edge.source_id,
            target_id=edge.target_id,
            relationship_type=edge.relationship_type,
            cross_domain=edge.cross_domain,
            completed_both=bool(
                result.states.get(edge.source_id) and result.states.get(edge.target_id)
                and result.states[edge.source_id].signals.completed
                and result.states[edge.target_id].signals.completed
            ),
        )
        for edge in result.edges
    ]

    weak_out = [
        WeakConceptOut(
            id=w.concept.id, label=w.concept.label, domain=w.concept.domain,
            mastery_score=w.mastery_score, reasons=w.reasons, route=w.concept.route,
        )
        for w in result.weak_concepts
    ]

    recommendation_out = (
        RecommendationOut(
            concept_id=result.recommendation.concept.id,
            label=result.recommendation.concept.label,
            route=result.recommendation.concept.route,
            reason=result.recommendation.reason,
        )
        if result.recommendation and result.recommendation.concept
        else None
    )

    cross_domain_out = [
        CrossDomainHighlightOut(path_ids=h.path_ids, path_labels=h.path_labels, narrative=h.narrative)
        for h in result.cross_domain_highlights
    ]

    return ConceptDnaResponse(
        summary=ConceptSummaryOut(**result.summary),
        concepts=concepts_out,
        edges=edges_out,
        weak_concepts=weak_out,
        recommendation=recommendation_out,
        cross_domain_highlights=cross_domain_out,
        has_any_activity=result.has_any_activity,
    )
