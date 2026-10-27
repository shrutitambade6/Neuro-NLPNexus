from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.translation import TranslationError
from app.schemas.translation import SupportedLanguagesResponse, TranslateRequest, TranslateResponse
from app.services.translation_service import get_supported_languages, run_translate

router = APIRouter()


@router.get("/applications/translate/languages", response_model=SupportedLanguagesResponse)
def languages(user: User = Depends(require_user)) -> SupportedLanguagesResponse:
    return get_supported_languages()


@router.post("/applications/translate", response_model=TranslateResponse)
def translate(payload: TranslateRequest, user: User = Depends(require_user)) -> TranslateResponse:
    try:
        return run_translate(payload.text, payload.source_lang, payload.target_lang)
    except TranslationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
