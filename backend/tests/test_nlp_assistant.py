from app.algorithms.nlp_assistant import process_message
from app.algorithms.nlp_knowledge_base import CONCEPTS


def _first(blocks, block_type):
    return next(b for b in blocks if b["type"] == block_type)


def test_definition_intent():
    r = process_message("What is tokenization?", None)
    assert r["intent"] == "DEFINITION"
    assert r["topic"] == "tokenization"
    assert r["relatedLab"]["route"] == "/preprocessing"


def test_example_intent_gives_real_example_not_definition():
    r = process_message("Give me one example related to tokenization.", None)
    assert r["intent"] == "EXAMPLE"
    code_block = _first(r["blocks"], "code")
    assert "Input" in code_block["code"] and "Output" in code_block["code"]


def test_repeated_example_requests_rotate_through_different_examples():
    ctx = None
    seen = set()
    for _ in range(3):
        r = process_message("Give me an example of tokenization.", ctx)
        ctx = r["context"]
        code_block = _first(r["blocks"], "code")
        seen.add(code_block["code"])
    assert len(seen) > 1, "repeated example requests should not always return the identical example"


def test_multiple_examples_intent_returns_requested_count():
    r = process_message("Give me 3 examples of tokenization.", None)
    assert r["intent"] == "MULTIPLE_EXAMPLES"
    code_block = _first(r["blocks"], "code")
    assert code_block["code"].count("→") == 3


def test_why_intent_is_distinct_from_definition():
    r = process_message("Why do we use tokenization?", None)
    assert r["intent"] == "WHY"


def test_real_world_use_intent():
    r = process_message("Where is tokenization used in real life?", None)
    assert r["intent"] == "REAL_WORLD_USE"
    bullets = _first(r["blocks"], "bullets")
    assert len(bullets["items"]) >= 3


def test_code_intent_returns_runnable_snippet():
    r = process_message("Give me Python code for tokenization.", None)
    assert r["intent"] == "CODE"
    code_block = _first(r["blocks"], "code")
    assert "def" in code_block["code"] or "=" in code_block["code"]


def test_difference_intent_returns_table_from_one_message():
    r = process_message("Explain stemming and lemmatization.", None)
    r2 = process_message("What is the difference between them?", r["context"])
    assert r2["intent"] == "DIFFERENCE"
    table = _first(r2["blocks"], "table")
    assert table["headers"] == ["Stemming", "Lemmatization"]


def test_numerical_intent_generates_real_checkable_answer():
    r = process_message("Give me a numerical on bigram probability.", None)
    assert r["intent"] == "NUMERICAL"
    pending = r["context"]["pendingNumerical"]
    correct = pending["correctAnswer"]
    r2 = process_message(str(correct), r["context"])
    assert r2["intent"] == "NUMERICAL_ANSWER"
    assert "Correct" in _first(r2["blocks"], "callout")["text"]


def test_numerical_wrong_answer_is_marked_incorrect():
    r = process_message("Give me a numerical on bigram probability.", None)
    wrong = r["context"]["pendingNumerical"]["correctAnswer"] + 5
    r2 = process_message(str(wrong), r["context"])
    assert "Not quite" in _first(r2["blocks"], "callout")["text"]


def test_pending_numerical_is_abandoned_for_a_genuinely_new_question():
    r = process_message("Give me a numerical on bigram probability.", None)
    r2 = process_message("Give me a difficult CYK question.", r["context"])
    assert r2["intent"] == "CHALLENGE"
    assert r2["topic"] == "cyk"
    assert r2["context"]["pendingNumerical"] is None


def test_challenge_intent_matches_words_between_difficult_and_question():
    r = process_message("Give me a difficult CYK question.", None)
    assert r["intent"] == "CHALLENGE"
    assert r["topic"] == "cyk"


def test_viva_intent_sets_pending_viva_and_can_be_graded():
    r = process_message("Ask me a viva question on semantics.", None)
    assert r["intent"] == "VIVA"
    assert r["context"]["pendingViva"] is not None
    r2 = process_message("Semantics is the study of meaning in language.", r["context"])
    assert r2["intent"] == "VIVA_ANSWER"


def test_simplify_sets_beginner_difficulty():
    r = process_message("Explain perplexity like a beginner.", None)
    assert r["intent"] == "SIMPLIFY"
    assert r["context"]["difficulty"] == "beginner"


def test_advanced_intent_includes_formula():
    r = process_message("Explain perplexity mathematically.", None)
    assert r["intent"] == "ADVANCED"
    formula_block = _first(r["blocks"], "formula")
    assert "PP(W)" in formula_block["formula"]


def test_domain_real_world_use_for_banking():
    r = process_message("How is NLP used in banking?", None)
    assert r["intent"] == "REAL_WORLD_USE"
    headings = [b["text"] for b in r["blocks"] if b["type"] == "heading"]
    assert any("Banking" in h for h in headings)


def test_how_does_nlp_help_search_engines_is_not_misrouted_to_meta():
    r = process_message("How does NLP help search engines?", None)
    assert r["intent"] != "META"


def test_meta_intent_for_self_referential_question():
    r = process_message("What are you?", None)
    assert r["intent"] == "META"


def test_ambiguous_intent_when_no_topic_and_no_context():
    r = process_message("Explain it.", None)
    assert r["intent"] == "AMBIGUOUS"


def test_out_of_scope_intent_does_not_hallucinate_nlp_content():
    r = process_message("Who is the Prime Minister?", None)
    assert r["intent"] == "OUT_OF_SCOPE"


def test_followup_example_uses_context_topic_without_restating_it():
    r = process_message("What is CYK parsing?", None)
    r2 = process_message("Give me an example.", r["context"])
    assert r2["topic"] == "cyk"


def test_make_it_harder_uses_context_topic():
    r = process_message("Give me a challenge on WSD.", None)
    r2 = process_message("Make it harder.", r["context"])
    assert r2["intent"] == "CHALLENGE"
    assert r2["topic"] == "wsd"


def test_every_concept_has_a_working_definition_response():
    for cid, entry in CONCEPTS.items():
        alias = sorted(entry["aliases"])[0]
        r = process_message(f"What is {alias}?", None)
        assert r["blocks"], f"{cid} produced no blocks"


def test_method_note_never_claims_to_be_an_llm():
    r = process_message("What is tokenization?", None)
    lowered = r["methodNote"].lower()
    assert "gpt" not in lowered and "language model" not in lowered.replace("not a language model", "")
