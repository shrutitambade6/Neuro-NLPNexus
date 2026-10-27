from app.algorithms.pipeline import compare_pipelines, run_pipeline


def test_run_pipeline_tokenize_only():
    result = run_pipeline("The Cats Sat", "whitespace", [])
    assert result["final_tokens"] == ["The", "Cats", "Sat"]
    assert len(result["trace"]) == 1


def test_run_pipeline_lowercase_and_stem():
    # Cross-verified against nltk.stem.PorterStemmer(mode=ORIGINAL_ALGORITHM):
    # "are" really does stem to "ar" under the classic 1980 algorithm.
    result = run_pipeline("The Cats are Running", "whitespace", ["lowercase", "stem"])
    assert result["final_tokens"] == ["the", "cat", "ar", "run"]
    assert len(result["trace"]) == 3  # tokenize + lowercase + stem


def test_run_pipeline_remove_stopwords():
    result = run_pipeline("the cat is on the mat", "whitespace", ["lowercase", "remove_stopwords"])
    assert "the" not in result["final_tokens"]
    assert "is" not in result["final_tokens"]
    assert "cat" in result["final_tokens"]
    assert "mat" in result["final_tokens"]


def test_run_pipeline_unknown_stage_raises():
    try:
        run_pipeline("hello", "whitespace", ["not_a_real_stage"])
        assert False, "expected ValueError"
    except ValueError as e:
        assert "not_a_real_stage" in str(e)


def test_run_pipeline_unknown_tokenizer_raises():
    try:
        run_pipeline("hello", "not_a_tokenizer", [])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_compare_pipelines_identical_texts_are_jaccard_one():
    result = compare_pipelines("the cat sat", "the cat sat", "whitespace", ["lowercase"])
    assert result["jaccard"]["jaccard"] == 1.0


def test_compare_pipelines_stemming_increases_similarity():
    # "running" vs "runs" only match after stemming reduces both toward "run".
    without_stem = compare_pipelines("running fast", "runs fast", "whitespace", ["lowercase"])
    with_stem = compare_pipelines("running fast", "runs fast", "whitespace", ["lowercase", "stem"])
    assert with_stem["jaccard"]["jaccard"] >= without_stem["jaccard"]["jaccard"]
