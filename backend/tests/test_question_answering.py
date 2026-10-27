from app.algorithms.question_answering import answer_question

CONTEXT = "Shruti visited Mumbai University on Monday. She gave a talk about NLP."


def test_who_question_returns_person():
    r = answer_question(CONTEXT, "Who visited Mumbai University?")
    assert r["answer"] == "Shruti"


def test_when_question_returns_date():
    r = answer_question(CONTEXT, "When did Shruti visit?")
    assert r["answer"] == "Monday"


def test_where_question_returns_location_or_org():
    r = answer_question(CONTEXT, "Where did Shruti go?")
    assert r["answer"] in {"Mumbai University", "Mumbai"}


def test_no_overlap_returns_no_answer():
    r = answer_question(CONTEXT, "What is the capital of France?")
    assert r["answer"] is None
    assert r["message"] is not None


def test_what_question_falls_back_to_best_sentence():
    r = answer_question(CONTEXT, "What did Shruti talk about?")
    assert r["answer"] is not None
    assert "NLP" in r["answer"]
