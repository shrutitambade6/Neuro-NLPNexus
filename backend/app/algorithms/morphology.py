"""
Stemming, lemmatization, and morphological breakdown — implemented from
scratch, no nltk/spacy dependency.

Stemming: a faithful implementation of the classic Porter (1980) stemming
algorithm (steps 1a-5b, the measure function m(), and the *v*/*d/*o
conditions exactly as specified in the original paper). This is a real,
well-defined, deterministic algorithm — not an approximation dressed up as
one.

Lemmatization: unlike stemming, a *real* lemmatizer needs a POS-tagged
lexicon (e.g. WordNet) to know a word's dictionary form. No such lexicon is
installed in this project (nltk/spacy are in requirements.txt but their
corpora are not downloaded — see the audit doc). Rather than claim
WordNet-quality lemmatization this project can't actually run, this module
does something honestly smaller: a small hand-built irregular-forms
dictionary (is/am/are -> be, better/best -> good, etc.) plus rule-based
regular-inflection stripping (plurals, -ing/-ed verb forms). Any word not
covered by the irregular dictionary or a regular rule is returned unchanged,
and the response says which path was used — nothing is silently guessed.

Morphological breakdown: a simplified prefix/root/suffix segmenter using a
small, explicit affix lexicon. Real morphological analysis requires a
lexicon of legal root-affix combinations per language; this shows the
*mechanism* (peel known prefixes/suffixes off the ends of the word) rather
than claiming full linguistic coverage.
"""
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Porter stemmer (Porter, 1980) — classic algorithm, steps 1a through 5b.
# ---------------------------------------------------------------------------

VOWELS = set("aeiou")


def _is_consonant(word: str, i: int) -> bool:
    ch = word[i]
    if ch in VOWELS:
        return False
    if ch == "y":
        if i == 0:
            return True
        return not _is_consonant(word, i - 1)
    return True


def _cv_form(word: str) -> str:
    """Collapsed consonant/vowel form, e.g. 'trouble' -> 'CVCCVCV' -> 'CVCVCV'."""
    raw = "".join("C" if _is_consonant(word, i) else "V" for i in range(len(word)))
    collapsed: list[str] = []
    for ch in raw:
        if not collapsed or collapsed[-1] != ch:
            collapsed.append(ch)
    return "".join(collapsed)


def _measure(stem: str) -> int:
    """m in the [C](VC)^m[V] representation: the number of VC repeats."""
    if not stem:
        return 0
    return _cv_form(stem).count("VC")


def _contains_vowel(stem: str) -> bool:
    return any(not _is_consonant(stem, i) for i in range(len(stem)))


def _ends_double_consonant(word: str) -> bool:
    return len(word) >= 2 and word[-1] == word[-2] and _is_consonant(word, len(word) - 1)


def _ends_cvc(word: str) -> bool:
    """Ends consonant-vowel-consonant, where the final consonant isn't w, x, y."""
    if len(word) < 3:
        return False
    if not (
        _is_consonant(word, len(word) - 3)
        and not _is_consonant(word, len(word) - 2)
        and _is_consonant(word, len(word) - 1)
    ):
        return False
    return word[-1] not in "wxy"


def _apply_first_match(word: str, rules: list[tuple[str, str, object]]) -> tuple[str, bool]:
    """Rules are (suffix, replacement, condition) where condition is either
    None (no condition beyond having the suffix) or a callable(stem) -> bool.
    Tries rules in order (list must already be longest-suffix-first within
    each tie group) and applies the first whose suffix matches and whose
    condition (checked against the *stem before the suffix*) holds."""
    for suffix, replacement, condition in rules:
        if suffix == "" or word.endswith(suffix):
            stem = word[: len(word) - len(suffix)] if suffix else word
            if condition is None or condition(stem):
                return stem + replacement, True
    return word, False


def porter_stem(word: str) -> str:
    """Runs the full Porter algorithm on a single lowercase word."""
    w = word.lower().strip()
    if len(w) <= 2 or not w.isalpha():
        return w

    # --- Step 1a ---
    w, _ = _apply_first_match(
        w,
        [
            ("sses", "ss", None),
            ("ies", "i", None),
            ("ss", "ss", None),
            ("s", "", None),
        ],
    )

    # --- Step 1b ---
    step1b_applied_ed_or_ing = False
    if w.endswith("eed"):
        stem = w[:-3]
        if _measure(stem) > 0:
            w = stem + "ee"
    elif w.endswith("ed") and _contains_vowel(w[:-2]):
        w = w[:-2]
        step1b_applied_ed_or_ing = True
    elif w.endswith("ing") and _contains_vowel(w[:-3]):
        w = w[:-3]
        step1b_applied_ed_or_ing = True

    if step1b_applied_ed_or_ing:
        if w.endswith(("at", "bl", "iz")):
            w = w + "e"
        elif _ends_double_consonant(w) and w[-1] not in "lsz":
            w = w[:-1]
        elif _measure(w) == 1 and _ends_cvc(w):
            w = w + "e"

    # --- Step 1c ---
    if w.endswith("y") and _contains_vowel(w[:-1]):
        w = w[:-1] + "i"

    # --- Step 2 (m > 0) ---
    step2_rules = [
        ("ational", "ate", None), ("tional", "tion", None),
        ("enci", "ence", None), ("anci", "ance", None), ("izer", "ize", None),
        ("abli", "able", None), ("alli", "al", None), ("entli", "ent", None),
        ("eli", "e", None), ("ousli", "ous", None), ("ization", "ize", None),
        ("ation", "ate", None), ("ator", "ate", None), ("alism", "al", None),
        ("iveness", "ive", None), ("fulness", "ful", None), ("ousness", "ous", None),
        ("aliti", "al", None), ("iviti", "ive", None), ("biliti", "ble", None),
    ]
    for suffix, replacement, _ in step2_rules:
        if w.endswith(suffix):
            stem = w[: -len(suffix)]
            if _measure(stem) > 0:
                w = stem + replacement
            break

    # --- Step 3 (m > 0) ---
    step3_rules = [
        ("icate", "ic", None), ("ative", "", None), ("alize", "al", None),
        ("iciti", "ic", None), ("ical", "ic", None), ("ful", "", None), ("ness", "", None),
    ]
    for suffix, replacement, _ in step3_rules:
        if w.endswith(suffix):
            stem = w[: -len(suffix)]
            if _measure(stem) > 0:
                w = stem + replacement
            break

    # --- Step 4 (m > 1) ---
    step4_rules = [
        "al", "ance", "ence", "er", "ic", "able", "ible", "ant", "ement",
        "ment", "ent", "ou", "ism", "ate", "iti", "ous", "ive", "ize",
    ]
    for suffix in sorted(step4_rules, key=len, reverse=True):
        if w.endswith(suffix):
            stem = w[: -len(suffix)]
            if suffix == "ion":
                continue  # handled specially below
            if _measure(stem) > 1:
                w = stem
            break
    else:
        if w.endswith("ion"):
            stem = w[:-3]
            if _measure(stem) > 1 and stem.endswith(("s", "t")):
                w = stem

    # --- Step 5a (m > 1, or m == 1 and not *o) ---
    if w.endswith("e"):
        stem = w[:-1]
        m = _measure(stem)
        if m > 1 or (m == 1 and not _ends_cvc(stem)):
            w = stem

    # --- Step 5b (m > 1 and *d and *L) ---
    if _measure(w) > 1 and _ends_double_consonant(w) and w.endswith("l"):
        w = w[:-1]

    return w


# ---------------------------------------------------------------------------
# Lemmatization — honestly small: irregular lexicon + regular-rule fallback.
# ---------------------------------------------------------------------------

IRREGULAR_LEMMAS: dict[str, str] = {
    "is": "be", "am": "be", "are": "be", "was": "be", "were": "be", "been": "be", "being": "be",
    "has": "have", "had": "have", "having": "have",
    "does": "do", "did": "do", "doing": "do", "done": "do",
    "goes": "go", "went": "go", "gone": "go", "going": "go",
    "better": "good", "best": "good",
    "worse": "bad", "worst": "bad",
    "children": "child", "men": "man", "women": "woman", "people": "person",
    "mice": "mouse", "geese": "goose", "feet": "foot", "teeth": "tooth",
    "ran": "run", "running": "run", "runs": "run",
    "ate": "eat", "eaten": "eat", "eating": "eat", "eats": "eat",
    "saw": "see", "seen": "see", "seeing": "see", "sees": "see",
    "took": "take", "taken": "take", "taking": "take", "takes": "take",
    "wrote": "write", "written": "write", "writing": "write", "writes": "write",
    "studied": "study", "studies": "study", "studying": "study",
}


def simple_lemmatize(word: str) -> dict:
    """Returns {lemma, method} where method is one of 'irregular',
    'regular-rule', or 'unchanged' — always honest about which path fired,
    never silently guessing a form this lexicon doesn't actually cover."""
    w = word.lower().strip()
    if not w.isalpha():
        return {"lemma": w, "method": "unchanged"}

    if w in IRREGULAR_LEMMAS:
        return {"lemma": IRREGULAR_LEMMAS[w], "method": "irregular"}

    # Regular plural nouns: -ies -> -y, -es after s/x/z/ch/sh, -s otherwise.
    if w.endswith("ies") and len(w) > 4:
        return {"lemma": w[:-3] + "y", "method": "regular-rule"}
    if w.endswith(("ses", "xes", "zes", "ches", "shes")) and len(w) > 4:
        return {"lemma": w[:-2], "method": "regular-rule"}
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return {"lemma": w[:-1], "method": "regular-rule"}

    # Regular verb inflections.
    if w.endswith("ing") and len(w) > 5:
        stem = w[:-3]
        if len(stem) >= 2 and stem[-1] == stem[-2] and stem[-1] not in "aeiou":
            stem = stem[:-1]  # running -> run (undo doubled consonant)
        return {"lemma": stem, "method": "regular-rule"}
    if w.endswith("ed") and len(w) > 4:
        stem = w[:-2]
        if len(stem) >= 2 and stem[-1] == stem[-2] and stem[-1] not in "aeiou":
            stem = stem[:-1]
        return {"lemma": stem, "method": "regular-rule"}

    return {"lemma": w, "method": "unchanged"}


# ---------------------------------------------------------------------------
# Morphological breakdown — small, explicit affix lexicon.
# ---------------------------------------------------------------------------

PREFIXES = ["un", "re", "dis", "mis", "pre", "non", "in", "im", "over", "under"]
SUFFIXES = [
    "ational", "tional", "ization", "fulness", "ousness", "iveness",
    "ically", "ation", "ness", "ment", "able", "ible", "ing", "ful",
    "less", "ity", "ize", "ise", "ous", "ive", "ed", "er", "ly", "al", "s",
]


@dataclass
class MorphemeBreakdown:
    word: str
    prefix: str | None
    root: str
    suffix: str | None


def morphology_breakdown(word: str) -> MorphemeBreakdown:
    """Peels at most one known prefix and one known suffix off the word,
    longest match first, leaving the remainder as the root. This is a
    mechanism demonstration (how affix-stripping analysis works), not a
    claim of a full, linguistically-validated morphological parse — e.g. it
    doesn't know that 'un' + 'happy' is licensed but 'un' + 'table' isn't."""
    w = word.lower().strip()
    prefix = None
    suffix = None
    core = w

    for p in sorted(PREFIXES, key=len, reverse=True):
        if core.startswith(p) and len(core) - len(p) >= 3:
            prefix = p
            core = core[len(p):]
            break

    for s in sorted(SUFFIXES, key=len, reverse=True):
        if core.endswith(s) and len(core) - len(s) >= 2:
            suffix = s
            core = core[: len(core) - len(s)]
            break

    return MorphemeBreakdown(word=w, prefix=prefix, root=core, suffix=suffix)
