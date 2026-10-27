from typing import Literal

from pydantic import BaseModel, Field, field_validator


class NerRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    # "rule_based" (this project's own from-scratch gazetteer NER, the
    # default) or "spacy" (a real pretrained model, opt-in -- see
    # app/algorithms/ner_spacy.py for why this one module has it).
    engine: Literal["rule_based", "spacy"] = "rule_based"

    @field_validator("text")
    @classmethod
    def validate_text_not_blank(cls, v: str) -> str:
        # min_length=1 alone still lets a single space through -- this
        # catches whitespace-only input with a clean 422 instead of
        # either engine quietly reporting "no entities found" as if it
        # had actually analyzed something.
        if not v.strip():
            raise ValueError("Text cannot be empty or whitespace-only.")
        return v


class Entity(BaseModel):
    text: str
    start: int
    end: int
    label: str
    # Human-readable name for `label` (e.g. "GPE" -> "Geopolitical
    # Entity"). Never used to rename/merge the underlying label itself.
    label_display: str | None = None


class NerResponse(BaseModel):
    text: str
    entities: list[Entity]
    by_label: dict[str, list[str]]
    supported_labels: list[str]
    engine: str = "rule_based"
