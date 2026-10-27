from app.algorithms.classification import classify
from app.schemas.classification import ClassifyResponse


def run_classify(text: str) -> ClassifyResponse:
    return ClassifyResponse(**classify(text))
