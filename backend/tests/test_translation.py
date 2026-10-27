import pytest

from app.algorithms.translation import SUPPORTED_LANGUAGES, TranslationError, translate_text


def fake_client(text: str, source: str, target: str) -> str:
    return f"[{target}]{text}"


def test_translate_uses_injected_client():
    r = translate_text("hello", "en", "hi", client=fake_client)
    assert r["translated_text"] == "[hi]hello"
    assert r["source_lang_name"] == "English"
    assert r["target_lang_name"] == "Hindi"
    assert "Google Translate" in r["service"]


def test_rejects_unsupported_source_language():
    with pytest.raises(TranslationError):
        translate_text("hello", "zz", "hi", client=fake_client)


def test_rejects_unsupported_target_language():
    with pytest.raises(TranslationError):
        translate_text("hello", "en", "zz", client=fake_client)


def test_rejects_same_source_and_target():
    with pytest.raises(TranslationError):
        translate_text("hello", "en", "en", client=fake_client)


def test_rejects_empty_text():
    with pytest.raises(TranslationError):
        translate_text("   ", "en", "hi", client=fake_client)


def test_client_exception_wrapped_as_translation_error():
    def broken_client(text, source, target):
        raise ConnectionError("no network")

    with pytest.raises(TranslationError):
        translate_text("hello", "en", "hi", client=broken_client)


def test_supported_languages_has_english_and_hindi():
    assert "en" in SUPPORTED_LANGUAGES
    assert "hi" in SUPPORTED_LANGUAGES
