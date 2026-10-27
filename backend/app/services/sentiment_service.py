from app.algorithms.sentiment import analyze_sentiment
from app.schemas.sentiment import SentimentResponse


def run_sentiment(text: str) -> SentimentResponse:
    return SentimentResponse(**analyze_sentiment(text))
