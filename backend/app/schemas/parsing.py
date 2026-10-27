from pydantic import BaseModel, Field


class CYKRequest(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=200, description="Sentence to parse with the default CNF grammar")


class CYKCellOut(BaseModel):
    row: int
    col: int
    nonterminals: list[str]
    # One rule string per entry in `nonterminals`, same order — e.g.
    # "NP -> Det N" or "Det -> 'the'". Lets the frontend show "the grammar
    # rule being applied" for a cell (Parsing Lab redesign) without the
    # frontend having to re-derive it from backpointers it doesn't have.
    rules: list[str] = []


class ParseTreeNode(BaseModel):
    symbol: str
    word: str | None = None
    children: list["ParseTreeNode"] = []
    # The production that derived this node — "S -> NP VP" for an internal
    # node, "Det -> 'the'" for a leaf. None only for a node that somehow
    # has no backpointer (shouldn't happen for an accepted parse).
    rule: str | None = None


ParseTreeNode.model_rebuild()


class CYKResponse(BaseModel):
    tokens: list[str]
    accepted: bool
    table: list[CYKCellOut]
    tree: ParseTreeNode | None = None
    grammar_summary: dict[str, list[str]]
    unknown_words: list[str]


class DerivationStepOut(BaseModel):
    step: int
    symbol: str
    rule: str
    position: int
    span: int


class TopDownResponse(BaseModel):
    tokens: list[str]
    accepted: bool
    # Root-first order (Start Symbol -> ... -> tokens) — the mirror image
    # of CYKResponse.table's leaves-first span order. See
    # app.algorithms.top_down_parse for how these are derived.
    steps: list[DerivationStepOut]
    tree: ParseTreeNode | None = None
    grammar_summary: dict[str, list[str]]
    unknown_words: list[str]
    start_symbol: str
