"""
Concept DNA — the mastery/recommendation engine. Pure functions, no
database/ORM imports, matching this project's algorithms (pure) ->
services (I/O) convention (see badges.py's own docstring for the same
rule). Everything here is computed fresh from real signals the caller
already queried from the database (app/services/concept_dna_service.py
does that querying) — nothing in this file invents a score, a status, or
an explanation; every number traces back to a real LearningProgress,
QuizResult, or ChallengeAttempt row.

Three real signal sources per concept (see concept_catalog.py's own
docstring for exactly which concepts have which):
  - lesson/lab completion (every concept has this)
  - quiz score, where a real graded quiz exists for that concept's module
  - DL Challenge attempts, where the real Challenges system covers it

MASTERY SCORE (0-100), the honest part: lesson completion alone is
deliberately capped below the "Strong" threshold (70, landing in
Developing) because finishing a lesson page is not the same evidence as
answering real assessment questions correctly. Once a quiz and/or
challenge signal exists, the score blends completion (35%) with that real
assessment performance (65%) — so a concept only reaches "Strong" once
the student has actually demonstrated it, not just visited the page.

STATUS is derived from mastery + whether there's been any real activity
at all + whether prerequisites are satisfied, in that order:
  - no activity anywhere (not completed, never quizzed, never
    attempted a challenge) AND at least one prerequisite isn't completed
    yet -> "locked"
  - no activity, but nothing (or everything) prerequisite-wise is
    blocking it -> "not_started"
  - some real activity exists -> "strong" / "developing" / "needs_attention"
    purely by the mastery score thresholds below.
Concepts are evaluated in topological order (prerequisites before their
dependents) via Kahn's algorithm, so a concept's locked/unlocked state is
always computed from its prerequisites' ALREADY-COMPUTED status, never
from declaration order in concept_catalog.py.
"""
from collections import deque
from dataclasses import dataclass, field

from app.algorithms.concept_catalog import ALL_CONCEPTS, ALL_EDGES, CONCEPTS_BY_ID, Concept, ConceptEdge

STRONG_THRESHOLD = 80
DEVELOPING_THRESHOLD = 40
# The honest ceiling for "completed the lesson, but no real quiz/challenge
# evidence exists yet" — below STRONG on purpose (see module docstring).
COMPLETION_ONLY_SCORE = 70

Status = str  # "strong" | "developing" | "needs_attention" | "not_started" | "locked"


@dataclass(frozen=True)
class ConceptSignals:
    """What the service layer actually knows about one concept for one
    student — the ONLY inputs this file's scoring ever reads. Any signal
    that doesn't apply to a given concept (see Concept.quiz_id /
    challenge_module) simply stays at its default/empty value; this file
    never invents a value for a signal concept_catalog.py says doesn't
    exist for that concept."""
    completed: bool = False
    quiz_attempts: int = 0
    quiz_average_score: float | None = None
    challenge_attempts: int = 0
    challenge_correct: int = 0


@dataclass
class ConceptState:
    concept: Concept
    status: Status
    mastery_score: int
    signals: ConceptSignals
    has_activity: bool


@dataclass
class WeakConcept:
    concept: Concept
    mastery_score: int
    reasons: list[str]


@dataclass
class Recommendation:
    concept: Concept | None
    reason: str


@dataclass
class CrossDomainHighlight:
    path_ids: list[str]
    path_labels: list[str]
    narrative: str


@dataclass
class ConceptDnaResult:
    states: dict[str, ConceptState]
    edges: list[ConceptEdge]
    weak_concepts: list[WeakConcept]
    recommendation: Recommendation | None
    cross_domain_highlights: list[CrossDomainHighlight]
    has_any_activity: bool
    summary: dict[str, int] = field(default_factory=dict)


def _topological_order(concepts: list[Concept]) -> list[Concept]:
    """Kahn's algorithm over the prerequisite_ids DAG. concept_catalog.py's
    ALL_CONCEPTS is already close to this order by construction, but
    sorting explicitly means a future reordering/addition there can never
    silently break locked-status propagation."""
    by_id = {c.id: c for c in concepts}
    indegree = {c.id: 0 for c in concepts}
    dependents: dict[str, list[str]] = {c.id: [] for c in concepts}
    for c in concepts:
        for prereq_id in c.prerequisite_ids:
            if prereq_id in by_id:
                indegree[c.id] += 1
                dependents[prereq_id].append(c.id)

    queue = deque(cid for cid, deg in indegree.items() if deg == 0)
    ordered: list[Concept] = []
    seen: set[str] = set()
    while queue:
        cid = queue.popleft()
        if cid in seen:
            continue
        seen.add(cid)
        ordered.append(by_id[cid])
        for dep_id in dependents[cid]:
            indegree[dep_id] -= 1
            if indegree[dep_id] == 0:
                queue.append(dep_id)
    # Any concept left out (a cycle, which concept_catalog.py's hand-curated
    # data should never produce) is appended as-is rather than dropped —
    # fails safe, never silently loses a concept from the graph.
    for c in concepts:
        if c.id not in seen:
            ordered.append(c)
    return ordered


def _score_concept(signals: ConceptSignals) -> tuple[int, bool]:
    completion_score = 100 if signals.completed else 0
    assessment_scores: list[float] = []
    if signals.quiz_attempts > 0 and signals.quiz_average_score is not None:
        assessment_scores.append(signals.quiz_average_score)
    if signals.challenge_attempts > 0:
        assessment_scores.append(round((signals.challenge_correct / signals.challenge_attempts) * 100))

    has_activity = signals.completed or signals.quiz_attempts > 0 or signals.challenge_attempts > 0

    if assessment_scores:
        assessment_score = sum(assessment_scores) / len(assessment_scores)
        mastery = round(0.35 * completion_score + 0.65 * assessment_score)
    elif signals.completed:
        mastery = COMPLETION_ONLY_SCORE
    else:
        mastery = 0

    return mastery, has_activity


def _status_for(mastery: int, has_activity: bool, prerequisites_satisfied: bool) -> Status:
    if not has_activity:
        return "not_started" if prerequisites_satisfied else "locked"
    if mastery >= STRONG_THRESHOLD:
        return "strong"
    if mastery >= DEVELOPING_THRESHOLD:
        return "developing"
    return "needs_attention"


def _weak_reasons(concept: Concept, signals: ConceptSignals, states: dict[str, ConceptState]) -> list[str]:
    reasons: list[str] = []
    if signals.quiz_attempts > 0 and signals.quiz_average_score is not None and signals.quiz_average_score < 60:
        reasons.append(f"Quiz average of {round(signals.quiz_average_score)}% on this concept's quiz.")
    if signals.challenge_attempts > 0:
        incorrect = signals.challenge_attempts - signals.challenge_correct
        if incorrect > 0:
            reasons.append(f"{incorrect} incorrect challenge attempt{'s' if incorrect != 1 else ''}.")
    for prereq_id in concept.prerequisite_ids:
        prereq_state = states.get(prereq_id)
        if prereq_state and prereq_state.status in ("needs_attention", "developing"):
            reasons.append(f"Prerequisite '{prereq_state.concept.label}' could use more practice.")
    if not reasons:
        reasons.append("Recent activity on this concept has been below your usual level.")
    return reasons


def compute_concept_dna(signals_by_concept_id: dict[str, ConceptSignals]) -> ConceptDnaResult:
    ordered = _topological_order(ALL_CONCEPTS)
    states: dict[str, ConceptState] = {}
    any_activity = False

    for concept in ordered:
        signals = signals_by_concept_id.get(concept.id, ConceptSignals())
        mastery, has_activity = _score_concept(signals)
        if has_activity:
            any_activity = True
        prerequisites_satisfied = all(
            states.get(pid) is not None and states[pid].signals.completed for pid in concept.prerequisite_ids
        )
        status = _status_for(mastery, has_activity, prerequisites_satisfied)
        states[concept.id] = ConceptState(
            concept=concept, status=status, mastery_score=mastery, signals=signals, has_activity=has_activity
        )

    # Weak Concept Radar (spec point 10) — the lowest-scoring concepts that
    # genuinely have SOME real activity (a concept with zero activity is
    # "not started," never "needs attention" — there's nothing to be weak
    # at yet).
    weak_candidates = [s for s in states.values() if s.status == "needs_attention"]
    weak_candidates.sort(key=lambda s: s.mastery_score)
    weak_concepts = [
        WeakConcept(concept=s.concept, mastery_score=s.mastery_score, reasons=_weak_reasons(s.concept, s.signals, states))
        for s in weak_candidates[:5]
    ]

    recommendation = _recommend_next(states)
    cross_domain = _cross_domain_highlights(states)

    summary = {
        "total_concepts": len(states),
        "strong": sum(1 for s in states.values() if s.status == "strong"),
        "developing": sum(1 for s in states.values() if s.status == "developing"),
        "needs_attention": sum(1 for s in states.values() if s.status == "needs_attention"),
        "not_started": sum(1 for s in states.values() if s.status == "not_started"),
        "locked": sum(1 for s in states.values() if s.status == "locked"),
        "cross_domain_connections": sum(1 for e in ALL_EDGES if e.cross_domain),
    }

    return ConceptDnaResult(
        states=states,
        edges=ALL_EDGES,
        weak_concepts=weak_concepts,
        recommendation=recommendation,
        cross_domain_highlights=cross_domain,
        has_any_activity=any_activity,
        summary=summary,
    )


def _recommend_next(states: dict[str, ConceptState]) -> Recommendation | None:
    """Spec point 11: a single, explained "what to learn next." Candidates
    are concepts the student hasn't touched yet but CAN start (not
    locked) — among those, prefer the one with the most already-completed
    prerequisites (the most "connected" next step), breaking ties by the
    catalog's own declared order. If every reachable concept has already
    been started, there's nothing honest to recommend as "next" — this
    returns None rather than inventing one, and the API/frontend show the
    spec's own "not enough activity yet" / "you're exploring everything"
    framing instead."""
    candidates = [s for s in states.values() if s.status == "not_started"]
    if not candidates:
        return None

    def completed_prereq_count(state: ConceptState) -> int:
        return sum(
            1 for pid in state.concept.prerequisite_ids if states.get(pid) and states[pid].signals.completed
        )

    # Only recommend a concept that's actually connected to something the
    # student has done — a concept with prerequisites, at least one of
    # which is done, or a concept with no prerequisites at all (a genuine
    # starting point) if nothing else qualifies.
    connected = [s for s in candidates if s.concept.prerequisite_ids and completed_prereq_count(s) > 0]
    pool = connected if connected else [s for s in candidates if not s.concept.prerequisite_ids]
    if not pool:
        pool = candidates

    pool.sort(key=lambda s: (-completed_prereq_count(s), s.concept.difficulty != "beginner"))
    chosen = pool[0]

    done_prereqs = [states[pid].concept.label for pid in chosen.concept.prerequisite_ids if states.get(pid) and states[pid].signals.completed]
    if done_prereqs:
        reason = (
            f"You've completed {', '.join(done_prereqs)} — {chosen.concept.label} is the next connected concept."
        )
    else:
        reason = f"{chosen.concept.label} is a great starting point based on what you've covered so far."

    return Recommendation(concept=chosen.concept, reason=reason)


def _cross_domain_highlights(states: dict[str, ConceptState]) -> list[CrossDomainHighlight]:
    """Spec point 9 — "Your Cross-Domain Connections." Only ever generated
    for a cross_domain edge (see concept_catalog.py's hand-curated,
    deliberately small set) where the student has REAL activity on the
    source side — an edge the student hasn't touched yet isn't "their"
    connection to narrate."""
    highlights: list[CrossDomainHighlight] = []
    for edge in ALL_EDGES:
        if not edge.cross_domain:
            continue
        source_state = states.get(edge.source_id)
        target_state = states.get(edge.target_id)
        if not source_state or not target_state:
            continue
        if not source_state.has_activity:
            continue
        narrative = edge.note or f"{source_state.concept.label} connects to {target_state.concept.label}."
        highlights.append(
            CrossDomainHighlight(
                path_ids=[edge.source_id, edge.target_id],
                path_labels=[source_state.concept.label, target_state.concept.label],
                narrative=narrative,
            )
        )
    return highlights
