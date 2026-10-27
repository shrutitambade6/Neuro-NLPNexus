"""
Community / Discussions catalog — the fixed set of subject topics a
doubt/discussion can be tagged with, mirroring the finite-catalog approach
in app/algorithms/progress_catalog.py (same reasoning: a topic filter is
only useful if the set of topics is fixed and real, not arbitrary free
text typed per-discussion).

`linked_module_id`, where present, is deliberately one of
progress_catalog's own `module_id` values — the exact slug used for
`/learning-progress` rows AND the page's route (see that file's own
docstring: "module_id is... the page's route slug"). Reusing it here
means a discussion's "optional reference to a specific lab/module" is
never a made-up string that doesn't actually point anywhere: it's always
either None or a module_id that frontend/src/utils/navigation.ts already
has a real route for (`/${module_id}`), so the frontend can link straight
to that lab without a second lookup table.
"""
from dataclasses import dataclass

from app.algorithms.progress_catalog import CATALOG_BY_DOMAIN


@dataclass(frozen=True)
class CommunityTopic:
    name: str
    # A sensible default lab/module to suggest when a student picks this
    # topic while asking a doubt — still optional, still overridable to
    # None; this is a suggestion, not a constraint.
    default_module_id: str | None


NLP_TOPICS: list[CommunityTopic] = [
    CommunityTopic("Tokenization", "preprocessing"),
    CommunityTopic("POS Tagging", "pos-tagging"),
    CommunityTopic("Language Modeling", "language-modeling"),
    CommunityTopic("Parsing", "parsing"),
    CommunityTopic("Semantics", "semantics"),
    CommunityTopic("Discourse", "discourse"),
    CommunityTopic("General NLP", None),
]

DL_TOPICS: list[CommunityTopic] = [
    CommunityTopic("Neural Networks", "neural-networks"),
    CommunityTopic("Backpropagation", "dl-module-2"),
    CommunityTopic("CNN", "cnn-lab"),
    CommunityTopic("RNN/LSTM", "rnn-lstm-lab"),
    CommunityTopic("Transformers", "attention-transformers"),
    CommunityTopic("Autoencoders", "dl-module-3"),
    CommunityTopic("General Deep Learning", None),
]

TOPICS_BY_DOMAIN: dict[str, list[CommunityTopic]] = {
    "nlp": NLP_TOPICS,
    "dl": DL_TOPICS,
}


def valid_domains() -> set[str]:
    return {"nlp", "dl"}


def valid_topic_names(domain: str) -> set[str]:
    return {t.name for t in TOPICS_BY_DOMAIN.get(domain, [])}


def valid_module_id(domain: str, module_id: str | None) -> bool:
    """A discussion's linked_module_id, if given, must be a real module_id
    that exists in progress_catalog for THAT domain — never an arbitrary
    string, and never a DL module id attached to an "nlp" discussion or
    vice versa."""
    if module_id is None:
        return True
    return module_id in {lesson.module_id for lesson in CATALOG_BY_DOMAIN.get(domain, [])}
