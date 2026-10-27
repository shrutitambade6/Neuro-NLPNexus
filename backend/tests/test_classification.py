from app.algorithms.classification import CATEGORIES, classify


def test_sports_text_classified_as_sports():
    r = classify("The striker scored a goal in the final minute of the match")
    assert r["predicted_category"] == "Sports"


def test_business_text_classified_as_business():
    r = classify("The central bank raised interest rates to control inflation")
    assert r["predicted_category"] == "Business"


def test_probabilities_sum_to_one():
    r = classify("The team won the championship")
    # Each probability is rounded to 4 decimal places for display, so the
    # sum can be off by a few units in the last place — not a math bug.
    assert abs(sum(r["probabilities"].values()) - 1.0) < 1e-3


def test_all_categories_present_in_probabilities():
    r = classify("some generic text")
    assert set(r["probabilities"].keys()) == set(CATEGORIES)


def test_predicted_category_has_highest_probability():
    r = classify("the film won an award at the festival")
    predicted_prob = r["probabilities"][r["predicted_category"]]
    assert predicted_prob == max(r["probabilities"].values())
