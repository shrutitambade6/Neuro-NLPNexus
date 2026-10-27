"""
The canonical list of "trackable" lessons per domain — the real, finite
checklist that NLP/DL completion percentages are computed against.

Why this exists: "X% of the NLP curriculum complete" is only an honest
number if "100%" means something concrete. Rather than inventing an
arbitrary total, this file enumerates the exact set of real, built pages
(see frontend/src/utils/navigation.ts — every entry here mirrors a
`status: "ready"` NAV_ITEM) that carry a "Mark lesson complete" control.
Both the backend's completion-percentage math (app/services/
progress_service.py) and the frontend's LessonCompleteButton placements
use this same enumeration, so "100%" on the dashboard and "100%" in the
admin view always mean the same, real thing.

Each entry's `module_id` is what's persisted in `learning_progress.module_id`
— it's the page's route slug, not a display label, so renaming a nav
label later doesn't silently break anyone's saved progress.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class TrackableLesson:
    module_id: str
    label: str


NLP_TRACKABLE_LESSONS: list[TrackableLesson] = [
    TrackableLesson("nlp-foundations", "NLP Foundations"),
    TrackableLesson("nlp-learning-hub", "NLP Learning Hub"),
    TrackableLesson("preprocessing", "Text Processing"),
    TrackableLesson("pos-tagging", "POS Tagging Lab"),
    TrackableLesson("language-modeling", "Language Modeling"),
    TrackableLesson("parsing", "Parsing Lab"),
    TrackableLesson("semantics", "Semantic Lab"),
    TrackableLesson("discourse", "Discourse Lab"),
    TrackableLesson("nlp-applications", "Real-World NLP"),
    TrackableLesson("nlp-playground", "NLP Playground"),
]

DL_TRACKABLE_LESSONS: list[TrackableLesson] = [
    TrackableLesson("dl-foundations", "DL Foundations"),
    TrackableLesson("dl-module-1", "Module 1 — Foundations"),
    TrackableLesson("dl-module-2", "Module 2 — Backpropagation"),
    TrackableLesson("dl-module-3", "Module 3 — Autoencoders"),
    TrackableLesson("neural-networks", "Neural Networks"),
    TrackableLesson("cnn-lab", "CNN Lab"),
    TrackableLesson("rnn-lstm-lab", "RNN & LSTM Lab"),
    TrackableLesson("attention-transformers", "Attention & Transformers"),
    TrackableLesson("dl-applications", "Deep Learning Applications"),
]

CATALOG_BY_DOMAIN: dict[str, list[TrackableLesson]] = {
    "nlp": NLP_TRACKABLE_LESSONS,
    "dl": DL_TRACKABLE_LESSONS,
}


def valid_module_ids(domain: str) -> set[str]:
    return {lesson.module_id for lesson in CATALOG_BY_DOMAIN.get(domain, [])}


def total_lessons(domain: str) -> int:
    return len(CATALOG_BY_DOMAIN.get(domain, []))
