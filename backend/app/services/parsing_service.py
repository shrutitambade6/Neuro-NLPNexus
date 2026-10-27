import re

from app.algorithms.cyk import DEFAULT_GRAMMAR, Grammar, build_parse_tree, run_cyk
from app.algorithms.top_down_parse import parse_top_down
from app.schemas.parsing import (
    CYKCellOut,
    CYKResponse,
    DerivationStepOut,
    ParseTreeNode,
    TopDownResponse,
)


def normalize_sentence(sentence: str) -> list[str]:
    """Lowercases and strips trailing punctuation per token so grammar
    lookups match cleanly. This is intentionally simple — the same
    from-scratch tokenization philosophy as the Preprocessing Lab."""
    cleaned = re.sub(r"[.!?]+$", "", sentence.strip())
    return [w.lower() for w in cleaned.split()]


def _unknown_words(tokens: list[str], grammar: Grammar) -> list[str]:
    known_words = {w for terminals in grammar.terminal_rules.values() for w in terminals}
    return [t for t in tokens if t not in known_words]


def _grammar_summary(grammar: Grammar) -> dict[str, list[str]]:
    return {
        **{f"{nt} ->": [f"{a} {b}" for a, b in prods] for nt, prods in grammar.binary_rules.items()},
        **{f"{nt} ->": terms for nt, terms in grammar.terminal_rules.items()},
    }


def parse_with_cyk(sentence: str) -> CYKResponse:
    tokens = normalize_sentence(sentence)
    grammar = DEFAULT_GRAMMAR
    unknown_words = _unknown_words(tokens, grammar)

    # If there are unknown words, CYK still runs (it will simply fail to
    # populate cells for those positions) — we report both, honestly,
    # rather than silently failing.
    result = run_cyk(tokens, grammar)

    table_out = []
    for span, cols in result.table.items():
        for col, cell in cols.items():
            nts = sorted(cell.nonterminals)
            rules = []
            for nt in nts:
                bp = cell.backpointers[nt][0]
                if bp["type"] == "terminal":
                    rules.append(f"{nt} -> '{bp['word']}'")
                else:
                    rules.append(f"{nt} -> {bp['left_symbol']} {bp['right_symbol']}")
            table_out.append(CYKCellOut(row=span, col=col, nonterminals=nts, rules=rules))

    tree_dict = build_parse_tree(result) if result.accepted else None
    tree_out = ParseTreeNode(**tree_dict) if tree_dict else None

    return CYKResponse(
        tokens=tokens,
        accepted=result.accepted,
        table=table_out,
        tree=tree_out,
        grammar_summary=_grammar_summary(grammar),
        unknown_words=unknown_words,
    )


def parse_with_top_down(sentence: str) -> TopDownResponse:
    tokens = normalize_sentence(sentence)
    grammar = DEFAULT_GRAMMAR
    unknown_words = _unknown_words(tokens, grammar)

    result = parse_top_down(tokens, grammar)

    tree_out = ParseTreeNode(**result.tree) if result.tree else None
    steps_out = [
        DerivationStepOut(step=s.step, symbol=s.symbol, rule=s.rule, position=s.position, span=s.span)
        for s in result.steps
    ]

    return TopDownResponse(
        tokens=tokens,
        accepted=result.accepted,
        steps=steps_out,
        tree=tree_out,
        grammar_summary=_grammar_summary(grammar),
        unknown_words=unknown_words,
        start_symbol=grammar.start_symbol,
    )
