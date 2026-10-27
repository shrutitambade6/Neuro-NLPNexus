from app.algorithms.translation import SUPPORTED_LANGUAGES, TranslationError, translate_text
from app.schemas.translation import SupportedLanguagesResponse, TranslateResponse


def run_translate(text: str, source_lang: str, target_lang: str) -> TranslateResponse:
    return TranslateResponse(**translate_text(text, source_lang, target_lang))


def get_supported_languages() -> SupportedLanguagesResponse:
    return SupportedLanguagesResponse(languages=SUPPORTED_LANGUAGES)
