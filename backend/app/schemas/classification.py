from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class ClassifyResponse(BaseModel):
    text: str
    predicted_category: str
    probabilities: dict[str, float]
    categories: list[str]
    training_examples_per_category: dict[str, int]
    method_note: str
