"""
NLP Learning Assistant engine.

This is explicitly NOT a language model. It is a rule-based pipeline:

    message -> intent detection -> topic resolution (using context for
    follow-ups) -> a per-intent response generator that reads real structured
    content out of nlp_knowledge_base.CONCEPTS (or computes a real numerical
    answer on the fly) -> a list of structured render blocks the frontend
    turns into headings/bullets/code/tables/formulas.

Conversation "memory" (current topic, difficulty level, which examples have
already been shown, a pending numerical/viva question awaiting the student's
answer) is carried statelessly: the frontend holds the AssistantContext dict
and sends it back on every request, exactly like this project's other
services. Nothing here is fabricated — every definition/example/formula
traces back to nlp_knowledge_base.py, and every numerical answer is computed
for real at request time, never hardcoded.
"""
import math
import random
import re

from app.algorithms.chatbot import KNOWLEDGE_BASE as LEGACY_KB  # noqa: F401  (kept for reference/back-compat)
from app.algorithms.dl_foundations import neuron_forward
from app.algorithms.nlp_knowledge_base import ALIAS_INDEX, CONCEPTS

INTENTS = [
    "DEFINITION", "EXAMPLE", "MULTIPLE_EXAMPLES", "WHY", "HOW", "DIFFERENCE",
    "REAL_WORLD_USE", "CODE", "NUMERICAL", "NUMERICAL_ANSWER", "CHALLENGE",
    "VIVA", "VIVA_ANSWER", "SIMPLIFY", "ADVANCED", "META", "AMBIGUOUS",
    "OUT_OF_SCOPE",
]

QUICK_TOPIC_OPTIONS = ["tokenization", "ngram", "parsing", "semantics", "wsd", "discourse", "neuron", "attention"]

DOMAIN_KB: dict[str, dict] = {
    "banking": {
        "label": "Banking",
        "items": [
            "Chatbots for customer queries and account questions",
            "Fraud-related text analysis — flagging suspicious transaction descriptions or messages",
            "Automated customer-support ticket routing",
            "Document processing (KYC forms, statements, loan applications)",
            "Search over policy and help-center documents",
            "Email classification (spam / priority / complaint routing)",
        ],
    },
    "healthcare": {
        "label": "Healthcare",
        "items": [
            "Summarizing clinical notes",
            "Extracting symptoms/medications from doctors' notes (NER)",
            "Rule-based patient chatbots for triage/FAQs — not diagnostic decision-making",
            "Search and retrieval over medical literature",
            "Sentiment analysis of patient feedback surveys",
        ],
    },
    "netflix": {
        "label": "Netflix (language-related applications)",
        "items": [
            "Search over titles and descriptions",
            "Content metadata tagging",
            "Query understanding for search",
            "Subtitle/caption generation and alignment",
            "Conversational interfaces for recommendations/support",
        ],
    },
    "google": {
        "label": "Google Search",
        "items": [
            "Query normalization and tokenization",
            "Query understanding (what the searcher actually wants)",
            "Semantic understanding of query and page content",
            "Retrieval of candidate matching documents",
            "Ranking results by relevance",
        ],
        "pipeline": ["User Query", "Tokenization / normalization", "Query understanding",
                     "Semantic understanding", "Retrieval", "Ranking", "Results"],
    },
    "search engines": {  # alias of google's pipeline, generic
        "label": "Search Engines",
        "items": [
            "Tokenization and normalization of the query",
            "Query understanding",
            "Semantic understanding",
            "Retrieval of candidate documents (often via TF-IDF/vector-space ranking, as in this project's IR demo)",
            "Ranking by relevance",
        ],
        "pipeline": ["User Query", "Tokenization / normalization", "Query understanding",
                     "Semantic understanding", "Retrieval", "Ranking", "Results"],
    },
}

STATIC_COMPARISONS: dict[frozenset, dict] = {
    frozenset({"stemming", "lemmatization"}): {
        "headers": ["Stemming", "Lemmatization"],
        "rows": [
            ["Cuts words heuristically (suffix-stripping rules)", "Uses linguistic/vocabulary knowledge"],
            ["Faster, simpler to compute", "Usually more computationally expensive"],
            ["May produce non-words (e.g. \"studi\")", "Usually produces valid dictionary words"],
            ["Rule-based on the surface string only", "Needs a lexicon and often part-of-speech context"],
        ],
    },
    frozenset({"cyk", "earley_parser"}): {
        "headers": ["CYK", "Earley Parser"],
        "rows": [
            ["Requires the grammar in Chomsky Normal Form", "Works on any context-free grammar directly"],
            ["O(n³·|G|) dynamic-programming chart", "O(n³) worst case via predict/scan/complete"],
            ["Simpler to implement and reason about", "More general, handles arbitrary rule shapes"],
        ],
    },
    frozenset({"tfidf", "cosine_similarity"}): {
        "headers": ["TF-IDF", "Cosine Similarity"],
        "rows": [
            ["A weighting scheme for how important a term is to a document", "A measure of how similar two vectors are"],
            ["Used to build a document's feature vector", "Used to compare two vectors (often built with TF-IDF)"],
            ["Output: a weight per term", "Output: a single similarity score between 0 and 1"],
        ],
    },
}


# --------------------------------------------------------------------------- helpers

def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _find_topics(normalized: str) -> list[str]:
    """Return concept ids whose alias appears in the message, ordered by where each
    concept's earliest-matching alias first appears in the text — so "stemming and
    lemmatization" reliably yields ["stemming", "lemmatization"], not an order that
    depends on Python's (unordered) set iteration."""
    positions: dict[str, int] = {}
    for alias in sorted(ALIAS_INDEX, key=len, reverse=True):
        idx = normalized.find(alias)
        if idx == -1:
            continue
        cid = ALIAS_INDEX[alias]
        if cid not in positions or idx < positions[cid]:
            positions[cid] = idx
    return [cid for cid, _ in sorted(positions.items(), key=lambda kv: kv[1])]


def _find_domain(normalized: str) -> str | None:
    for key in DOMAIN_KB:
        if key in normalized:
            return key
    return None


_NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
                 "several": 3, "multiple": 3, "few": 3, "couple": 2}


def _extract_count(normalized: str, default: int = 1) -> int:
    m = re.search(r"\b(\d+)\s+examples?\b", normalized)
    if m:
        return max(1, min(int(m.group(1)), 8))
    for word, n in _NUMBER_WORDS.items():
        if re.search(rf"\b{word}\b\s+examples?", normalized):
            return n
    return default


def _extract_number(text: str) -> float | None:
    m = re.search(r"-?\d+(\.\d+)?", text)
    return float(m.group(0)) if m else None


def _default_context() -> dict:
    return {
        "currentTopic": None, "previousTopic": None, "difficulty": "intermediate",
        "exampleIndex": {}, "numericalIndex": {}, "challengeIndex": {}, "vivaIndex": {},
        "lastIntent": None, "pendingNumerical": None, "pendingViva": None,
    }


def _block_heading(text: str) -> dict:
    return {"type": "heading", "text": text}


def _block_text(text: str) -> dict:
    return {"type": "text", "text": text}


def _block_bullets(items: list[str]) -> dict:
    return {"type": "bullets", "items": items}


def _block_code(code: str, language: str = "python") -> dict:
    return {"type": "code", "language": language, "code": code}


def _block_table(headers: list[str], rows: list[list[str]]) -> dict:
    return {"type": "table", "headers": headers, "rows": rows}


def _block_formula(formula: str, explanation: str | None) -> dict:
    return {"type": "formula", "formula": formula, "explanation": explanation}


def _block_callout(icon: str, text: str) -> dict:
    return {"type": "callout", "icon": icon, "text": text}


def _related_lab(entry: dict) -> dict | None:
    if entry.get("labRoute"):
        return {"name": entry["name"], "route": entry["labRoute"]}
    return None


def _suggested_questions_for(cid: str | None) -> list[str]:
    if cid is None:
        return ["What is tokenization?", "Explain CYK parsing", "Compare stemming and lemmatization",
                "How is NLP used in banking?"]
    entry = CONCEPTS[cid]
    name = entry["name"]
    qs = [f"Give me an example of {name}", f"Why do we use {name}?", f"Where is {name} used in real life?"]
    if entry["formula"]:
        qs.append(f"Explain {name} mathematically")
    if entry["codeExample"]:
        qs.append(f"Give me Python code for {name}")
    related = entry["relatedConcepts"]
    if related:
        qs.append(f"Difference between {name} and {CONCEPTS[related[0]]['name']}")
    return qs[:4]


# --------------------------------------------------------------------------- numerical generators

def _levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    return dp[m][n]


def _numerical_bigram(rng: random.Random) -> dict:
    count_context = rng.randint(8, 20)
    count_pair = rng.randint(1, count_context - 1)
    context_word, next_word = rng.choice([("the", "dog"), ("a", "cat"), ("is", "running"), ("very", "happy")])
    answer = round(count_pair / count_context, 4)
    return {
        "questionText": f'Given the counts below from a training corpus, compute the bigram probability P("{next_word}" | "{context_word}").',
        "given": [f'Count("{context_word} {next_word}") = {count_pair}', f'Count("{context_word}") = {count_context}'],
        "correctAnswer": answer, "tolerance": 0.001,
        "explanation": f'P("{next_word}"|"{context_word}") = Count("{context_word} {next_word}") / Count("{context_word}") '
                        f"= {count_pair} / {count_context} = {answer}",
    }


def _numerical_laplace(rng: random.Random) -> dict:
    vocab = rng.choice([500, 1000, 2000])
    count_context = rng.randint(8, 20)
    count_pair = rng.randint(0, 4)
    context_word, next_word = rng.choice([("the", "fox"), ("a", "bird"), ("very", "quiet")])
    answer = round((count_pair + 1) / (count_context + vocab), 6)
    return {
        "questionText": f'Using Laplace (add-one) smoothing with vocabulary size V={vocab}, compute the smoothed '
                         f'probability P("{next_word}" | "{context_word}").',
        "given": [f'Count("{context_word} {next_word}") = {count_pair}', f'Count("{context_word}") = {count_context}', f"V = {vocab}"],
        "correctAnswer": answer, "tolerance": max(answer * 0.05, 1e-6),
        "explanation": f'P_Laplace = (Count+1)/(Count(context)+V) = ({count_pair}+1)/({count_context}+{vocab}) = {answer}',
    }


def _numerical_perplexity(rng: random.Random) -> dict:
    n = rng.randint(4, 8)
    prob = round(rng.uniform(0.0005, 0.02), 5)
    answer = round(prob ** (-1 / n), 3)
    return {
        "questionText": f"A language model assigns probability P(W) = {prob} to a {n}-word sentence W. Compute its perplexity.",
        "given": [f"P(W) = {prob}", f"n = {n}"],
        "correctAnswer": answer, "tolerance": max(answer * 0.02, 0.01),
        "explanation": f"PP(W) = P(W)^(-1/n) = {prob}^(-1/{n}) ≈ {answer}",
    }


def _numerical_edit_distance(rng: random.Random) -> dict:
    a, b = rng.choice([("kitten", "sitting"), ("flaw", "lawn"), ("gift", "gist"),
                        ("intention", "execution"), ("horse", "ros")])
    answer = _levenshtein(a, b)
    return {
        "questionText": f'Compute the edit (Levenshtein) distance between "{a}" and "{b}".',
        "given": [f'string 1 = "{a}"', f'string 2 = "{b}"'],
        "correctAnswer": float(answer), "tolerance": 0.001,
        "explanation": f'The minimum-edit DP table between "{a}" and "{b}" bottoms out at {answer} — '
                        f"try filling the table yourself in the Text Processing lab to see every step.",
    }


def _numerical_tfidf(rng: random.Random) -> dict:
    tf_count = rng.randint(1, 6)
    doc_len = rng.randint(tf_count + 10, tf_count + 100)
    n_docs = rng.randint(5, 20)
    df = rng.randint(1, n_docs)
    tf = tf_count / doc_len
    idf = math.log(n_docs / df)
    answer = round(tf * idf, 5)
    return {
        "questionText": "Compute the TF-IDF score for a term given the statistics below.",
        "given": [f"term count in document = {tf_count}", f"document length = {doc_len} words",
                  f"documents containing the term (DF) = {df}", f"total documents (N) = {n_docs}"],
        "correctAnswer": answer, "tolerance": max(abs(answer) * 0.02, 1e-5),
        "explanation": f"TF = {tf_count}/{doc_len} = {round(tf, 5)}; IDF = ln({n_docs}/{df}) = {round(idf, 5)}; "
                        f"TF-IDF = TF × IDF = {answer}",
    }


def _numerical_jaccard(rng: random.Random) -> dict:
    pool = ["nlp", "is", "fun", "hard", "cool", "language", "text", "data"]
    a = set(rng.sample(pool, 3))
    b = set(rng.sample(pool, 3))
    inter, union = len(a & b), len(a | b)
    answer = round(inter / union, 4) if union else 0.0
    return {
        "questionText": f"Compute the Jaccard similarity between sets A={sorted(a)} and B={sorted(b)}.",
        "given": [f"A = {sorted(a)}", f"B = {sorted(b)}"],
        "correctAnswer": answer, "tolerance": 0.001,
        "explanation": f"|A∩B| = {inter}, |A∪B| = {union}, J(A,B) = {inter}/{union} = {answer}",
    }


def _numerical_cosine(rng: random.Random) -> dict:
    a = [rng.randint(0, 2) for _ in range(3)]
    b = [rng.randint(0, 2) for _ in range(3)]
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1e-9
    norm_b = math.sqrt(sum(y * y for y in b)) or 1e-9
    answer = round(dot / (norm_a * norm_b), 4) if dot else 0.0
    return {
        "questionText": f"Compute the cosine similarity between vectors A={a} and B={b}.",
        "given": [f"A = {a}", f"B = {b}"],
        "correctAnswer": answer, "tolerance": 0.001,
        "explanation": f"A·B = {dot}; ‖A‖ = {round(norm_a,4)}, ‖B‖ = {round(norm_b,4)}; "
                        f"cos(θ) = {dot}/({round(norm_a,4)}×{round(norm_b,4)}) = {answer}",
    }


def _numerical_neuron(rng: random.Random) -> dict:
    """Reuses the real neuron_forward() from DL Foundations rather than
    reimplementing the arithmetic here — the assistant's 'numerical' for
    this concept is genuinely the same computation the DL Foundations lab
    runs, not a separately-authored lookalike."""
    inputs = [round(rng.uniform(-2, 2), 2) for _ in range(2)]
    weights = [round(rng.uniform(-1, 1), 2) for _ in range(2)]
    bias = round(rng.uniform(-1, 1), 2)
    activation = rng.choice(["sigmoid", "relu", "tanh"])
    result = neuron_forward(inputs, weights, bias, activation)
    answer = round(result.activated_output, 4)
    return {
        "questionText": f"A neuron has inputs {inputs}, weights {weights}, bias {bias}, and a {activation} activation. Compute its output.",
        "given": [f"inputs = {inputs}", f"weights = {weights}", f"bias = {bias}", f"activation = {activation}"],
        "correctAnswer": answer, "tolerance": max(abs(answer) * 0.02, 0.01),
        "explanation": f"z = {result.weighted_sum:.4f}; output = {activation}(z) = {answer} "
                        f"— try it yourself in the DL Foundations neuron calculator.",
    }


NUMERICAL_GENERATORS = {
    "ngram": _numerical_bigram,
    "language_model_probability": _numerical_bigram,
    "laplace_smoothing": _numerical_laplace,
    "perplexity": _numerical_perplexity,
    "edit_distance": _numerical_edit_distance,
    "tfidf": _numerical_tfidf,
    "jaccard_similarity": _numerical_jaccard,
    "cosine_similarity": _numerical_cosine,
    "neuron": _numerical_neuron,
}

_STOPWORDS_FOR_GRADING = {"a", "an", "the", "is", "are", "of", "to", "in", "and", "it", "its",
                           "that", "this", "as", "by", "with", "for", "on", "be", "was", "were"}


def _grade_free_text(student_answer: str, model_answer: str) -> tuple[bool, float]:
    key_terms = {w for w in re.findall(r"[a-z']+", model_answer.lower()) if len(w) > 3 and w not in _STOPWORDS_FOR_GRADING}
    student_terms = set(re.findall(r"[a-z']+", student_answer.lower()))
    if not key_terms:
        return True, 1.0
    overlap = len(key_terms & student_terms) / len(key_terms)
    return overlap >= 0.3, round(overlap, 2)


# --------------------------------------------------------------------------- intent detection

_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("META", re.compile(r"\b(who are you|what are you|what can you (do|answer)|about (this|yourself))\b|^help\??$")),
    ("MULTIPLE_EXAMPLES", re.compile(r"\b(\d+|two|three|four|five|six|several|multiple|few|couple)\s+examples?\b")),
    ("DIFFERENCE", re.compile(r"\bdifferen(t|ce)\b|\bcompar(e|ison)\b|\bversus\b|\bvs\.?\b")),
    ("EXAMPLE", re.compile(r"\b(another|one more|give (me )?an?|show me an?|any)?\s*examples?\b")),
    ("CODE", re.compile(r"\bcode\b|\bpython\b|\bprogram(ming)?\b|\bimplementation\b|\bsnippet\b")),
    ("VIVA", re.compile(r"\bviva\b|\bquiz me\b|\btest me\b|\bask me a question\b")),
    ("CHALLENGE", re.compile(r"\bchalleng(e|ing)\b|\bdifficult\b|\bharder\b|\bhard question\b|\bhard problem\b|\bmake it harder\b")),
    ("NUMERICAL", re.compile(r"\bnumerical\b|\bcalculate\b|\bcompute\b|\bsolve\b|\bproblem on\b")),
    ("SIMPLIFY", re.compile(r"\blike i\'?m a beginner\b|\bsimply\b|\bin simple terms\b|\bdumb it down\b|\beli5\b|\bbeginner\b")),
    ("ADVANCED", re.compile(r"\bmathematically\b|\badvanced\b|\bformula\b|\bin depth\b|\brigorous(ly)?\b|\btechnical(ly)?\b")),
    ("WHY", re.compile(r"^why\b|\bwhy do we\b|\bwhy is\b|\bwhy use\b|\breason for\b|\bpurpose of\b")),
    ("REAL_WORLD_USE", re.compile(r"real.?world|used? in real life|where is .* used|application[s]? of|"
                                    r"how (is|does|do) .* (used|help|work)|use case")),
    ("HOW", re.compile(r"^how (does|do|is|are)\b")),
    ("DEFINITION", re.compile(r"^what is\b|^what are\b|\bdefine\b|^explain\b|\btell me about\b|\bmeaning of\b")),
]

_OUT_OF_SCOPE_HINTS = re.compile(
    r"prime minister|president of|capital of|weather (today|tomorrow)|cricket score|stock price|"
    r"movie (review|rating)|who won the|what time is it|current (date|time)"
)


def detect_intent(normalized: str, has_topic: bool) -> str:
    for intent, pattern in _PATTERNS:
        if pattern.search(normalized):
            return intent
    return "DEFINITION" if has_topic else "AMBIGUOUS"


# --------------------------------------------------------------------------- response builders

def _definition_response(entry: dict, cid: str, difficulty: str) -> list[dict]:
    blocks = [_block_heading(entry["name"]), _block_callout("💡", entry["simpleMeaning"])]
    if difficulty == "beginner":
        pass  # simple meaning above is enough for a beginner
    elif difficulty == "advanced" and entry["advanced"]:
        blocks.append(_block_text(entry["definition"]))
        if entry["formula"]:
            blocks.append(_block_formula(entry["formula"], entry["formulaExplanation"]))
        blocks.append(_block_text(entry["advanced"]))
    else:
        blocks.append(_block_text(entry["definition"]))
    blocks.append(_block_callout("🧠 Remember", entry["why"]))
    return blocks


def _example_response(entry: dict, cid: str, context: dict) -> list[dict]:
    idx = context["exampleIndex"].get(cid, 0)
    examples = entry["examples"]
    if not examples:
        return [_block_heading(entry["name"]),
                _block_text(f"I don't have an authored example for {entry['name']} yet — here's the core idea instead:"),
                _block_callout("💡", entry["simpleMeaning"])]
    ex = examples[idx % len(examples)]
    context["exampleIndex"][cid] = idx + 1
    return [
        _block_heading(f"EXAMPLE: {entry['name']}"),
        _block_text("Sure! Here's a simple example 👇"),
        _block_code(f'Input:\n{ex["input"]}\n\nOutput:\n{ex["output"]}', "text"),
        _block_callout("💡 What happened?", ex["explanation"]),
    ]


def _multiple_examples_response(entry: dict, cid: str, context: dict, count: int) -> list[dict]:
    examples = entry["examples"]
    if not examples:
        return _example_response(entry, cid, context)
    start = context["exampleIndex"].get(cid, 0)
    chosen = [examples[(start + i) % len(examples)] for i in range(min(count, len(examples)))]
    context["exampleIndex"][cid] = start + len(chosen)
    blocks = [_block_heading(f"{count} EXAMPLES: {entry['name']}")]
    lines = []
    for i, ex in enumerate(chosen, 1):
        lines.append(f'{i}. {ex["input"]}\n   → {ex["output"]}')
    blocks.append(_block_code("\n\n".join(lines), "text"))
    if count > len(examples):
        blocks.append(_block_text(f"(This project has {len(examples)} authored example(s) for {entry['name']} — "
                                    f"showing all of them rather than repeating or inventing more.)"))
    return blocks


def _why_response(entry: dict) -> list[dict]:
    return [_block_heading(f"Why {entry['name']}?"), _block_text(entry["why"])]


def _how_response(entry: dict) -> list[dict]:
    blocks = [_block_heading(entry["name"]), _block_text(entry["simpleMeaning"]), _block_text(entry["why"])]
    if entry["examples"]:
        ex = entry["examples"][0]
        blocks.append(_block_code(f'Input:\n{ex["input"]}\n\nOutput:\n{ex["output"]}', "text"))
    return blocks


def _real_world_response(entry: dict, domain: str | None) -> list[dict]:
    blocks = [_block_heading(f"{entry['name']} in the Real World"),
              _block_bullets(entry["realWorldApplications"])]
    if domain and domain in DOMAIN_KB:
        d = DOMAIN_KB[domain]
        blocks.append(_block_heading(d["label"]))
        blocks.append(_block_bullets(d["items"]))
        if "pipeline" in d:
            blocks.append(_block_code(" → ".join(d["pipeline"]), "text"))
            blocks.append(_block_text("This is a simplified educational pipeline, not the literal internal architecture."))
    return blocks


def _domain_only_response(domain: str) -> list[dict]:
    d = DOMAIN_KB[domain]
    blocks = [_block_heading(f"NLP in {d['label']}"), _block_bullets(d["items"])]
    if "pipeline" in d:
        blocks.append(_block_code(" → ".join(d["pipeline"]), "text"))
        blocks.append(_block_text("This is a simplified educational pipeline, not the literal internal architecture of any specific company."))
    blocks.append(_block_text("These are typical, generally-cited NLP use cases for this domain — not verified claims about any single company's internal systems."))
    return blocks


def _code_response(entry: dict) -> list[dict]:
    if entry["codeExample"]:
        return [_block_heading(f"Python code: {entry['name']}"), _block_code(entry["codeExample"]),
                _block_callout("💡 What it does", "Run this and read the output — it's the smallest real "
                                                    "version of the idea, not a simplified fake.")]
    return [_block_heading(entry["name"]),
            _block_text(f"There isn't a short runnable code example authored for {entry['name']} in this "
                         f"project yet — here's the core idea in plain terms instead:"),
            _block_callout("💡", entry["simpleMeaning"])]


def _difference_response(e1: dict, cid1: str, e2: dict, cid2: str) -> list[dict]:
    key = frozenset({cid1, cid2})
    if key in STATIC_COMPARISONS:
        cmp = STATIC_COMPARISONS[key]
        return [_block_heading(f"{e1['name']} vs. {e2['name']}"), _block_table(cmp["headers"], cmp["rows"])]
    headers = [e1["name"], e2["name"]]
    rows = [
        ["Simple meaning", e1["simpleMeaning"], e2["simpleMeaning"]],
        ["Difficulty", e1["difficulty"], e2["difficulty"]],
        ["Formula", e1["formula"] or "—", e2["formula"] or "—"],
        ["Typical use", e1["realWorldApplications"][0] if e1["realWorldApplications"] else "—",
         e2["realWorldApplications"][0] if e2["realWorldApplications"] else "—"],
    ]
    return [_block_heading(f"{e1['name']} vs. {e2['name']}"), _block_table(headers, rows)]


def _numerical_response(entry: dict, cid: str, context: dict) -> list[dict]:
    gen = NUMERICAL_GENERATORS.get(cid)
    if gen is None:
        blocks = [_block_heading(f"{entry['name']} — numerical"),
                  _block_text(f"I don't have an interactive numerical generator for {entry['name']} yet. "
                               f"Here's the formula this concept is built on instead:")]
        if entry["formula"]:
            blocks.append(_block_formula(entry["formula"], entry["formulaExplanation"]))
        return blocks
    rng = random.Random()
    problem = gen(rng)
    context["pendingNumerical"] = {"concept": cid, **problem}
    blocks = [
        _block_heading(f"{entry['name'].upper()} — NUMERICAL"),
        _block_text(problem["questionText"]),
        _block_bullets(problem["given"]),
    ]
    if entry["formula"]:
        blocks.append(_block_formula(entry["formula"], entry["formulaExplanation"]))
    blocks.append(_block_callout("✏️", "Enter your answer as a number and I'll check it."))
    return blocks


def _numerical_answer_response(pending: dict, student_message: str) -> list[dict]:
    value = _extract_number(student_message)
    correct = pending["correctAnswer"]
    tolerance = pending.get("tolerance", 0.01)
    if value is None:
        return [_block_callout("🤔", "I couldn't find a number in that — try entering just the numeric answer.")]
    is_correct = abs(value - correct) <= tolerance
    if is_correct:
        return [_block_callout("✓", "Correct!"), _block_code(pending["explanation"], "text")]
    return [_block_callout("✗", f"Not quite — the correct answer is {correct}."),
            _block_code(pending["explanation"], "text")]


def _viva_response(entry: dict, cid: str, context: dict) -> list[dict]:
    idx = context["vivaIndex"].get(cid, 0)
    questions = entry["vivaQuestions"]
    if questions:
        q = questions[idx % len(questions)]
        context["vivaIndex"][cid] = idx + 1
        context["pendingViva"] = {"concept": cid, "question": q["question"], "modelAnswer": q["modelAnswer"]}
        return [_block_heading(f"VIVA — {entry['name']}"), _block_text(q["question"]),
                _block_callout("🎤", "Type your answer and I'll evaluate it.")]
    question = f"In your own words, what is {entry['name']} and why is it used?"
    model_answer = entry["definition"] + " " + entry["why"]
    context["pendingViva"] = {"concept": cid, "question": question, "modelAnswer": model_answer}
    return [_block_heading(f"VIVA — {entry['name']}"), _block_text(question),
            _block_callout("🎤", "Type your answer and I'll evaluate it.")]


def _viva_answer_response(pending: dict, student_message: str) -> list[dict]:
    passed, overlap = _grade_free_text(student_message, pending["modelAnswer"])
    header = _block_callout("✓", f"Good answer! (keyword overlap: {overlap})") if passed else \
        _block_callout("✗", f"That's missing some key points (keyword overlap: {overlap}).")
    return [header, _block_text("Here's a strong model answer for comparison:"),
            _block_callout("📖", pending["modelAnswer"]),
            _block_text("Note: this is a simple keyword-overlap heuristic, not a real semantic grader — "
                         "use it as a rough self-check, not a definitive score.")]


def _challenge_response(entry: dict, cid: str, context: dict) -> list[dict]:
    idx = context["challengeIndex"].get(cid, 0)
    challenges = entry["challengeExamples"]
    if challenges:
        c = challenges[idx % len(challenges)]
        context["challengeIndex"][cid] = idx + 1
        return [_block_heading(f"CHALLENGE — {entry['name']}"), _block_text(c),
                _block_callout("🏆", "Work through it, then ask me to check your reasoning or request the next one.")]
    if entry["vivaQuestions"]:
        q = entry["vivaQuestions"][idx % len(entry["vivaQuestions"])]
        return [_block_heading(f"CHALLENGE — {entry['name']}"),
                _block_text(f"No authored challenge yet for {entry['name']} — here's a viva-style challenge instead:"),
                _block_text(q["question"])]
    return [_block_heading(f"CHALLENGE — {entry['name']}"),
            _block_text(f"I don't have a challenge authored for {entry['name']} yet.")]


def _meta_response() -> list[dict]:
    return [
        _block_heading("NLP Learning Assistant"),
        _block_text("I'm a rule-based intent-detection system over a structured knowledge base of the "
                      "NLP and Deep Learning concepts this platform teaches — not a large language model. "
                      "I detect what kind of question you're asking (definition, example, code, numerical, "
                      "viva, challenge, and more), find the right concept, and generate a structured answer "
                      "from real authored content."),
        _block_bullets([f"Definitions & simple explanations", "Real examples (and multiple, on request)",
                        "Python code where a snippet is authored", "Interactive numericals with real computed answers",
                        "Viva questions and challenges", "Comparisons between concepts"]),
    ]


def _ambiguous_response() -> list[dict]:
    names = [CONCEPTS[c]["name"] for c in QUICK_TOPIC_OPTIONS]
    return [_block_text("Sure — which concept would you like me to explain?"), _block_bullets(names)]


def _out_of_scope_response() -> list[dict]:
    return [
        _block_text("I'm designed primarily for NLP and Deep Learning learning. I can help with concepts, "
                     "algorithms, applications, coding, numericals, and challenges from either domain."),
        _block_bullets(["\"Give me an example of tokenization\"", "\"Explain CYK parsing\"",
                        "\"Give me a numerical on perplexity\"", "\"How is NLP used in banking?\"",
                        "\"Explain scaled dot-product attention\"", "\"Give me a numerical on a neuron\""]),
    ]


# --------------------------------------------------------------------------- top-level entry point

def process_message(message: str, context: dict | None) -> dict:
    context = {**_default_context(), **(context or {})}
    context.setdefault("exampleIndex", {})
    context.setdefault("numericalIndex", {})
    context.setdefault("challengeIndex", {})
    context.setdefault("vivaIndex", {})
    normalized = _normalize(message)

    # 1. Resolve a pending interactive answer first, if one is waiting — but only if
    # the message actually looks like an answer, not a new question that happens to
    # arrive before the student answered. A short message containing a number and no
    # other intent keyword is treated as the answer; anything else falls through to
    # normal intent handling and the pending question is quietly dropped.
    looks_like_new_question = any(pattern.search(normalized) for _, pattern in _PATTERNS)

    if context.get("pendingNumerical"):
        pending = context["pendingNumerical"]
        value = _extract_number(message)
        if value is not None and not looks_like_new_question:
            blocks = _numerical_answer_response(pending, message)
            context["pendingNumerical"] = None
            return _finish(message, "NUMERICAL_ANSWER", pending["concept"], blocks, context)
        context["pendingNumerical"] = None  # abandoned in favor of a new question

    if context.get("pendingViva"):
        pending = context["pendingViva"]
        if not looks_like_new_question:
            blocks = _viva_answer_response(pending, message)
            context["pendingViva"] = None
            return _finish(message, "VIVA_ANSWER", pending["concept"], blocks, context)
        context["pendingViva"] = None  # abandoned in favor of a new question

    # 2. Out-of-scope short-circuit.
    if _OUT_OF_SCOPE_HINTS.search(normalized) and not _find_topics(normalized):
        return _finish(message, "OUT_OF_SCOPE", None, _out_of_scope_response(), context)

    topics = _find_topics(normalized)
    domain = _find_domain(normalized)
    has_topic = bool(topics) or (context["currentTopic"] is not None and _is_followup(normalized))

    intent = detect_intent(normalized, has_topic)

    # META short-circuits before topic resolution.
    if intent == "META":
        return _finish(message, "META", None, _meta_response(), context)

    # Resolve primary topic: explicit mention wins; else fall back to context for follow-ups.
    cid = topics[0] if topics else (context["currentTopic"] if _is_followup(normalized) else None)

    if intent == "DIFFERENCE":
        if len(topics) >= 2:
            cid1, cid2 = topics[0], topics[1]
        elif len(topics) == 1 and context["currentTopic"] and context["currentTopic"] != topics[0]:
            cid1, cid2 = context["currentTopic"], topics[0]
        elif len(topics) == 0 and context["previousTopic"] and context["currentTopic"]:
            cid1, cid2 = context["previousTopic"], context["currentTopic"]
        else:
            blocks = [_block_text("I can compare two NLP concepts — which two would you like? "
                                    "For example: \"stemming vs lemmatization\" or \"CYK vs Earley parser\".")]
            return _finish(message, "AMBIGUOUS", cid, blocks, context)
        blocks = _difference_response(CONCEPTS[cid1], cid1, CONCEPTS[cid2], cid2)
        context["previousTopic"] = context["currentTopic"]
        context["currentTopic"] = cid2
        return _finish(message, "DIFFERENCE", cid2, blocks, context, related_entry=CONCEPTS[cid2])

    if intent == "REAL_WORLD_USE" and domain and cid is None:
        return _finish(message, "REAL_WORLD_USE", None, _domain_only_response(domain), context)

    if cid is None:
        return _finish(message, "AMBIGUOUS", None, _ambiguous_response(), context)

    entry = CONCEPTS[cid]
    if len(topics) > 1:
        # The message itself named a second concept (e.g. "stemming and lemmatization")
        # — remember it so a later "difference between them" can find both.
        context["previousTopic"] = topics[1]
    elif context["currentTopic"] != cid:
        context["previousTopic"] = context["currentTopic"]
    context["currentTopic"] = cid

    if intent == "MULTIPLE_EXAMPLES":
        count = _extract_count(normalized, default=3)
        blocks = _multiple_examples_response(entry, cid, context, count)
    elif intent == "EXAMPLE":
        blocks = _example_response(entry, cid, context)
    elif intent == "WHY":
        blocks = _why_response(entry)
    elif intent == "HOW":
        blocks = _how_response(entry)
    elif intent == "REAL_WORLD_USE":
        blocks = _real_world_response(entry, domain)
    elif intent == "CODE":
        blocks = _code_response(entry)
    elif intent == "NUMERICAL":
        blocks = _numerical_response(entry, cid, context)
    elif intent == "VIVA":
        blocks = _viva_response(entry, cid, context)
    elif intent == "CHALLENGE":
        blocks = _challenge_response(entry, cid, context)
    elif intent == "SIMPLIFY":
        context["difficulty"] = "beginner"
        blocks = _definition_response(entry, cid, "beginner")
    elif intent == "ADVANCED":
        context["difficulty"] = "advanced"
        blocks = _definition_response(entry, cid, "advanced")
    else:  # DEFINITION fallback
        blocks = _definition_response(entry, cid, context["difficulty"])

    return _finish(message, intent, cid, blocks, context, related_entry=entry)


def _is_followup(normalized: str) -> bool:
    return bool(re.match(r"^(what is it\??|give (me )?an example\.?|why\??|where is it used\??|"
                          r"show me code\.?|give me a harder (one|question)\.?|explain it simply\.?|"
                          r"compare it with the previous concept\.?|another example\.?|make it harder\.?|"
                          r"give me (a|another) numerical\.?)$", normalized)) or len(normalized.split()) <= 4


def _finish(message: str, intent: str, cid: str | None, blocks: list[dict], context: dict,
            related_entry: dict | None = None) -> dict:
    context["lastIntent"] = intent
    entry = related_entry or (CONCEPTS.get(cid) if cid else None)
    return {
        "message": message,
        "intent": intent,
        "topic": cid,
        "topicName": entry["name"] if entry else None,
        "blocks": blocks,
        "relatedLab": _related_lab(entry) if entry else None,
        "suggestedActions": _actions_for(intent, entry),
        "suggestedQuestions": _suggested_questions_for(cid),
        "context": context,
        "methodNote": "Rule-based intent detection + a structured NLP knowledge base — not a language model.",
    }


def _actions_for(intent: str, entry: dict | None) -> list[str]:
    if entry is None:
        return []
    actions = ["Give Example", "Explain Simply"]
    if entry["codeExample"]:
        actions.append("Show Code")
    if entry.get("labRoute"):
        actions.append("Go To Lab")
    actions.append("Challenge Me")
    return actions
