"""
Named Entity Recognition — a rule-based / gazetteer approach, implemented
from scratch. This is deliberately NOT a trained model (no spaCy/transformer
NER pipeline is used anywhere in this project): entities are found via
capitalization patterns, small curated gazetteers, and regexes for
dates/money. It is honestly limited — real trained NER models generalize
far better than this — but every entity it returns is really found by a
traceable rule, never invented.

Supported categories: PERSON, LOCATION, ORGANIZATION, DATE, MONEY, PRODUCT,
MISC (the standard CoNLL-style catch-all for named entities that are real
and specific but don't fit person/location/organization -- events,
competitions, nationalities, and the like, e.g. "FIFA World Cup", "the
Olympics").

This is this project's default NER engine. A second, real pretrained-model
engine (spaCy's en_core_web_sm) also exists, opt-in, in ner_spacy.py, so a
student can directly compare a hand-built gazetteer against a trained
model on the same sentence -- see that module's docstring.
"""
import re

MONTHS = {
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
}
WEEKDAYS = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
}
RELATIVE_DATES = {"today", "tomorrow", "yesterday", "tonight"}

# Curated gazetteers — real, honestly non-exhaustive lists of well-known
# names, not an attempt at global coverage.
LOCATIONS = {
    "mumbai", "delhi", "pune", "bangalore", "bengaluru", "hyderabad", "chennai",
    "kolkata", "ahmedabad", "jaipur", "lucknow", "nagpur", "india", "china",
    "japan", "france", "germany", "england", "london", "paris", "tokyo",
    "new york", "california", "america", "usa", "russia",
    "canada", "australia", "africa", "europe", "asia", "maharashtra",
    "karnataka", "gujarat", "punjab", "kerala", "goa",
    # UK and constituent nations/cities -- "Scotland"/"Glasgow" were the
    # exact gap a live demo caught (both fell through to the PERSON
    # default for lack of a gazetteer entry).
    "scotland", "wales", "ireland", "northern ireland", "united kingdom",
    "uk", "britain", "great britain", "glasgow", "edinburgh", "cardiff",
    "belfast", "dublin", "manchester", "birmingham", "liverpool",
    # Australia -- "Victoria" (the state) was the other gap in that same
    # example ("the withdrawal of Victoria, Australia").
    "victoria", "melbourne", "sydney", "queensland", "new south wales",
    "perth", "brisbane", "adelaide", "canberra",
    # A handful of other obviously-missing major countries/cities.
    "italy", "spain", "brazil", "mexico", "egypt", "south africa",
    "south korea", "singapore", "dubai", "berlin", "rome", "madrid",
    "moscow", "beijing", "shanghai", "toronto",
}
ORG_SUFFIXES = {"university", "college", "institute", "inc", "corp", "corporation",
                 "ltd", "limited", "company", "co", "llc", "labs", "laboratories",
                 "foundation", "association", "organization", "committee",
                 "federation", "fédération", "union", "council", "society", "academy",
                 "agency", "bureau", "ministry", "department", "league", "conference",
                 "alliance", "assembly", "bank", "trust"}
KNOWN_ORGS = {
    "google", "microsoft", "apple", "amazon", "facebook", "meta", "twitter",
    "netflix", "ibm", "intel", "nvidia", "openai", "anthropic", "tesla",
    "infosys", "tcs", "wipro", "reliance", "isro", "nasa", "unesco", "who",
    "fifa", "uefa", "ioc", "icc", "un", "nato",
}
PRODUCTS = {
    "iphone", "android", "windows", "macos", "python", "javascript", "chatgpt",
    "office", "excel", "photoshop", "playstation", "xbox", "kindle",
    "natural language processing", "nlp", "machine learning", "ml",
    "artificial intelligence", "ai", "deep learning", "neural network",
    "neural networks", "computer science", "data science",
}
# Named events/competitions -- the classic CoNLL "MISC" sub-type. Checked
# by the LAST word of a capitalized run, same pattern as ORG_SUFFIXES, so
# "The FIFA World Cup" is recognized via "Cup" the same way "Mumbai
# University" is recognized via "University".
MISC_SUFFIXES = {
    "cup", "games", "olympics", "championship", "championships", "tournament",
    "festival", "marathon", "derby", "grandprix",
}
COMMON_SENTENCE_STARTERS = {
    "the", "a", "an", "this", "that", "these", "those", "it", "he", "she",
    "they", "we", "i", "you", "there", "here", "in", "on", "at", "after",
    "before", "during", "yesterday", "today", "tomorrow",
}


def _split_sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


def _find_money(text: str) -> list[dict]:
    spans = []
    for m in re.finditer(r"(?:₹|Rs\.?\s?|\$)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:crore|lakh|million|billion|thousand))?", text):
        spans.append({"text": m.group().strip(), "start": m.start(), "end": m.end(), "label": "MONEY"})
    for m in re.finditer(r"\b\d[\d,]*(?:\.\d+)?\s?(?:dollars|rupees|USD|INR|euros)\b", text, re.IGNORECASE):
        spans.append({"text": m.group(), "start": m.start(), "end": m.end(), "label": "MONEY"})
    return spans


def _find_dates(text: str) -> list[dict]:
    spans = []
    month_pat = "|".join(sorted(MONTHS, key=len, reverse=True))
    weekday_pat = "|".join(sorted(WEEKDAYS, key=len, reverse=True))
    patterns = [
        rf"\b(?:{weekday_pat})\b",
        rf"\b(?:{month_pat})\s+\d{{1,2}}(?:st|nd|rd|th)?(?:,?\s+\d{{4}})?\b",
        rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{month_pat})(?:,?\s+\d{{4}})?\b",
        r"\b\d{4}\b",
    ]
    seen_spans: list[tuple[int, int]] = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            span = (m.start(), m.end())
            if any(a <= span[0] < b or a < span[1] <= b for a, b in seen_spans):
                continue
            seen_spans.append(span)
            spans.append({"text": m.group(), "start": m.start(), "end": m.end(), "label": "DATE"})
    for m in re.finditer(r"\b(?:today|tomorrow|yesterday|tonight)\b", text, re.IGNORECASE):
        spans.append({"text": m.group(), "start": m.start(), "end": m.end(), "label": "DATE"})
    return spans


# ASCII + Latin-1 accented letters (é, è, ñ, ü, ...) -- plain [a-zA-Z] used
# to silently stop mid-word on any accented character, so "Fédération"
# only ever matched its first letter "F". The À-Ö / Ø-ö / ø-ÿ split skips
# the two non-letter symbols (× at 0xD7, ÷ at 0xF7) sitting inside that
# Latin-1 range.
_UPPER = "A-ZÀ-ÖØ-Þ"
_LOWER = "a-zà-öø-ÿ"
_LETTER = _UPPER + _LOWER

TITLE_PATTERN = re.compile(
    rf"\b(?:Mr|Mrs|Ms|Dr|Prof|Sir)\.?\s+[{_UPPER}][{_LETTER}]*(?:\s+[{_UPPER}][{_LETTER}]*)*"
)
# Allows a small set of lowercase connector words inside a capitalized run,
# so multi-word institution/org names like "Institute of Technology" or
# "Fédération Internationale de Football Association" are found as one
# span rather than fragmenting at the lowercase connector.
CONNECTORS = "of|and|for|the|de|du|des|la|le|von|van|der"
RUN_PATTERN = re.compile(
    rf"\b[{_UPPER}][{_LETTER}]*(?:\s+(?:{CONNECTORS})\s+[{_UPPER}][{_LETTER}]*|\s+[{_UPPER}][{_LETTER}]*)*\b"
)


def _capitalized_runs(text: str) -> list[dict]:
    """Finds runs of consecutive capitalized words (proper-noun candidates),
    plus title + capitalized-name spans ("Dr. Rao") claimed as a single
    span up front."""
    runs = []
    claimed: list[tuple[int, int]] = []

    for m in TITLE_PATTERN.finditer(text):
        runs.append({"text": m.group(), "start": m.start(), "end": m.end()})
        claimed.append((m.start(), m.end()))

    for m in RUN_PATTERN.finditer(text):
        span = (m.start(), m.end())
        if any(a <= span[0] < b or a < span[1] <= b for a, b in claimed):
            continue
        runs.append({"text": m.group(), "start": m.start(), "end": m.end()})

    runs.sort(key=lambda r: r["start"])
    return runs


def extract_entities(text: str) -> dict:
    occupied: list[tuple[int, int]] = []
    entities: list[dict] = []

    def claim(span: dict) -> bool:
        s, e = span["start"], span["end"]
        if any(a < e and s < b for a, b in occupied):
            return False
        occupied.append((s, e))
        entities.append(span)
        return True

    for span in _find_money(text):
        claim(span)
    for span in _find_dates(text):
        claim(span)

    for run in _capitalized_runs(text):
        words = run["text"].split()
        lowered = run["text"].lower()

        # Skip a lone sentence-initial common word (e.g. "The", "It").
        if len(words) == 1 and lowered in COMMON_SENTENCE_STARTERS:
            continue

        # Org suffix is the most decisive signal (e.g. "Mumbai University" —
        # a location-gazetteer word appears inside it, but the suffix makes
        # it an organization, not a place) — checked before the location
        # gazetteer so it takes priority.
        if any(w.lower().rstrip(".,") in ORG_SUFFIXES for w in words):
            claim({**run, "label": "ORGANIZATION"})
            continue
        if lowered in KNOWN_ORGS:
            claim({**run, "label": "ORGANIZATION"})
            continue
        if lowered in LOCATIONS:
            claim({**run, "label": "LOCATION"})
            continue
        if lowered in PRODUCTS:
            claim({**run, "label": "PRODUCT"})
            continue
        if words[-1].lower().rstrip(".,") in MISC_SUFFIXES:
            # A named event/competition ("FIFA World Cup", "the Paris
            # Olympics") -- not a person, not an organization itself.
            claim({**run, "label": "MISC"})
            continue
        if len(words) == 1 and run["text"].isupper() and 2 <= len(run["text"]) <= 6:
            # A single bare ALL-CAPS token this short ("NLP", "FIFA") reads
            # as an acronym in running text, not a person's name -- default
            # it to ORGANIZATION instead of guessing PERSON.
            claim({**run, "label": "ORGANIZATION"})
            continue
        if len(words) >= 1:
            # Default proper-noun guess: PERSON. Rule-based NER's classic
            # failure mode — honestly labeled as a guess in the docstring,
            # not hidden.
            claim({**run, "label": "PERSON"})

    entities.sort(key=lambda e: e["start"])
    LABEL_DISPLAY = {
        "PERSON": "Person", "LOCATION": "Location", "ORGANIZATION": "Organization",
        "DATE": "Date", "MONEY": "Money", "PRODUCT": "Product", "MISC": "Miscellaneous",
    }
    for e in entities:
        e["label_display"] = LABEL_DISPLAY.get(e["label"], e["label"])
    by_label: dict[str, list[str]] = {}
    for e in entities:
        by_label.setdefault(e["label"], []).append(e["text"])

    return {
        "text": text,
        "entities": entities,
        "by_label": by_label,
        "supported_labels": ["PERSON", "LOCATION", "ORGANIZATION", "DATE", "MONEY", "PRODUCT", "MISC"],
        "engine": "rule_based",
    }
