"""
Machine translation via real translation services — deep-translator's
GoogleTranslator (Google Translate's free public web endpoint, no API key
required) as the primary provider. This is genuine, real translation
technology, not a hand-rolled dictionary demo — but it does require
internet access from wherever the backend runs, and a total outage still
means an honest error, never a fabricated translation.

Google's free endpoint has a hard per-IP rate limit (deep_translator's own
TooManyRequests: "You made too many requests to the server... 5 requests
per second and up to 200k requests per day"), which a classroom of
students hitting the same demo page trips easily. Two mitigations, in
order:

1. A small in-process cache on Google's result ONLY (_cached_google_translate)
   — many students will try the same handful of example sentences, so this
   avoids re-hitting Google for a request this process already has a real
   answer for. Deliberately NOT a cache on the whole fallback chain: Google
   and MyMemory frequently phrase the same sentence differently (formal vs.
   casual register, different word choices), so caching a MyMemory answer
   would permanently lock that phrase onto the lower-quality fallback for
   the rest of the process's life, even seconds after Google's rate limit
   window passes. Only ever caching a genuine Google success means every
   later request for that phrase keeps retrying Google first and
   self-heals on its own.
2. A fallback provider — on ANY failure from Google (not just the rate
   limit; a transient network hiccup looks the same from here), this
   retries via MyMemory's free translation API before giving up, so a
   rate-limited Google doesn't take the whole feature down with it — but
   that fallback answer is only ever used for the one request that needed
   it, never stored.

The translator client is injectable (see `translate_text`'s `client`
parameter) specifically so tests can substitute a fake client and verify
this module's own logic (language validation, error handling) without
depending on live network access from the test environment.
"""
import logging
from dataclasses import dataclass
from functools import lru_cache

logger = logging.getLogger(__name__)

# Language pairs actually exercised/supported by this demo — kept short and
# honest rather than claiming deep-translator's full ~100+ language list
# works equally well for educational NLP text.
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
}

# MyMemory (the fallback provider) needs locale-qualified codes rather than
# the bare ISO-639-1 codes the rest of this module uses.
_MYMEMORY_LOCALE = {
    "en": "en-GB",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "fr": "fr-FR",
    "es": "es-ES",
    "de": "de-DE",
}


class TranslationError(Exception):
    pass


@dataclass
class TranslationResult:
    source_lang: str
    target_lang: str
    original_text: str
    translated_text: str
    service: str


@lru_cache(maxsize=512)
def _cached_google_translate(text: str, source: str, target: str) -> str:
    """Google only. Cached on success — lru_cache never caches a raised
    exception, so a rate-limited/failed call is simply retried fresh on
    the next request rather than getting stuck. Kept separate from the
    MyMemory fallback specifically so a fallback answer never ends up
    cached (see the module docstring)."""
    from deep_translator import GoogleTranslator

    return GoogleTranslator(source=source, target=target).translate(text)


def _default_client(text: str, source: str, target: str) -> tuple[str, str]:
    """Returns (translated_text, service_name) so callers can report which
    provider actually served the request."""
    try:
        import deep_translator  # noqa: F401 -- import-availability check only
    except ImportError as e:
        raise TranslationError(
            "deep-translator isn't installed. Run `pip install deep-translator` in the backend."
        ) from e

    google_error_detail = None
    try:
        translated = _cached_google_translate(text, source, target)
        return translated, "Google Translate (via deep-translator, free public endpoint)"
    except Exception as google_error:  # deep_translator's own exception types for network/rate-limit/API issues
        google_error_detail = f"{type(google_error).__name__}: {google_error}"
        logger.warning("Google Translate failed, falling back to MyMemory: %s", google_error_detail)

    try:
        from deep_translator import MyMemoryTranslator

        translated = MyMemoryTranslator(
            source=_MYMEMORY_LOCALE.get(source, source),
            target=_MYMEMORY_LOCALE.get(target, target),
        ).translate(text)
        return translated, "MyMemory (via deep-translator — Google Translate was rate-limited or unreachable)"
    except Exception as mymemory_error:
        raise TranslationError(
            f"Translation service unreachable or failed. Google Translate: {google_error_detail}. "
            f"MyMemory (fallback): {type(mymemory_error).__name__}: {mymemory_error}"
        ) from mymemory_error


def translate_text(text: str, source_lang: str, target_lang: str, client=_default_client) -> dict:
    if source_lang not in SUPPORTED_LANGUAGES:
        raise TranslationError(f"Unsupported source language '{source_lang}'. Supported: {list(SUPPORTED_LANGUAGES)}")
    if target_lang not in SUPPORTED_LANGUAGES:
        raise TranslationError(f"Unsupported target language '{target_lang}'. Supported: {list(SUPPORTED_LANGUAGES)}")
    if source_lang == target_lang:
        raise TranslationError("Source and target language must be different.")
    if not text.strip():
        raise TranslationError("Text to translate cannot be empty.")

    try:
        result = client(text, source_lang, target_lang)
    except TranslationError:
        raise
    except Exception as e:
        raise TranslationError(f"Translation service unreachable or failed: {e}") from e

    # The default client reports which provider actually served the
    # request (Google, or the MyMemory fallback) as (text, service) — an
    # injected test client still just returns a plain string, so the
    # historical "Google Translate" service label is kept for those.
    service = "Google Translate (via deep-translator, free public endpoint)"
    if isinstance(result, tuple):
        translated, service = result
    else:
        translated = result

    return {
        "source_lang": source_lang,
        "target_lang": target_lang,
        "source_lang_name": SUPPORTED_LANGUAGES[source_lang],
        "target_lang_name": SUPPORTED_LANGUAGES[target_lang],
        "original_text": text,
        "translated_text": translated,
        "service": service,
    }
