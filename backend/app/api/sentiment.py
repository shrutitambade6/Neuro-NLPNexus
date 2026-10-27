from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.sentiment import SentimentRequest, SentimentResponse
from app.services.sentiment_service import run_sentiment

router = APIRouter()


@router.post("/applications/sentiment", response_model=SentimentResponse)
def sentiment(payload: SentimentRequest, user: User = Depends(require_user)) -> SentimentResponse:
    return run_sentiment(payload.text)
