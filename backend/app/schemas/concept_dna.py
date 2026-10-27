"""
Concept DNA API schemas. Mirrors app/algorithms/concept_dna.py's result
shapes field-for-field, the same way every other schemas/*.py file in
this project mirrors its own service's return types — see schemas/
progress.py's own convention.

Deliberately exposes only derived numbers (mastery_score, status, counts)
plus the already-public concept catalog (label/description/route) —
never raw QuizResult/ChallengeAttempt rows, and nothing here differs per
VIEWER the way some other schemas have to (every field here is already
scoped to "my own" progress by the endpoint's require_user dependency, so
there's no separate public/owner-only split to make, unlike e.g.
BirthdayMe vs RelatedBirthday).
"""
from pydantic import BaseModel


class ConceptStateOut(BaseModel):
    id: str
    label: str
    domain: str  # "nlp" | "dl"
    description: str
    difficulty: str  # "beginner" | "intermediate" | "advanced"
    route: str
    status: str  # "strong" | "developing" | "needs_attention" | "not_started" | "locked"
    mastery_score: int
    prerequisite_ids: list[str]
    related_ids: list[str]
    completed: bool
    quiz_attempts: int
    quiz_average_score: float | None
    challenge_attempts: int
    challenge_correct: int


class ConceptEdgeOut(BaseModel):
    source_id: str
    target_id: str
    relationship_type: str  # "prerequisite" | "related"
    cross_domain: bool
    # True only when BOTH endpoints are concepts the student has actually
    # completed — spec point 8's "Highlighted line: student has completed
    # both concepts."
    completed_both: bool


class ConceptSummaryOut(BaseModel):
    total_concepts: int
    strong: int
    developing: int
    needs_attention: int
    not_started: int
    locked: int
    cross_domain_connections: int


class WeakConceptOut(BaseModel):
    id: str
    label: str
    domain: str
    mastery_score: int
    reasons: list[str]
    route: str


class RecommendationOut(BaseModel):
    concept_id: str | None
    label: str | None
    route: str | None
    reason: str


class CrossDomainHighlightOut(BaseModel):
    path_ids: list[str]
    path_labels: list[str]
    narrative: str


class ConceptDnaResponse(BaseModel):
    summary: ConceptSummaryOut
    concepts: list[ConceptStateOut]
    edges: list[ConceptEdgeOut]
    weak_concepts: list[WeakConceptOut]
    recommendation: RecommendationOut | None
    cross_domain_highlights: list[CrossDomainHighlightOut]
    # Spec point 17 — lets the frontend show the dedicated empty state
    # ("Your Concept DNA is still forming") instead of a 0%-everywhere
    # grid that would read as broken, without the frontend having to
    # re-derive "no real activity at all" itself from the concept list.
    has_any_activity: bool
