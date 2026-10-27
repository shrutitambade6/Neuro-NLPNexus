"""
CYK (Cocke-Younger-Kasami) parser, implemented from scratch.

The grammar must be in Chomsky Normal Form (CNF): every production is
either `A -> B C` (two nonterminals) or `A -> "word"` (one terminal).
This is a real constraint of the CYK algorithm, not a simplification we're
hiding — the frontend explains it via the `cnf` glossary entry.

This module has zero FastAPI/Pydantic dependency so it can be unit tested
and reused independently of the web layer.
"""
from dataclasses import dataclass, field


@dataclass
class Grammar:
    # nonterminal -> list of (left_symbol, right_symbol) binary productions
    binary_rules: dict[str, list[tuple[str, str]]]
    # nonterminal -> list of terminal strings it can rewrite to
    terminal_rules: dict[str, list[str]]
    start_symbol: str = "S"


@dataclass
class CYKCell:
    row: int  # span length (1-indexed): 1 = single word, 2 = two words, ...
    col: int  # starting position (0-indexed)
    nonterminals: set[str] = field(default_factory=set)
    # backpointers[nonterminal] = list of ways this nonterminal was derived here
    backpointers: dict[str, list[dict]] = field(default_factory=dict)


@dataclass
class CYKResult:
    tokens: list[str]
    accepted: bool
    # table[span_length][start_index] = CYKCell — span_length from 1..n
    table: dict[int, dict[int, CYKCell]]
    grammar: Grammar


def run_cyk(tokens: list[str], grammar: Grammar) -> CYKResult:
    n = len(tokens)
    table: dict[int, dict[int, CYKCell]] = {length: {} for length in range(1, n + 1)}

    # Base case: span length 1 — which nonterminals directly produce each word.
    for i, word in enumerate(tokens):
        cell = CYKCell(row=1, col=i)
        for nt, terminals in grammar.terminal_rules.items():
            if word in terminals:
                cell.nonterminals.add(nt)
                cell.backpointers.setdefault(nt, []).append({"type": "terminal", "word": word})
        table[1][i] = cell

    # Recursive case: build spans of increasing length from smaller spans.
    for span in range(2, n + 1):
        for start in range(0, n - span + 1):
            cell = CYKCell(row=span, col=start)
            # Try every split point of this span into a left part and right part.
            for split in range(1, span):
                left_span = split
                right_span = span - split
                left_cell = table[left_span][start]
                right_cell = table[right_span][start + left_span]

                for nt, productions in grammar.binary_rules.items():
                    for (left_sym, right_sym) in productions:
                        if left_sym in left_cell.nonterminals and right_sym in right_cell.nonterminals:
                            cell.nonterminals.add(nt)
                            cell.backpointers.setdefault(nt, []).append({
                                "type": "binary",
                                "left_symbol": left_sym,
                                "right_symbol": right_sym,
                                "split": split,
                                "left_span": left_span,
                                "left_start": start,
                                "right_span": right_span,
                                "right_start": start + left_span,
                            })
            table[span][start] = cell

    accepted = n > 0 and grammar.start_symbol in table[n][0].nonterminals
    return CYKResult(tokens=tokens, accepted=accepted, table=table, grammar=grammar)


def build_parse_tree(result: CYKResult, symbol: str | None = None, span: int | None = None, start: int = 0) -> dict | None:
    """Reconstructs one valid parse tree (the first one found) from the CYK
    backpointers, for display as an actual constituency tree — not a
    fabricated one."""
    if symbol is None:
        symbol = result.grammar.start_symbol
    if span is None:
        span = len(result.tokens)

    if span == 0 or start not in result.table.get(span, {}):
        return None

    cell = result.table[span][start]
    if symbol not in cell.backpointers:
        return None

    bp = cell.backpointers[symbol][0]  # first valid derivation
    if bp["type"] == "terminal":
        rule = f"{symbol} -> '{bp['word']}'"
        return {"symbol": symbol, "word": bp["word"], "children": [], "rule": rule}

    left_tree = build_parse_tree(result, bp["left_symbol"], bp["left_span"], bp["left_start"])
    right_tree = build_parse_tree(result, bp["right_symbol"], bp["right_span"], bp["right_start"])
    rule = f"{symbol} -> {bp['left_symbol']} {bp['right_symbol']}"
    return {"symbol": symbol, "word": None, "children": [left_tree, right_tree], "rule": rule}


# A small default educational grammar in CNF, covering simple SVO sentences
# like "the students watch the movie" / "a dog sees the cat".
DEFAULT_GRAMMAR = Grammar(
    binary_rules={
        "S": [("NP", "VP")],
        "NP": [("Det", "N")],
        "VP": [("V", "NP")],
    },
    terminal_rules={
        "Det": ["the", "a", "an"],
        "N": ["students", "movie", "dog", "cat", "book", "teacher"],
        "V": ["watch", "sees", "reads", "likes"],
    },
    start_symbol="S",
)
