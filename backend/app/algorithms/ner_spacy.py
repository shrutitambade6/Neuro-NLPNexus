"""
Named Entity Recognition via a real pretrained model -- spaCy's
en_core_web_sm. This is a deliberate, disclosed exception to this
project's usual "every lab computes its own result from scratch" rule
(see requirements.txt): NeuroNLP Nexus's own rule-based/gazetteer NER
(app/algorithms/ner.py) already exists and stays the default engine, but
being able to run the exact same sentence through a real trained model
and compare is a genuinely useful lesson on its own -- where a hand-built
gazetteer and a trained statistical model agree or disagree, and why.

spaCy's own entity labels are preserved exactly as the model returns them
(never silently folded into this project's PERSON/LOCATION/... taxonomy).
SPACY_LABEL_INFO only adds a human-readable name and one-line description
per label for the UI -- it does not rename or merge categories, and
"supported_labels" always lists spaCy's real OntoNotes label set, not
this project's six.

Known, honestly-stated limitation: en_core_web_sm is spaCy's smallest
English model (~13MB, CPU-friendly, no GPU needed) chosen specifically so
it stays installable and fast in this project's existing deployment
environment -- it is measurably less accurate than spaCy's larger
(en_core_web_lg/trf) models, particularly on names and institutions
outside its training data (e.g. many Indian names/places), and like any
trained model it can still be confidently wrong. This module makes no
precision/recall claim beyond what's documented in
tests/test_ner_spacy.py's own small evaluation set.
"""

SPACY_MODEL_NAME = "en_core_web_sm"

# https://spacy.io/models/en -- the full label set en_core_web_sm draws
# from (the OntoNotes 5 scheme), with a short human-readable name and
# description per label for the UI. Not every label appears in every
# input -- this is the full universe the model can produce, not a promise
# that all of them will show up.
SPACY_LABEL_INFO: dict[str, dict[str, str]] = {
    "PERSON": {"name": "Person", "description": "People, including fictional."},
    "NORP": {"name": "Nationality / Group", "description": "Nationalities, or religious or political groups."},
    "FAC": {"name": "Facility", "description": "Buildings, airports, highways, bridges, etc."},
    "ORG": {"name": "Organization", "description": "Companies, agencies, institutions, etc."},
    "GPE": {"name": "Geopolitical Entity", "description": "Countries, cities, states."},
    "LOC": {"name": "Location", "description": "Non-GPE locations: mountain ranges, bodies of water."},
    "PRODUCT": {"name": "Product", "description": "Objects, vehicles, foods, etc. (not services)."},
    "EVENT": {"name": "Event", "description": "Named hurricanes, battles, wars, sports events, etc."},
    "WORK_OF_ART": {"name": "Work of Art", "description": "Titles of books, songs, etc."},
    "LAW": {"name": "Law", "description": "Named documents made into laws."},
    "LANGUAGE": {"name": "Language", "description": "Any named language."},
    "DATE": {"name": "Date", "description": "Absolute or relative dates or periods."},
    "TIME": {"name": "Time", "description": "Times smaller than a day."},
    "PERCENT": {"name": "Percent", "description": 'Percentage, including "%".'},
    "MONEY": {"name": "Money", "description": "Monetary values, including unit."},
    "QUANTITY": {"name": "Quantity", "description": "Measurements, as of weight or distance."},
    "ORDINAL": {"name": "Ordinal", "description": '"first", "second", etc.'},
    "CARDINAL": {"name": "Cardinal Number", "description": "Numerals that don't fall under another type."},
}

# This project's own NerRequest cap (see schemas/ner.py) is already well
# under spaCy's own default nlp.max_length (1,000,000 chars) -- this is
# just a second, explicit guard local to this module so a direct caller
# of extract_entities_spacy (e.g. a test) gets the same honest error the
# API would, not a generic spaCy exception.
MAX_CHARS = 5000


class SpacyUnavailableError(Exception):
    """Raised when spaCy or its English model isn't installed. The import
    is attempted lazily, inside _get_model, specifically so a backend
    that never calls the spaCy engine (e.g. CI, or a deployment that only
    uses the rule-based default) never pays the import cost and never
    fails to start over it."""


_nlp = None  # Lazily-loaded singleton. Loading takes real time (hundreds
             # of ms, see tests/test_ner_spacy.py) and holds the model in
             # memory, so it's loaded once per process and reused --
             # never reloaded per request.


def _get_model():
    global _nlp
    if _nlp is not None:
        return _nlp
    try:
        import spacy
    except ImportError as e:
        raise SpacyUnavailableError(
            "spaCy isn't installed. Run `pip install spacy` and "
            f"`python -m spacy download {SPACY_MODEL_NAME}` in the backend."
        ) from e
    try:
        _nlp = spacy.load(SPACY_MODEL_NAME)
    except OSError as e:
        raise SpacyUnavailableError(
            f"The spaCy model '{SPACY_MODEL_NAME}' isn't downloaded. Run "
            f"`python -m spacy download {SPACY_MODEL_NAME}` in the backend."
        ) from e
    return _nlp


def is_available() -> bool:
    try:
        _get_model()
        return True
    except SpacyUnavailableError:
        return False


def extract_entities_spacy(text: str) -> dict:
    if not text.strip():
        raise ValueError("Text to analyze cannot be empty.")
    if len(text) > MAX_CHARS:
        raise ValueError(f"Text is too long for the spaCy engine ({len(text)} chars, limit {MAX_CHARS}).")

    nlp = _get_model()
    doc = nlp(text)

    entities = [
        {
            "text": ent.text,
            "start": ent.start_char,
            "end": ent.end_char,
            "label": ent.label_,
            "label_display": SPACY_LABEL_INFO.get(ent.label_, {}).get("name", ent.label_),
        }
        for ent in doc.ents
    ]

    by_label: dict[str, list[str]] = {}
    for e in entities:
        by_label.setdefault(e["label"], []).append(e["text"])

    return {
        "text": text,
        "entities": entities,
        "by_label": by_label,
        "supported_labels": sorted(SPACY_LABEL_INFO.keys()),
        "engine": "spacy",
    }
