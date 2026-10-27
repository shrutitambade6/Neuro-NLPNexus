"""
Tokenization algorithms implemented from scratch for educational comparison.

These are intentionally simple and transparent (no spaCy/NLTK here) so the
frontend can show *why* whitespace, rule-based, and regex tokenization
disagree on the same sentence. spaCy-backed tokenization is added in the
Preprocessing Lab phase as a fourth point of comparison.
"""
import re


def whitespace_tokenize(text: str) -> list[str]:
    """Splits purely on whitespace. Punctuation stays glued to words —
    this is the naive baseline every NLP course starts with."""
    return text.split()


def rule_based_tokenize(text: str) -> list[str]:
    """A hand-written rule-based tokenizer: separates common punctuation
    from words but keeps things like contractions and decimal numbers
    together, mimicking (a simplified version of) how Penn Treebank-style
    tokenizers behave."""
    # Protect decimal numbers and common contractions from being split.
    protected = re.sub(r"(\d)\.(\d)", r"\1<DECIMAL>\2", text)

    # Separate sentence-final punctuation and standalone symbols.
    protected = re.sub(r"([.,!?;:])", r" \1 ", protected)
    protected = re.sub(r"([\"'()\[\]{}])", r" \1 ", protected)

    tokens = protected.split()
    return [t.replace("<DECIMAL>", ".") for t in tokens]


def regex_tokenize(text: str) -> list[str]:
    """Tokenizes using a single regex: words (including internal
    apostrophes/hyphens) OR a single punctuation/symbol character."""
    pattern = r"[A-Za-z]+(?:['-][A-Za-z]+)*|\d+(?:\.\d+)?|[^\sA-Za-z0-9]"
    return re.findall(pattern, text)


def sentence_tokenize(text: str) -> list[str]:
    """Naive sentence splitter on '.', '!', '?' followed by whitespace,
    with a small guard against common abbreviations to show students
    *why* naive sentence tokenization breaks on real text."""
    abbreviations = {"mr", "mrs", "dr", "ms", "prof", "sr", "jr", "vs", "etc"}

    # Temporarily mask periods after known abbreviations.
    def mask(match: re.Match) -> str:
        word = match.group(1)
        return f"{word}<PERIOD>" if word.lower() in abbreviations else match.group(0)

    masked = re.sub(r"\b(\w+)\.", mask, text)
    parts = re.split(r"(?<=[.!?])\s+", masked)
    return [p.replace("<PERIOD>", ".").strip() for p in parts if p.strip()]


TOKENIZERS = {
    "whitespace": whitespace_tokenize,
    "rule_based": rule_based_tokenize,
    "regex": regex_tokenize,
}
