import math

import pytest

from app.algorithms.attention import (
    AttentionError,
    ProjectionWeights,
    random_projection_weights,
    scaled_dot_product_attention,
)


class TestRandomProjectionWeights:
    def test_shapes(self):
        w = random_projection_weights(dim=3, d_k=2, d_v=4, seed=1)
        assert len(w.w_q) == 3 and len(w.w_q[0]) == 2
        assert len(w.w_k) == 3 and len(w.w_k[0]) == 2
        assert len(w.w_v) == 3 and len(w.w_v[0]) == 4

    def test_seeded_reproducible(self):
        a = random_projection_weights(3, 2, 2, seed=9)
        b = random_projection_weights(3, 2, 2, seed=9)
        assert a == b

    def test_unseeded_differs(self):
        a = random_projection_weights(3, 2, 2)
        b = random_projection_weights(3, 2, 2)
        assert a != b

    def test_dim_out_of_range_rejected(self):
        with pytest.raises(AttentionError):
            random_projection_weights(dim=1, d_k=2, d_v=2)
        with pytest.raises(AttentionError):
            random_projection_weights(dim=8, d_k=2, d_v=2)


class TestScaledDotProductAttention:
    def test_identity_projections_reduce_to_plain_self_attention(self):
        # Identity Q/K/V projections mean Q=K=V=embeddings exactly, so this
        # checks the raw attention equation against embeddings directly,
        # independent of any projection arithmetic.
        embeddings = [[1.0, 0.0], [0.0, 1.0]]
        identity = [[1.0, 0.0], [0.0, 1.0]]
        weights = ProjectionWeights(w_q=identity, w_k=identity, w_v=identity)
        result = scaled_dot_product_attention(embeddings, weights)
        assert result.queries == embeddings
        assert result.keys == embeddings
        assert result.values == embeddings

    def test_raw_scores_match_manual_dot_products(self):
        embeddings = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
        identity = [[1.0, 0.0], [0.0, 1.0]]
        weights = ProjectionWeights(w_q=identity, w_k=identity, w_v=identity)
        result = scaled_dot_product_attention(embeddings, weights)
        # raw_scores[i][j] = embeddings[i] . embeddings[j]
        for i in range(3):
            for j in range(3):
                expected = sum(a * b for a, b in zip(embeddings[i], embeddings[j]))
                assert result.raw_scores[i][j] == pytest.approx(expected)

    def test_scaling_divides_by_sqrt_dk(self):
        embeddings = [[2.0, 0.0], [0.0, 2.0]]
        identity = [[1.0, 0.0], [0.0, 1.0]]
        weights = ProjectionWeights(w_q=identity, w_k=identity, w_v=identity)
        result = scaled_dot_product_attention(embeddings, weights)
        d_k = 2
        for i in range(2):
            for j in range(2):
                assert result.scaled_scores[i][j] == pytest.approx(result.raw_scores[i][j] / math.sqrt(d_k))

    def test_attention_weights_are_real_softmax_rows_summing_to_one(self):
        weights = random_projection_weights(3, 2, 2, seed=4)
        embeddings = [[1.0, 0.5, -1.0], [0.2, -0.3, 0.8], [0.0, 1.0, 1.0]]
        result = scaled_dot_product_attention(embeddings, weights)
        for row in result.attention_weights:
            assert sum(row) == pytest.approx(1.0)
            assert all(0.0 <= p <= 1.0 for p in row)

    def test_output_is_real_weighted_sum_of_values(self):
        weights = random_projection_weights(2, 2, 2, seed=2)
        embeddings = [[1.0, 0.0], [0.0, 1.0]]
        result = scaled_dot_product_attention(embeddings, weights)
        for i, out_row in enumerate(result.output):
            manual = [
                sum(result.attention_weights[i][j] * result.values[j][d] for j in range(len(result.values)))
                for d in range(len(result.values[0]))
            ]
            for a, b in zip(out_row, manual):
                assert a == pytest.approx(b)

    def test_uniform_scores_give_uniform_attention(self):
        # All-zero Q/K projections -> every raw score is 0 -> softmax is
        # uniform over the sequence, so the output is a plain average of V.
        embeddings = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]
        zeros = [[0.0, 0.0], [0.0, 0.0]]
        identity = [[1.0, 0.0], [0.0, 1.0]]
        weights = ProjectionWeights(w_q=zeros, w_k=zeros, w_v=identity)
        result = scaled_dot_product_attention(embeddings, weights)
        for row in result.attention_weights:
            for p in row:
                assert p == pytest.approx(1 / 3)
        expected_avg = [sum(col) / 3 for col in zip(*embeddings)]
        for out_row in result.output:
            for a, b in zip(out_row, expected_avg):
                assert a == pytest.approx(b)

    def test_seq_len_out_of_range_rejected(self):
        weights = random_projection_weights(2, 2, 2, seed=1)
        with pytest.raises(AttentionError):
            scaled_dot_product_attention([[1.0, 2.0]], weights)  # only 1 token

    def test_mismatched_projection_dim_rejected(self):
        weights = random_projection_weights(3, 2, 2, seed=1)
        with pytest.raises(AttentionError):
            scaled_dot_product_attention([[1.0, 2.0], [3.0, 4.0]], weights)  # dim=2, weights expect dim=3

    def test_q_k_dimension_mismatch_rejected(self):
        bad_weights = ProjectionWeights(w_q=[[1.0, 0.0], [0.0, 1.0]], w_k=[[1.0], [0.0]], w_v=[[1.0, 0.0], [0.0, 1.0]])
        with pytest.raises(AttentionError):
            scaled_dot_product_attention([[1.0, 0.0], [0.0, 1.0]], bad_weights)
