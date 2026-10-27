from app.algorithms.chatbot import ask


def test_known_topic_matched():
    r = ask("What is tokenization?")
    assert r["matched_topic"] == "Tokenization"
    assert "tokens" in r["answer"].lower()


def test_unknown_topic_gives_honest_fallback():
    r = ask("Tell me about the weather on Mars")
    assert r["matched_topic"] is None
    assert "I don't have an answer" in r["answer"]


def test_stemming_keyword_matches_porter():
    r = ask("explain porter stemming to me")
    assert r["matched_topic"] == "Stemming"


def test_known_topics_list_nonempty():
    r = ask("hi")
    assert len(r["known_topics"]) > 5
