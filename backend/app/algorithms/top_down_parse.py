"""
Top-down (leftmost-derivation) parser, implemented from scratch, over the
exact same Grammar shape as app.algorithms.cyk — same rules, same start
symbol, same input sentence — so the two algorithms are a technically fair
side-by-side comparison, not two different grammars dressed up to look
comparable.

Where CYK (bottom-up) starts from the tokens and combines them upward into
larger constituents, this starts from the start symbol and recursively
expands it leftmost-first, matching each terminal-producing nonterminal
against the next unconsumed token. It genuinely backtracks (tries the next
production for a nonterminal if the current one fails further down), which
matters for a bigger grammar even though this project's small educational
grammar happens to have exactly one production per nonterminal today.

Zero FastAPI/Pydantic dependency, same as cyk.py, so it's unit-testable and
reusable on its own.
"""
from dataclasses import dataclass, field

from app.algorithms.cyk import Grammar


@dataclass
class DerivationStep:
    step: int
    symbol: str  # the nonterminal being expanded, or matched terminal category
    rule: str  # e.g. "S -> NP VP" or "Det -> 'the'"
    position: int  # token index where this symbol's span starts
    span: int  # how many tokens this symbol's subtree covers


@dataclass
class TopDownResult:
    tokens: list[str]
    accepted: bool
    steps: list[DerivationStep]
    tree: dict | None
    grammar: Grammar


def _expand(symbol: str, start: int, grammar: Grammar, tokens: list[str]) -> tuple[dict | None, int | None, list[dict]]:
    """Tries to derive `symbol` starting at token index `start`. Returns
    (tree_node, tokens_consumed, steps) on success, or (None, None, []) if
    every production for this symbol fails here — the caller backtracks by
    trying its own next production, or fails upward in turn."""
    n = len(tokens)

    if symbol in grammar.terminal_rules:
        if start >= n:
            return None, None, []
        word = tokens[start]
        if word in grammar.terminal_rules[symbol]:
            rule = f"{symbol} -> '{word}'"
            step = {"symbol": symbol, "rule": rule, "position": start, "span": 1}
            return {"symbol": symbol, "word": word, "children": [], "rule": rule}, 1, [step]
        return None, None, []

    if symbol in grammar.binary_rules:
        for left_sym, right_sym in grammar.binary_rules[symbol]:
            left_node, left_len, left_steps = _expand(left_sym, start, grammar, tokens)
            if left_node is None:
                continue
            right_node, right_len, right_steps = _expand(right_sym, start + left_len, grammar, tokens)
            if right_node is None:
                continue
            span = left_len + right_len
            rule = f"{symbol} -> {left_sym} {right_sym}"
            step = {"symbol": symbol, "rule": rule, "position": start, "span": span}
            # Derivation order is root-first: this symbol's own expansion is
            # recorded before its children's, matching real top-down
            # parsing (Start Symbol -> ... -> tokens), the mirror image of
            # CYK's leaves-first order.
            steps = [step] + left_steps + right_steps
            node = {"symbol": symbol, "word": None, "children": [left_node, right_node], "rule": rule}
            return node, span, steps
        return None, None, []

    # Symbol isn't in this grammar at all (shouldn't happen with a
    # well-formed Grammar, but fail honestly rather than crash).
    return None, None, []


def parse_top_down(tokens: list[str], grammar: Grammar) -> TopDownResult:
    node, consumed, steps = _expand(grammar.start_symbol, 0, grammar, tokens)
    accepted = node is not None and consumed == len(tokens)
    numbered = [DerivationStep(step=i + 1, **s) for i, s in enumerate(steps)]
    return TopDownResult(tokens=tokens, accepted=accepted, steps=numbered, tree=(node if accepted else None), grammar=grammar)
