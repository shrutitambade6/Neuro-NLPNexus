from app.algorithms.sentiment import analyze_sentiment


def test_positive_review_detected():
    r = analyze_sentiment("The product is amazing and works perfectly!")
    assert r["label"] == "Positive"
    assert r["score"] > 0
    assert r["confidence"] > 0


def test_negative_review_detected():
    r = analyze_sentiment("This is terrible and completely broken, I hate it.")
    assert r["label"] == "Negative"
    assert r["score"] < 0


def test_negation_flips_polarity():
    r = analyze_sentiment("This is not good.")
    assert r["label"] == "Negative"
    matched = r["matched_words"][0]
    assert matched["negated"] is True
    assert matched["contribution"] < 0


def test_intensifier_scales_score():
    plain = analyze_sentiment("This is good.")
    intensified = analyze_sentiment("This is very good.")
    assert abs(intensified["score"]) > abs(plain["score"])


def test_neutral_text_has_no_matches():
    r = analyze_sentiment("The meeting is scheduled for Tuesday at noon.")
    assert r["label"] == "Neutral"
    assert r["matched_words"] == []
    assert r["confidence"] == 0.0


def test_pipeline_has_four_stages():
    r = analyze_sentiment("Great product.")
    assert len(r["pipeline"]) == 4
