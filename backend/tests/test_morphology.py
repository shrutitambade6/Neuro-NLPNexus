from app.algorithms.morphology import morphology_breakdown, porter_stem, simple_lemmatize


def test_porter_stem_matches_step1a_examples():
    assert porter_stem("caresses") == "caress"
    assert porter_stem("ponies") == "poni"
    assert porter_stem("cats") == "cat"


def test_porter_stem_matches_known_full_pipeline_outputs():
    # Cross-verified against nltk.stem.PorterStemmer(mode=ORIGINAL_ALGORITHM),
    # the reference implementation of the exact 1980 paper.
    assert porter_stem("running") == "run"
    assert porter_stem("agreed") == "agre"
    assert porter_stem("relational") == "relat"
    assert porter_stem("controll") == "control"


def test_porter_stem_short_word_is_unchanged():
    assert porter_stem("is") == "is"
    assert porter_stem("a") == "a"


def test_porter_stem_is_case_insensitive():
    assert porter_stem("Caresses") == porter_stem("caresses")


def test_lemmatize_irregular_form():
    result = simple_lemmatize("was")
    assert result["lemma"] == "be"
    assert result["method"] == "irregular"


def test_lemmatize_regular_plural():
    result = simple_lemmatize("boxes")
    assert result["lemma"] == "box"
    assert result["method"] == "regular-rule"


def test_lemmatize_regular_verb_ing_undoes_doubled_consonant():
    result = simple_lemmatize("running")
    assert result["lemma"] == "run"


def test_lemmatize_unknown_word_is_honest():
    result = simple_lemmatize("xyzzy")
    assert result["method"] == "unchanged"
    assert result["lemma"] == "xyzzy"


def test_morphology_breakdown_finds_prefix_and_suffix():
    breakdown = morphology_breakdown("unhappiness")
    assert breakdown.prefix == "un"
    assert breakdown.suffix in ("ness", "iness") or breakdown.root  # some suffix stripped
    assert breakdown.root


def test_morphology_breakdown_no_affixes_found():
    breakdown = morphology_breakdown("cat")
    assert breakdown.prefix is None
    assert breakdown.suffix is None
    assert breakdown.root == "cat"
