from app.algorithms.summarization import summarize

LONG_TEXT = (
    "Natural language processing is a field of artificial intelligence. "
    "It focuses on interaction between computers and human language. "
    "Tokenization splits text into words or subword units. "
    "Parsing builds a grammatical structure for a sentence. "
    "Sentiment analysis classifies text as positive or negative. "
    "Named entity recognition finds entities like people and places. "
    "This project implements many of these techniques from scratch."
)


def test_summary_is_shorter_than_original():
    r = summarize(LONG_TEXT, n_sentences=3)
    assert r["summary_sentence_count"] == 3
    assert r["summary_word_count"] < r["original_word_count"]
    assert r["compression_ratio"] > 0


def test_summary_sentences_are_verbatim_from_source():
    r = summarize(LONG_TEXT, n_sentences=2)
    source_sentences = {s.strip() for s in LONG_TEXT.split(". ")}
    for sentence in r["summary"].split(". "):
        assert any(sentence.strip().rstrip(".") in s for s in source_sentences) or sentence.strip() in LONG_TEXT


def test_short_text_returns_all_sentences_unscored():
    short = "Hello there. How are you?"
    r = summarize(short, n_sentences=3)
    assert r["summary_sentence_count"] == 2
    assert r["compression_ratio"] == 0.0 or r["summary"] == short


def test_n_sentences_respected_when_text_is_long_enough():
    r = summarize(LONG_TEXT, n_sentences=1)
    assert r["summary_sentence_count"] == 1
