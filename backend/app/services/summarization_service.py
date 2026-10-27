from app.algorithms.summarization import summarize
from app.schemas.summarization import SummarizeResponse


def run_summarize(text: str, n_sentences: int) -> SummarizeResponse:
    return SummarizeResponse(**summarize(text, n_sentences))
