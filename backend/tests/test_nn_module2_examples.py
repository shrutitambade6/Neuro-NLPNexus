"""
Tests app.algorithms.nn_module2_examples against the numbers in the
user's uploaded Neural_network_chap-2.docx (Module 2) — including the
network diagram's own labeled weights, extracted from an embedded image
since Word doesn't store diagram labels as searchable text.
"""
import math

import pytest

from app.algorithms.nn_module2_examples import (
    DEFAULT_BACKPROP_NETWORK,
    NNModule2Error,
    backprop_step,
    backprop_train,
    classify_email,
)


def test_email_classification_matches_doc_example_exactly():
    # nn_chap2 "Example of Email Classification": free=1, win=0, offer=1
    result = classify_email([1, 0, 1])
    assert result.h1_weighted_sum == pytest.approx(0.8)
    assert result.h1_output == pytest.approx(0.8)  # ReLU(0.8) = 0.8
    assert result.h2_weighted_sum == pytest.approx(-0.1)
    assert result.h2_output == pytest.approx(0.0)  # ReLU(-0.1) = 0
    assert result.output_weighted_sum == pytest.approx(0.56)
    assert result.output_probability == pytest.approx(0.6365, abs=0.001)  # doc: "approximately 0.636"
    assert result.is_spam is True


def test_email_classification_all_keywords_absent_is_not_spam():
    result = classify_email([0, 0, 0])
    assert result.output_weighted_sum == 0.0
    assert result.output_probability == pytest.approx(0.5)
    assert result.is_spam is False  # 0.5 is not strictly > 0.5


def test_email_classification_rejects_wrong_input_count():
    with pytest.raises(NNModule2Error):
        classify_email([1, 0])


def test_email_classification_rejects_wrong_weight_length():
    with pytest.raises(NNModule2Error):
        classify_email([1, 0, 1], h1_weights=[0.1, 0.2])


def test_backprop_step_forward_pass_matches_doc_diagram_network():
    # Network diagram (extracted from the embedded image): x1=0.35, x2=0.7,
    # w13=w23=0.2, w14=w24=0.3, w35=0.3, w45=0.9. Doc rounds intermediates
    # to 2dp (a1=0.21 -> y3~=0.56), so we check the doc's own numbers to a
    # loose tolerance that accounts for its rounding, and check our own
    # full-precision self-consistency exactly.
    result = backprop_step(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK)

    assert result.a3 == pytest.approx(0.21)  # exact: no rounding needed for a linear combination
    assert result.a4 == pytest.approx(0.315)
    # y3 = sigmoid(0.21) computed at full precision — verify independently
    assert result.y3 == pytest.approx(1 / (1 + math.exp(-0.21)))
    assert result.y4 == pytest.approx(1 / (1 + math.exp(-0.315)))
    # Doc's rounded worked answer was y3~=0.56, y4~=0.59 (used loose rounding) — full precision lands close
    assert result.y3 == pytest.approx(0.56, abs=0.01)
    assert result.y4 == pytest.approx(0.58, abs=0.02)
    # Final prediction should be in the same ballpark as the doc's y5~=0.67
    assert result.y5 == pytest.approx(0.67, abs=0.02)
    # Error should be negative (prediction overshoots the 0.5 target), matching the doc
    assert result.error < 0
    assert result.error == pytest.approx(-0.17, abs=0.02)


def test_backprop_step_gradient_signs_match_doc_direction():
    # The doc's own worked deltas are all negative (error is negative);
    # our full-precision computation must have the same signs.
    result = backprop_step(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK)
    assert result.delta5 < 0
    assert result.delta3 < 0
    assert result.delta4 < 0


def test_backprop_step_weight_updates_move_toward_doc_direction():
    # Doc: w45 (hidden->output, larger weight 0.9) decreases toward
    # ~0.878; w13 (input->hidden) decreases only very slightly toward
    # ~0.199 (from 0.2). Verify the direction and rough magnitude.
    result = backprop_step(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK)
    assert result.updated_network.w45 < DEFAULT_BACKPROP_NETWORK.w45
    assert result.updated_network.w45 == pytest.approx(0.878, abs=0.01)
    assert result.updated_network.w13 < DEFAULT_BACKPROP_NETWORK.w13
    assert result.updated_network.w13 == pytest.approx(0.199, abs=0.001)


def test_backprop_step_is_a_pure_function_of_its_inputs():
    r1 = backprop_step(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK)
    r2 = backprop_step(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK)
    assert r1.y5 == r2.y5
    assert r1.updated_network.w45 == r2.updated_network.w45


def test_backprop_train_reduces_error_over_many_real_steps():
    # The textbook shows only ONE hand-worked iteration and says the
    # process "continues until the desired output is reached" — this
    # verifies that claim is actually true when the same network is
    # really iterated, not just asserted.
    result = backprop_train(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK, num_steps=200)
    assert len(result.history) == 200
    assert abs(result.final_error) < abs(result.history[0].error)
    assert abs(result.final_output - 0.5) < 0.05  # genuinely converges close to the target


def test_backprop_train_history_is_chained_not_repeated():
    # Each step must start from the PREVIOUS step's updated weights —
    # catches an implementation bug where the same starting network is
    # reused every iteration instead of actually training. Re-derive step
    # 2 independently from step 1's updated_network and confirm it
    # matches what backprop_train actually recorded.
    result = backprop_train(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK, num_steps=3)
    expected_step2 = backprop_step(0.35, 0.7, 0.5, 1.0, result.history[0].updated_network)
    assert result.history[1].a3 == pytest.approx(expected_step2.a3)
    assert result.history[1].y5 == pytest.approx(expected_step2.y5)
    assert result.history[1].updated_network.w45 == pytest.approx(expected_step2.updated_network.w45)


def test_backprop_train_caps_at_max_steps():
    result = backprop_train(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK, num_steps=10000)
    assert len(result.history) == 500  # MAX_BACKPROP_STEPS


def test_backprop_train_rejects_zero_steps():
    with pytest.raises(NNModule2Error):
        backprop_train(0.35, 0.7, 0.5, 1.0, DEFAULT_BACKPROP_NETWORK, num_steps=0)
