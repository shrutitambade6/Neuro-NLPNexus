"""Service layer for the Text Preprocessing Lab.

Routers call into this module; this module calls into app.algorithms.
Keeping this separation means the algorithms can be unit tested with zero
FastAPI/Pydantic involvement, and the service can add caching, logging,
or experiment-history persistence later without touching the algorithms.
"""
from app.algorithms.tokenization import (
    regex_tokenize,
    rule_based_tokenize,
    sentence_tokenize,
    whitespace_tokenize,
)
from app.schemas.preprocessing import TokenizeComparison, TokenizeResponse


def compare_tokenizers(text: str) -> TokenizeResponse:
    comparison = TokenizeComparison(
        whitespace=whitespace_tokenize(text),
        rule_based=rule_based_tokenize(text),
        regex=regex_tokenize(text),
        sentences=sentence_tokenize(text),
    )
    counts = {
        "whitespace": len(comparison.whitespace),
        "rule_based": len(comparison.rule_based),
        "regex": len(comparison.regex),
        "sentences": len(comparison.sentences),
    }
    return TokenizeResponse(input_text=text, tokens=comparison, token_counts=counts)
