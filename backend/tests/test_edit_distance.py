from app.algorithms.edit_distance import levenshtein


def test_identical_strings_have_zero_distance():
    result = levenshtein("kitten", "kitten")
    assert result.distance == 0
    assert all(op.op == "match" for op in result.operations)


def test_classic_kitten_sitting_example():
    # The textbook example: kitten -> sitting has edit distance 3.
    result = levenshtein("kitten", "sitting")
    assert result.distance == 3


def test_empty_source_is_all_insertions():
    result = levenshtein("", "cat")
    assert result.distance == 3
    assert all(op.op == "insert" for op in result.operations)


def test_empty_target_is_all_deletions():
    result = levenshtein("cat", "")
    assert result.distance == 3
    assert all(op.op == "delete" for op in result.operations)


def test_matrix_dimensions_and_corners():
    result = levenshtein("ab", "abc")
    assert len(result.matrix) == 3  # len(source) + 1
    assert len(result.matrix[0]) == 4  # len(target) + 1
    assert result.matrix[0] == [0, 1, 2, 3]
    assert [row[0] for row in result.matrix] == [0, 1, 2]


def test_operations_reconstruct_target_from_source():
    result = levenshtein("intention", "execution")
    # Applying the operation sequence in order should transform source into target.
    rebuilt = []
    for op in result.operations:
        if op.op == "match" or op.op == "substitute":
            rebuilt.append(op.target_char)
        elif op.op == "insert":
            rebuilt.append(op.target_char)
        # delete contributes nothing to the rebuilt target
    assert "".join(rebuilt) == "execution"
