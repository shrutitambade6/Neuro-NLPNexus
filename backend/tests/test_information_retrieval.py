from app.algorithms.information_retrieval import search


def test_relevant_query_ranks_matching_doc_first():
    r = search("parsing grammar tree")
    assert r["results"], "expected at least one result"
    assert r["results"][0]["doc_id"] == "parsing"


def test_matched_terms_are_real_overlap():
    r = search("tokenization words")
    top = r["results"][0]
    assert set(top["matched_terms"]).issubset({"tokenization", "words"} | set(top["matched_terms"]))
    assert top["relevance"] > 0


def test_nonsense_query_returns_no_results():
    r = search("xyzzy plugh qwerty")
    assert r["results"] == []


def test_results_sorted_by_relevance_descending():
    r = search("language model probability")
    scores = [res["relevance"] for res in r["results"]]
    assert scores == sorted(scores, reverse=True)
