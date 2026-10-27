from app.algorithms.ner import extract_entities


def test_finds_person_location_date_money():
    r = extract_entities("Shruti visited Mumbai University on Monday and paid $500.")
    labels = {e["label"] for e in r["entities"]}
    assert "PERSON" in labels
    assert "ORGANIZATION" in labels
    assert "DATE" in labels
    assert "MONEY" in labels


def test_org_suffix_wins_over_location_gazetteer():
    r = extract_entities("Mumbai University announced a new course.")
    org_entities = [e["text"] for e in r["entities"] if e["label"] == "ORGANIZATION"]
    assert "Mumbai University" in org_entities


def test_title_plus_name_is_one_person_span():
    r = extract_entities("Dr. Rao gave a lecture.")
    person_entities = [e["text"] for e in r["entities"] if e["label"] == "PERSON"]
    assert "Dr. Rao" in person_entities


def test_multiword_org_with_connector():
    r = extract_entities("She works at the Indian Institute of Technology.")
    org_entities = [e["text"] for e in r["entities"] if e["label"] == "ORGANIZATION"]
    assert "Indian Institute of Technology" in org_entities


def test_no_entities_in_plain_lowercase_text():
    r = extract_entities("the cat sat on the mat")
    assert r["entities"] == []


def test_supported_labels_listed():
    r = extract_entities("hello")
    assert set(r["supported_labels"]) == {"PERSON", "LOCATION", "ORGANIZATION", "DATE", "MONEY", "PRODUCT", "MISC"}
