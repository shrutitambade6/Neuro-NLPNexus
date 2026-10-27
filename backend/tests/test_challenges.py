import math

import pytest

from app.algorithms.challenges import (
    DL_CHALLENGE_SPECS,
    ChallengeError,
    check_answer,
    compute_dl_challenge_answer,
)
from app.algorithms.dl_foundations import neuron_forward


class TestComputeDlChallengeAnswer:
    def test_neuron_forward_matches_dl_foundations_directly(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-neuron-sigmoid")
        answer = compute_dl_challenge_answer(spec["prompt"])
        expected = neuron_forward([1, 2], [0.5, -0.5], 0.1, "sigmoid").activated_output
        assert answer == pytest.approx(expected, abs=1e-6)

    def test_activation_point_relu(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-activation-relu")
        assert compute_dl_challenge_answer(spec["prompt"]) == 0.0

    def test_softmax_sums_to_one(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-softmax-three")
        answer = compute_dl_challenge_answer(spec["prompt"])
        assert sum(answer) == pytest.approx(1.0, abs=1e-4)

    def test_convolution_shape(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-cnn-convolve")
        answer = compute_dl_challenge_answer(spec["prompt"])
        assert len(answer) == 3 and len(answer[0]) == 3

    def test_maxpool_hand_computation(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-cnn-maxpool")
        answer = compute_dl_challenge_answer(spec["prompt"])
        assert answer == [[6, 4], [8, 9]]

    def test_rnn_first_step_zero_hidden_matches_neuron_forward(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-rnn-first-step")
        answer = compute_dl_challenge_answer(spec["prompt"])
        expected = neuron_forward([1, 2], [0.5, -0.3], 0.2, "tanh").activated_output
        assert answer[0] == pytest.approx(expected, abs=1e-6)

    def test_attention_weight_identity_case(self):
        spec = next(s for s in DL_CHALLENGE_SPECS if s["slug"] == "dl-attention-weight")
        answer = compute_dl_challenge_answer(spec["prompt"])
        # embeddings [[1,0],[0,1]] with identity projections: token0.token0=1,
        # token0.token1=0, scaled by 1/sqrt(2); softmax([1/sqrt2, 0]) col 1
        scale = math.sqrt(2)
        e0, e1 = math.exp(1 / scale), math.exp(0 / scale)
        expected = e1 / (e0 + e1)
        assert answer == pytest.approx(expected, abs=1e-4)

    def test_unknown_type_rejected(self):
        with pytest.raises(ChallengeError):
            compute_dl_challenge_answer({"type": "not-a-real-type"})

    def test_every_spec_computes_without_error(self):
        for spec in DL_CHALLENGE_SPECS:
            compute_dl_challenge_answer(spec["prompt"])  # should not raise


class TestCheckAnswer:
    def test_scalar_within_tolerance(self):
        assert check_answer(0.731, 0.7304, tolerance=0.01) is True
        assert check_answer(0.5, 0.7304, tolerance=0.01) is False

    def test_scalar_accepts_string_number(self):
        assert check_answer("0.73", 0.7304, tolerance=0.01) is True

    def test_list_elementwise(self):
        assert check_answer([0.1, 0.2, 0.7], [0.099, 0.201, 0.700], tolerance=0.01) is True
        assert check_answer([0.1, 0.9, 0.7], [0.099, 0.201, 0.700], tolerance=0.01) is False

    def test_list_length_mismatch_rejected(self):
        assert check_answer([0.1, 0.2], [0.1, 0.2, 0.3]) is False

    def test_nested_list_matrix(self):
        assert check_answer([[6, 4], [8, 9]], [[6.001, 4.0], [8.0, 8.999]], tolerance=0.01) is True

    def test_non_numeric_submission_rejected_gracefully(self):
        assert check_answer("not a number", 0.5) is False
