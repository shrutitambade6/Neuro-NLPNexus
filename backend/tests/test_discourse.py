from app.algorithms.discourse import extract_noun_phrases, resolve_pronoun

SENTENCE = "John gave Ravi the book because he needed it."


def test_extract_noun_phrases_finds_proper_nouns():
    phrases = extract_noun_phrases(SENTENCE)
    texts = [p.text for p in phrases]
    assert "John" in texts
    assert "Ravi" in texts


def test_extract_noun_phrases_finds_common_np():
    phrases = extract_noun_phrases(SENTENCE)
    assert any(p.text == "the book" for p in phrases)


def test_resolve_he_prefers_a_person_over_a_thing():
    result = resolve_pronoun(SENTENCE, "he")
    assert result["available"] is True
    book_candidate = next(c for c in result["candidates"] if c["text"] == "the book")
    assert book_candidate["agrees_with_pronoun"] is False
    assert result["resolved_antecedent"] in ("Ravi", "John")


def test_resolve_it_prefers_the_book_over_people():
    result = resolve_pronoun(SENTENCE, "it")
    assert result["resolved_antecedent"] == "the book"
    ravi_candidate = next(c for c in result["candidates"] if c["text"] == "Ravi")
    assert ravi_candidate["agrees_with_pronoun"] is False
    assert "person" in ravi_candidate["reason"] or "thing" in ravi_candidate["reason"]


def test_resolve_candidates_ordered_nearest_first():
    result = resolve_pronoun(SENTENCE, "he")
    distances = [c["word_distance"] for c in result["candidates"]]
    assert distances == sorted(distances)


def test_resolve_unknown_pronoun_is_honest():
    result = resolve_pronoun(SENTENCE, "xyz")
    assert result["available"] is False
    assert result["candidates"] == []


def test_resolve_pronoun_not_in_sentence_is_honest():
    result = resolve_pronoun("The cat sat on the mat.", "he")
    assert result["available"] is False
    assert "does not appear" in result["message"]


def test_resolve_she_rejects_neuter_thing():
    result = resolve_pronoun("Riya bought a laptop because she needed it for college.", "she")
    laptop_candidate = next((c for c in result["candidates"] if "laptop" in c["text"]), None)
    assert laptop_candidate is not None
    assert laptop_candidate["agrees_with_pronoun"] is False


def test_resolve_they_accepts_plural_common_noun():
    result = resolve_pronoun("The students finished the exam because they studied hard.", "they")
    assert result["available"] is True
    students_candidate = next(c for c in result["candidates"] if "students" in c["text"])
    assert students_candidate["agrees_with_pronoun"] is True
