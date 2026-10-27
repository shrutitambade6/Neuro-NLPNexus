from app.algorithms.cyk import DEFAULT_GRAMMAR
from app.algorithms.top_down_parse import parse_top_down


def test_top_down_accepts_valid_svo_sentence():
    tokens = ["the", "students", "watch", "the", "movie"]
    result = parse_top_down(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is True
    assert result.tree is not None
    assert result.tree["symbol"] == "S"


def test_top_down_rejects_invalid_sentence():
    tokens = ["watch", "the", "the", "movie"]
    result = parse_top_down(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is False
    assert result.tree is None


def test_top_down_rejects_sentence_with_unknown_word():
    tokens = ["the", "students", "watch", "the", "spaceship"]
    result = parse_top_down(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is False


def test_top_down_handles_empty_token_list():
    result = parse_top_down([], DEFAULT_GRAMMAR)
    assert result.accepted is False
    assert result.steps == []


def test_top_down_steps_are_root_first_derivation_order():
    tokens = ["the", "students", "watch", "the", "movie"]
    result = parse_top_down(tokens, DEFAULT_GRAMMAR)
    # Root-first: S is expanded before its children NP/VP, mirroring real
    # top-down derivation (the opposite order of CYK's leaves-first table).
    assert result.steps[0].symbol == "S"
    assert result.steps[0].rule == "S -> NP VP"
    # Every step after the first NP/VP split belongs to a subtree that was
    # fully expanded before the next sibling subtree starts (depth-first).
    assert {s.symbol for s in result.steps[1:3]} <= {"NP", "Det", "N"}


def test_top_down_tree_matches_cyk_tree_structure_for_unambiguous_grammar():
    """Cross-validation: for this small unambiguous grammar, the two very
    different algorithms must agree on the actual parse structure — if they
    ever disagree, one of them has a real bug, not just a style
    difference."""
    from app.algorithms.cyk import build_parse_tree, run_cyk

    tokens = ["a", "dog", "sees", "the", "cat"]
    cyk_result = run_cyk(tokens, DEFAULT_GRAMMAR)
    cyk_tree = build_parse_tree(cyk_result)
    td_result = parse_top_down(tokens, DEFAULT_GRAMMAR)

    def strip_rule(node):
        return {
            "symbol": node["symbol"],
            "word": node["word"],
            "children": [strip_rule(c) for c in node["children"]],
        }

    assert strip_rule(cyk_tree) == strip_rule(td_result.tree)
