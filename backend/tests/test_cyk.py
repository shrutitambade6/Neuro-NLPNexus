from app.algorithms.cyk import DEFAULT_GRAMMAR, build_parse_tree, run_cyk


def test_cyk_accepts_valid_svo_sentence():
    tokens = ["the", "students", "watch", "the", "movie"]
    result = run_cyk(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is True


def test_cyk_rejects_invalid_sentence():
    tokens = ["watch", "the", "the", "movie"]
    result = run_cyk(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is False


def test_cyk_rejects_sentence_with_unknown_word():
    tokens = ["the", "students", "watch", "the", "spaceship"]
    result = run_cyk(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is False


def test_cyk_handles_empty_token_list():
    result = run_cyk([], DEFAULT_GRAMMAR)
    assert result.accepted is False
    assert result.table == {}


def test_cyk_handles_single_word():
    result = run_cyk(["students"], DEFAULT_GRAMMAR)
    assert result.accepted is False  # a bare noun is not a full sentence in this grammar
    assert "N" in result.table[1][0].nonterminals


def test_cyk_table_has_correct_span_structure():
    tokens = ["the", "dog", "sees", "a", "cat"]
    result = run_cyk(tokens, DEFAULT_GRAMMAR)
    assert set(result.table.keys()) == {1, 2, 3, 4, 5}
    assert len(result.table[1]) == 5  # 5 single-word cells
    assert len(result.table[5]) == 1  # 1 full-span cell


def test_build_parse_tree_reconstructs_valid_tree():
    tokens = ["the", "students", "watch", "the", "movie"]
    result = run_cyk(tokens, DEFAULT_GRAMMAR)
    tree = build_parse_tree(result)
    assert tree is not None
    assert tree["symbol"] == "S"
    assert len(tree["children"]) == 2
    assert tree["children"][0]["symbol"] == "NP"
    assert tree["children"][1]["symbol"] == "VP"


def test_build_parse_tree_returns_none_for_rejected_sentence():
    tokens = ["movie", "the", "watch"]
    result = run_cyk(tokens, DEFAULT_GRAMMAR)
    assert result.accepted is False
    tree = build_parse_tree(result)
    assert tree is None
