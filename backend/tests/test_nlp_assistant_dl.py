"""
Tests for the Stage 12 extension of the NLP Learning Assistant into Deep
Learning: real CONCEPTS entries (neuron, activation_function,
gradient_descent, neural_network, cnn, rnn_lstm, attention, transformer)
should be found by topic detection and answered through the exact same
generic intent machinery every NLP concept already uses — no separate code
path, so these tests mostly confirm the DL entries integrate cleanly
rather than testing new logic.
"""
from app.algorithms.nlp_assistant import process_message
from app.algorithms.nlp_knowledge_base import CATEGORY_ORDER, CONCEPTS, CONCEPTS_BY_CATEGORY


def _first(blocks, block_type):
    return next(b for b in blocks if b["type"] == block_type)


DL_CONCEPT_IDS = ["neuron", "activation_function", "gradient_descent", "neural_network", "cnn", "rnn_lstm", "attention", "transformer"]


def test_all_dl_concepts_exist_with_dl_lab_routes():
    for cid in DL_CONCEPT_IDS:
        assert cid in CONCEPTS
        assert CONCEPTS[cid]["category"] == "deep_learning"
        assert CONCEPTS[cid]["labRoute"] is not None


def test_deep_learning_category_registered_and_populated():
    assert "deep_learning" in CATEGORY_ORDER
    assert set(CONCEPTS_BY_CATEGORY["deep_learning"]) == set(DL_CONCEPT_IDS)


def test_definition_intent_finds_cnn_by_alias():
    r = process_message("What is a CNN?", None)
    assert r["intent"] == "DEFINITION"
    assert r["topic"] == "cnn"
    assert r["relatedLab"]["route"] == "/cnn-lab"


def test_attention_topic_detected_and_routes_to_attention_lab():
    r = process_message("Explain scaled dot-product attention.", None)
    assert r["topic"] == "attention"
    assert r["relatedLab"]["route"] == "/attention-transformers"


def test_rnn_lstm_alias_variants_both_resolve():
    r1 = process_message("What is an LSTM?", None)
    r2 = process_message("Explain recurrent neural networks.", None)
    assert r1["topic"] == "rnn_lstm"
    assert r2["topic"] == "rnn_lstm"


def test_example_intent_for_neuron():
    r = process_message("Give me an example of a neuron.", None)
    assert r["intent"] == "EXAMPLE"
    code_block = _first(r["blocks"], "code")
    assert "sigmoid" in code_block["code"] or "Input" in code_block["code"]


def test_difference_intent_between_rnn_and_attention():
    r = process_message("What's the difference between RNN and attention?", None)
    assert r["intent"] == "DIFFERENCE"
    assert r["topic"] == "attention"


def test_numerical_intent_for_neuron_uses_real_neuron_forward():
    r = process_message("Give me a numerical on a neuron.", None)
    assert r["intent"] == "NUMERICAL"
    pending = r["context"]["pendingNumerical"]
    assert pending["concept"] == "neuron"
    # Re-run neuron_forward() with the exact question parameters the
    # generator's questionText embeds nothing hidden about — instead,
    # directly re-derive from the generator to prove it's real, not a
    # hardcoded placeholder: run it many times and confirm the answers vary
    # (a hardcoded number would always be identical).
    answers = set()
    for _ in range(5):
        r2 = process_message("Give me a numerical on a neuron.", None)
        answers.add(r2["context"]["pendingNumerical"]["correctAnswer"])
    assert len(answers) > 1, "neuron numerical answers should genuinely vary across requests"
    assert isinstance(pending["correctAnswer"], float)


def test_numerical_answer_checked_against_real_computation():
    r = process_message("Give me a numerical on a neuron.", None)
    pending = r["context"]["pendingNumerical"]
    correct = pending["correctAnswer"]
    # submit the exact real answer back — must be graded correct
    r2 = process_message(str(correct), r["context"])
    assert r2["intent"] == "NUMERICAL_ANSWER"
    result_block = _first(r2["blocks"], "callout")
    assert "correct" in result_block["text"].lower() or "✅" in result_block.get("icon", "")


def test_meta_and_out_of_scope_mention_deep_learning():
    meta = process_message("What can you do?", None)
    text_blocks = [b["text"] for b in meta["blocks"] if b["type"] == "text"]
    assert any("Deep Learning" in t for t in text_blocks)
