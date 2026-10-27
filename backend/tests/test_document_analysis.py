from app.algorithms.document_analysis import analyze_document

TEXT = (
    "NLP is a fascinating field. Shruti works on it in Mumbai. "
    "It has many subfields including parsing and semantics. "
    "The results have been great so far."
)


def test_counts_are_correct():
    r = analyze_document(TEXT)
    assert r["sentence_count"] == 4
    assert r["word_count"] > 0


def test_entities_extracted():
    r = analyze_document(TEXT)
    labels = {e["label"] for e in r["entities"]}
    assert "PERSON" in labels
    assert "LOCATION" in labels


def test_sentiment_included():
    r = analyze_document(TEXT)
    assert r["sentiment"]["label"] in {"Positive", "Negative", "Neutral"}


def test_keywords_exclude_stopwords():
    r = analyze_document(TEXT)
    keyword_words = {k["word"] for k in r["keywords"]}
    assert "the" not in keyword_words
    assert "is" not in keyword_words


def test_summary_present_for_multi_sentence_text():
    r = analyze_document(TEXT)
    assert r["summary"]
    assert len(r["pipeline"]) == 4
