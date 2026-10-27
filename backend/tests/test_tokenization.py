from app.algorithms.tokenization import (
    regex_tokenize,
    rule_based_tokenize,
    sentence_tokenize,
    whitespace_tokenize,
)


def test_whitespace_tokenize_basic():
    assert whitespace_tokenize("The students are studying NLP.") == [
        "The", "students", "are", "studying", "NLP.",
    ]


def test_rule_based_tokenize_splits_punctuation():
    tokens = rule_based_tokenize("The students are studying NLP.")
    assert tokens[-2:] == ["NLP", "."]


def test_rule_based_tokenize_preserves_decimals():
    tokens = rule_based_tokenize("Pi is 3.14 roughly.")
    assert "3.14" in tokens


def test_regex_tokenize_handles_contractions():
    tokens = regex_tokenize("I don't think that's right.")
    assert "don't" in tokens
    assert "that's" in tokens


def test_sentence_tokenize_basic():
    text = "The students are studying NLP. They enjoy it!"
    sentences = sentence_tokenize(text)
    assert len(sentences) == 2
    assert sentences[0].endswith(".")
    assert sentences[1].endswith("!")


def test_sentence_tokenize_handles_abbreviations():
    text = "Dr. Smith teaches NLP. The class is popular."
    sentences = sentence_tokenize(text)
    assert len(sentences) == 2
    assert sentences[0].startswith("Dr. Smith")


def test_empty_input_returns_empty_lists():
    assert whitespace_tokenize("") == []
    assert regex_tokenize("") == []
    assert sentence_tokenize("") == []


def test_unicode_devanagari_input_does_not_crash():
    text = "विद्यार्थी एनएलपी सीख रहे हैं।"
    # Whitespace tokenization should still split on spaces correctly.
    assert len(whitespace_tokenize(text)) == 5
    # Regex tokenizer's ASCII-letter pattern won't match Devanagari word
    # chars — full Unicode-aware tokenization is addressed in the Regional
    # NLP phase. This test documents that limitation rather than hiding it.
    assert regex_tokenize(text) is not None
