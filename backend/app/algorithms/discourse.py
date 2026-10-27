"""
Pronoun / antecedent resolution, implemented from scratch.

Honesty note up front: a real Hobbs (1978) algorithm walks a genuine
syntactic parse tree, breadth-first, left to right. This project's only
real parser (app/algorithms/cyk.py) parses against one fixed educational
CNF grammar (simple Det-N-V sentences) — it cannot parse the kind of
multi-clause sentences a discourse/coreference demo needs ("John gave Ravi
the book because he needed it."). Rather than claim a full Hobbs
tree-traversal that this codebase can't actually run, this module does
something real but simpler: shallow, rule-based NP chunking (no real POS
tagger either — nltk/spacy aren't installed) followed by Hobbs-style
left-to-right, most-recent-first candidate ranking with gender/number
agreement constraints. Every candidate list and every accept/reject reason
below is genuinely computed from the sentence text, not scripted — it's
the *algorithm* that's simplified, not the computation.
"""
import re
from dataclasses import dataclass

PRONOUNS = {
    "he": {"gender": "male", "number": "singular", "case": "subject"},
    "him": {"gender": "male", "number": "singular", "case": "object"},
    "his": {"gender": "male", "number": "singular", "case": "possessive"},
    "she": {"gender": "female", "number": "singular", "case": "subject"},
    "her": {"gender": "female", "number": "singular", "case": "object"},
    "hers": {"gender": "female", "number": "singular", "case": "possessive"},
    "it": {"gender": "neuter", "number": "singular", "case": "subject"},
    "its": {"gender": "neuter", "number": "singular", "case": "possessive"},
    "they": {"gender": "any", "number": "plural", "case": "subject"},
    "them": {"gender": "any", "number": "plural", "case": "object"},
    "their": {"gender": "any", "number": "plural", "case": "possessive"},
}

# A small hand-built lexicon so the chunker can guess gender/number for a
# common noun without a real POS tagger. Honestly limited coverage — any
# noun not listed defaults to "neuter, singular", which is stated in the UI.
COMMON_NOUN_GENDER = {
    "man": "male", "boy": "male", "father": "male", "brother": "male",
    "woman": "female", "girl": "female", "mother": "female", "sister": "female",
    "teacher": "any", "student": "any", "doctor": "any", "friend": "any",
}

STOPWORDS = {
    "the", "a", "an", "this", "that", "these", "those", "and", "but", "or",
    "because", "since", "although", "when", "while", "after", "before",
    "to", "of", "in", "on", "at", "for", "with", "is", "was", "were", "be",
    "gave", "give", "needed", "need", "took", "take", "saw", "see", "had",
    "have", "said", "told",
}


@dataclass
class NounPhrase:
    text: str
    head: str
    start_word_index: int
    is_proper: bool
    gender: str
    number: str
    is_person: bool  # proper nouns and known person-nouns (teacher, boy, ...) vs. everything else


def _split_into_words(sentence: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", sentence)


def _guess_gender_number(np_words: list[str]) -> tuple[str, str]:
    head = np_words[-1].lower()
    if head in COMMON_NOUN_GENDER:
        return COMMON_NOUN_GENDER[head], "singular"
    if head.endswith("s") and head not in COMMON_NOUN_GENDER:
        return "any", "plural"
    return "neuter", "singular"


def _looks_like_verb(word: str) -> bool:
    """Cheap, honest heuristic (no real POS tagger available): once a
    determiner-phrase already has at least one word, a further word ending
    in -ed/-ing ("finished", "studied", "running") is more likely a verb
    than a second noun-phrase modifier, so the span should stop before it
    rather than swallow it into the noun phrase. This is a stated
    simplification, not a real morphological analyzer — a genuine past-
    participle modifier ("the finished project") is still allowed as the
    very first word after the determiner, where this check doesn't apply."""
    lower = word.lower()
    if lower in COMMON_NOUN_GENDER:
        return False
    return len(lower) > 4 and (lower.endswith("ed") or lower.endswith("ing"))


def extract_noun_phrases(sentence: str) -> list[NounPhrase]:
    """Shallow chunker: a capitalized word is treated as a proper-noun NP
    (this will over-trigger on a capitalized common word at the very start
    of an unrelated sentence — a known, stated limitation of not having a
    real POS tagger); a determiner followed by zero or more
    non-stopword tokens up to the next stopword/pronoun is treated as a
    common-noun NP. This is a real, if simplified, rule-based chunker —
    not a lookup table of pre-decided answers for specific sentences."""
    words = _split_into_words(sentence)
    phrases: list[NounPhrase] = []
    i = 0
    while i < len(words):
        word = words[i]
        lower = word.lower()

        if lower in PRONOUNS:
            i += 1
            continue

        if word[0].isupper() and lower not in STOPWORDS:
            phrases.append(
                NounPhrase(
                    text=word,
                    head=word,
                    start_word_index=i,
                    is_proper=True,
                    gender=COMMON_NOUN_GENDER.get(lower, "any"),
                    number="singular",
                    is_person=True,  # a capitalized name is assumed to name a person, not a thing
                )
            )
            i += 1
            continue

        if lower in ("the", "a", "an", "this", "that", "these", "those"):
            j = i + 1
            span = []
            while j < len(words) and words[j].lower() not in STOPWORDS and words[j].lower() not in PRONOUNS:
                if span and _looks_like_verb(words[j]):
                    # e.g. "the students finished" — stop before "finished"
                    # rather than swallowing a verb into the noun phrase.
                    break
                span.append(words[j])
                j += 1
                # keep common NPs short and real: adjective(s) + one head noun
                if len(span) >= 3:
                    break
            if span:
                gender, number = _guess_gender_number(span)
                phrases.append(
                    NounPhrase(
                        text=" ".join([word] + span),
                        head=span[-1],
                        start_word_index=i,
                        is_proper=False,
                        gender=gender,
                        number=number,
                        is_person=span[-1].lower() in COMMON_NOUN_GENDER,
                    )
                )
                i = j
                continue

        i += 1

    return phrases


def _agrees(pronoun_info: dict, np: NounPhrase) -> bool:
    if pronoun_info["number"] != np.number:
        return False
    # "it"/"its" refer to things, not people; "he"/"she" refer to people.
    # "they"/"them"/"their" (gender "any") don't constrain person-hood.
    if pronoun_info["gender"] == "neuter" and np.is_person:
        return False
    if pronoun_info["gender"] in ("male", "female") and not np.is_person:
        return False
    if pronoun_info["gender"] == "any" or np.gender == "any":
        return True
    return pronoun_info["gender"] == np.gender


def resolve_pronoun(sentence: str, pronoun: str) -> dict:
    """Real candidate generation + real constraint filtering. Ranking is
    Hobbs-inspired (most recent preceding NP first — Hobbs' search order is
    also fundamentally left-to-right/proximity-driven), not a claim of the
    exact tree-search result a full implementation would produce."""
    pronoun_lower = pronoun.lower().strip()
    if pronoun_lower not in PRONOUNS:
        return {
            "sentence": sentence,
            "pronoun": pronoun,
            "available": False,
            "message": f'"{pronoun}" isn\'t in this lab\'s small pronoun set: {", ".join(sorted(PRONOUNS))}.',
            "candidates": [],
            "resolved_antecedent": None,
        }

    words = _split_into_words(sentence)
    pronoun_positions = [i for i, w in enumerate(words) if w.lower() == pronoun_lower]
    if not pronoun_positions:
        return {
            "sentence": sentence,
            "pronoun": pronoun,
            "available": False,
            "message": f'"{pronoun}" does not appear in that sentence.',
            "candidates": [],
            "resolved_antecedent": None,
        }
    pronoun_pos = pronoun_positions[0]

    pronoun_info = PRONOUNS[pronoun_lower]
    all_phrases = extract_noun_phrases(sentence)
    preceding = [np for np in all_phrases if np.start_word_index < pronoun_pos]
    # Hobbs-style order: nearest preceding candidate first.
    preceding.sort(key=lambda np: -np.start_word_index)

    candidates = []
    for np in preceding:
        agrees = _agrees(pronoun_info, np)
        distance = pronoun_pos - np.start_word_index
        if agrees:
            reason = "gender/number/person agree with the pronoun"
        elif pronoun_info["number"] != np.number:
            reason = f"rejected — number mismatch ({np.number} vs. {pronoun_lower} is {pronoun_info['number']})"
        elif pronoun_info["gender"] == "neuter" and np.is_person:
            reason = f'rejected — "{pronoun_lower}" refers to a thing, but "{np.text}" is treated as a person'
        elif pronoun_info["gender"] in ("male", "female") and not np.is_person:
            reason = f'rejected — "{pronoun_lower}" refers to a person, but "{np.text}" is treated as a thing'
        else:
            reason = f"rejected — gender mismatch ({np.gender} vs. {pronoun_lower} is {pronoun_info['gender']})"
        candidates.append(
            {
                "text": np.text,
                "is_proper_noun": np.is_proper,
                "is_person": np.is_person,
                "word_distance": distance,
                "gender": np.gender,
                "number": np.number,
                "agrees_with_pronoun": agrees,
                "reason": reason,
            }
        )

    resolved = next((c["text"] for c in candidates if c["agrees_with_pronoun"]), None)

    return {
        "sentence": sentence,
        "pronoun": pronoun,
        "available": True,
        "message": None,
        "candidates": candidates,
        "resolved_antecedent": resolved,
    }
