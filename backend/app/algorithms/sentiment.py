"""
Lexicon-based sentiment analysis, implemented from scratch.

This is a real, explainable technique (not a trained neural model): every
word in the input is looked up in a curated positive/negative lexicon, with
negation ("not good") and intensifiers ("very good") handled by looking at
the 1-2 tokens immediately before a sentiment word. The final label and
confidence are computed directly from the words that were actually found —
nothing here is a fabricated probability.

Real limitation, stated honestly: this cannot handle sarcasm, and its
"confidence" is a measure of how much clear sentiment vocabulary was found,
not a calibrated probability from a trained classifier.
"""
import re
from collections import Counter

# A curated opinion lexicon — real words, honestly small (not a claim of
# exhaustive coverage). Values are polarity weights.
POSITIVE_WORDS: dict[str, float] = {
    "good": 1.0, "great": 1.6, "excellent": 2.0, "amazing": 2.0, "awesome": 1.8,
    "wonderful": 1.8, "fantastic": 1.8, "perfect": 2.0, "love": 1.8, "loved": 1.8,
    "like": 1.0, "liked": 1.0, "happy": 1.4, "best": 1.6, "beautiful": 1.4,
    "nice": 1.0, "positive": 1.0, "recommend": 1.2, "recommended": 1.2,
    "helpful": 1.0, "impressive": 1.4, "smooth": 0.8, "fast": 0.8, "reliable": 1.0,
    "comfortable": 1.0, "affordable": 0.8, "brilliant": 1.6, "superb": 1.8,
    "delightful": 1.4, "enjoy": 1.2, "enjoyed": 1.2, "enjoyable": 1.2, "works": 0.6,
    "worth": 0.8, "satisfied": 1.2, "satisfying": 1.2, "flawless": 1.8, "solid": 0.8,
    "easy": 0.8, "convenient": 0.8, "pleased": 1.2, "outstanding": 1.8, "quality": 0.6,
}

NEGATIVE_WORDS: dict[str, float] = {
    "bad": -1.0, "terrible": -1.8, "awful": -1.8, "horrible": -1.8, "poor": -1.2,
    "worst": -2.0, "hate": -1.8, "hated": -1.8, "dislike": -1.0, "disliked": -1.0,
    "disappointing": -1.4, "disappointed": -1.4, "disappointment": -1.4,
    "broken": -1.2, "useless": -1.6, "waste": -1.4, "slow": -0.8, "crashes": -1.4,
    "crashed": -1.4, "crashing": -1.4, "annoying": -1.2, "frustrating": -1.4,
    "uncomfortable": -1.0, "expensive": -0.6, "cheap": -0.4, "flaw": -1.0,
    "flawed": -1.2, "defective": -1.6, "faulty": -1.6, "unreliable": -1.4,
    "unhappy": -1.4, "regret": -1.4, "regrettable": -1.4, "junk": -1.6,
    "problem": -0.8, "problems": -0.8, "issue": -0.6, "issues": -0.6,
    "fails": -1.2, "failed": -1.2, "failure": -1.4, "suspicious": -0.8,
    "costly": -0.8, "pricey": -0.6, "overpriced": -1.3,
}

NEGATIONS = {
    "not", "no", "never", "cannot", "cant", "can't", "isn't", "isnt", "wasn't",
    "wasnt", "don't", "dont", "doesn't", "doesnt", "didn't", "didnt", "won't",
    "wont", "wouldn't", "wouldnt", "shouldn't", "shouldnt", "couldn't", "couldnt",
    "n't", "without", "barely", "hardly",
}

INTENSIFIERS: dict[str, float] = {
    "very": 1.5, "extremely": 1.8, "really": 1.3, "so": 1.3, "absolutely": 1.7,
    "incredibly": 1.7, "totally": 1.4, "completely": 1.5, "truly": 1.3,
    # "too" as an excess marker ("too costly", "too slow") rather than its
    # "also" sense -- safe here because the window only looks *backward*
    # from a sentiment word, and "also"-too always trails the word it
    # modifies ("I like it too"), so it never lands in that window.
    "too": 1.3,
}

DIMINISHERS: dict[str, float] = {
    "slightly": 0.6, "somewhat": 0.65, "a bit": 0.6, "kind of": 0.6, "fairly": 0.75,
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def analyze_sentiment(text: str) -> dict:
    tokens = _tokenize(text)
    matches = []
    total_score = 0.0

    for i, tok in enumerate(tokens):
        polarity = POSITIVE_WORDS.get(tok) or NEGATIVE_WORDS.get(tok)
        if polarity is None:
            continue

        window = tokens[max(0, i - 2):i]
        negated = any(w in NEGATIONS for w in window)
        multiplier = 1.0
        for w in window:
            if w in INTENSIFIERS:
                multiplier *= INTENSIFIERS[w]
            elif w in DIMINISHERS:
                multiplier *= DIMINISHERS[w]

        signed = polarity * multiplier
        if negated:
            signed *= -1

        matches.append({
            "word": tok,
            "base_polarity": polarity,
            "negated": negated,
            "multiplier": multiplier,
            "contribution": signed,
        })
        total_score += signed

    n_matches = len(matches)
    if n_matches == 0:
        label = "Neutral"
        confidence = 0.0
    else:
        avg = total_score / n_matches
        if avg > 0.15:
            label = "Positive"
        elif avg < -0.15:
            label = "Negative"
        else:
            label = "Neutral"
        # Confidence: how strong + how much real sentiment vocabulary was
        # found, relative to sentence length — capped at 1.0. This is a
        # transparent function of the matched words, not a model probability.
        density = min(n_matches / max(len(tokens), 1) * 3, 1.0)
        strength = min(abs(avg) / 2.0, 1.0)
        confidence = round(0.5 * density + 0.5 * strength, 3)

    pipeline = [
        {"stage": "Text", "detail": text},
        {"stage": "Preprocessing", "detail": f"{len(tokens)} tokens, lowercased"},
        {"stage": "Lexicon lookup", "detail": f"{n_matches} sentiment word(s) matched, negation/intensifiers applied"},
        {"stage": "Prediction", "detail": f"{label} (score {round(total_score, 2)})"},
    ]

    return {
        "text": text,
        "label": label,
        "score": round(total_score, 3),
        "confidence": confidence,
        "matched_words": matches,
        "pipeline": pipeline,
    }
