from app.algorithms.discourse import resolve_pronoun
from app.schemas.discourse import ResolvePronounResponse


def run_resolve_pronoun(sentence: str, pronoun: str) -> ResolvePronounResponse:
    return ResolvePronounResponse(**resolve_pronoun(sentence, pronoun))
