from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    source_lang: str = Field(..., min_length=2, max_length=5)
    target_lang: str = Field(..., min_length=2, max_length=5)


class TranslateResponse(BaseModel):
    source_lang: str
    target_lang: str
    source_lang_name: str
    target_lang_name: str
    original_text: str
    translated_text: str
    service: str


class SupportedLanguagesResponse(BaseModel):
    languages: dict[str, str]
