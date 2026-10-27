from app.algorithms.ner import extract_entities
from app.algorithms.ner_spacy import extract_entities_spacy
from app.schemas.ner import NerResponse


def run_ner(text: str, engine: str = "rule_based") -> NerResponse:
    if engine == "spacy":
        return NerResponse(**extract_entities_spacy(text))
    return NerResponse(**extract_entities(text))
