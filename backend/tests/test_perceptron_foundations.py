"""
Tests app.algorithms.perceptron_foundations against the EXACT numeric
examples in the user's uploaded chap_01.docx (Module 1), extracted
including its embedded Word equations (not just visible text). These
aren't just sanity checks — they're the proof that the interactive
Module 1 lab reproduces the uploaded syllabus, not an invented one.
"""
import pytest

from app.algorithms.perceptron_foundations import (
    GATE_PRESETS,
    PerceptronFoundationsError,
    mp_neuron,
    perceptron_forward,
    perceptron_learning_step,
    perceptron_learning_train,
    step_function,
    truth_table,
)


def test_step_function_matches_doc_definition():
    assert step_function(2.0) == 1
    assert step_function(0.0) == 1  # z >= threshold, threshold defaults to 0
    assert step_function(-0.1) == 0


def test_mp_neuron_and_gate_example_section_1_5():
    # chap_01 1.5: x1=1, x2=1, w1=1, w2=1, threshold=2 -> S=2, fires (y=1)
    result = mp_neuron([1, 1], [1, 1], 2)
    assert result.weighted_sum == 2
    assert result.fired is True


def test_mp_neuron_and_gate_does_not_fire_below_threshold():
    result = mp_neuron([1, 0], [1, 1], 2)
    assert result.weighted_sum == 1
    assert result.fired is False


def test_mp_neuron_rejects_mismatched_lengths():
    with pytest.raises(PerceptronFoundationsError):
        mp_neuron([1, 1], [1], 2)


def test_mp_neuron_rejects_empty_inputs():
    with pytest.raises(PerceptronFoundationsError):
        mp_neuron([], [], 2)


@pytest.mark.parametrize(
    "inputs,expected",
    [([0, 0], 0), ([0, 1], 0), ([1, 0], 0), ([1, 1], 1)],
)
def test_and_gate_truth_table_matches_doc_table_2_3(inputs, expected):
    # chap_01 2.3 AND logic: w=[1,1], threshold=2
    preset = GATE_PRESETS["AND"]
    result = mp_neuron(inputs, preset["weights"], preset["threshold"])
    assert (1 if result.fired else 0) == expected


@pytest.mark.parametrize(
    "inputs,expected",
    [([0, 0], 0), ([0, 1], 1), ([1, 0], 1), ([1, 1], 1)],
)
def test_or_gate_truth_table_matches_doc_section_2_4(inputs, expected):
    preset = GATE_PRESETS["OR"]
    result = mp_neuron(inputs, preset["weights"], preset["threshold"])
    assert (1 if result.fired else 0) == expected


@pytest.mark.parametrize("inputs,expected", [([0], 1), ([1], 0)])
def test_not_gate_matches_doc_section_2_5(inputs, expected):
    preset = GATE_PRESETS["NOT"]
    result = mp_neuron(inputs, preset["weights"], preset["threshold"])
    assert (1 if result.fired else 0) == expected


def test_truth_table_and_matches_doc_table_exactly():
    rows = truth_table("AND")
    as_dict = {tuple(r["inputs"]): r["output"] for r in rows}
    assert as_dict == {(0, 0): 0, (0, 1): 0, (1, 0): 0, (1, 1): 1}


def test_truth_table_rejects_unknown_gate():
    with pytest.raises(PerceptronFoundationsError):
        truth_table("XOR")  # XOR cannot be realized by a single M-P neuron — chap_01 6.3


def test_perceptron_forward_example_section_3_6():
    # chap_01 3.6: w=[0.5,0.5], b=-0.7, x=[1,1] -> z=0.3, y=1
    result = perceptron_forward([1, 1], [0.5, 0.5], -0.7)
    assert result.weighted_sum == pytest.approx(0.3)
    assert result.output == 1


def test_perceptron_forward_rejects_mismatched_lengths():
    with pytest.raises(PerceptronFoundationsError):
        perceptron_forward([1, 1, 1], [0.5, 0.5], 0.0)


def test_pla_step_matches_doc_numeric_example_section_4_4():
    # chap_01 4.4: x=[1,1], t=1, w=[0.2,0.3], b=-0.7, lr=0.1
    # -> z=-0.2, y=0, e=1, w1_new=0.3, w2_new=0.4, b_new=-0.6
    result = perceptron_learning_step(
        inputs=[1, 1], weights=[0.2, 0.3], bias=-0.7, target=1, learning_rate=0.1
    )
    assert result.weighted_sum == pytest.approx(-0.2)
    assert result.prediction == 0
    assert result.error == 1
    assert result.updated_weights == pytest.approx([0.3, 0.4])
    assert result.updated_bias == pytest.approx(-0.6)


def test_pla_step_no_update_when_prediction_already_correct():
    # target already matches prediction -> error 0 -> weights unchanged
    result = perceptron_learning_step(inputs=[1, 1], weights=[1.0, 1.0], bias=0.0, target=1, learning_rate=0.5)
    assert result.error == 0
    assert result.updated_weights == pytest.approx([1.0, 1.0])
    assert result.updated_bias == pytest.approx(0.0)


def test_pla_step_rejects_invalid_target():
    with pytest.raises(PerceptronFoundationsError):
        perceptron_learning_step(inputs=[1], weights=[1.0], bias=0.0, target=2, learning_rate=0.1)


def test_pla_train_converges_on_and_gate():
    # AND is linearly separable (chap_01 4.5) — PLA must converge.
    training_data = [([0, 0], 0), ([0, 1], 0), ([1, 0], 0), ([1, 1], 1)]
    result = perceptron_learning_train(
        training_data, initial_weights=[0.0, 0.0], initial_bias=0.0, learning_rate=0.1, max_epochs=50
    )
    assert result.converged is True
    # Verify the FINAL learned weights genuinely solve AND for every case —
    # not just that the loop claims convergence.
    from app.algorithms.perceptron_foundations import perceptron_forward as _forward

    for inputs, target in training_data:
        out = _forward(inputs, result.final_weights, result.final_bias)
        assert out.output == target


def test_pla_train_never_converges_on_xor_within_reasonable_epochs():
    # XOR is NOT linearly separable (chap_01 4.5/6.3) — a single perceptron
    # must never converge on it, no matter how long it trains. This is the
    # exact limitation that historically motivated MLPs (chap_01 section 5).
    training_data = [([0, 0], 0), ([0, 1], 1), ([1, 0], 1), ([1, 1], 0)]
    result = perceptron_learning_train(
        training_data, initial_weights=[0.0, 0.0], initial_bias=0.0, learning_rate=0.1, max_epochs=100
    )
    assert result.converged is False


def test_pla_train_rejects_empty_training_data():
    with pytest.raises(PerceptronFoundationsError):
        perceptron_learning_train([], [0.0], 0.0, 0.1)


def test_pla_train_caps_epochs_at_max():
    training_data = [([0, 0], 0), ([0, 1], 1), ([1, 0], 1), ([1, 1], 0)]  # XOR, never converges
    result = perceptron_learning_train(
        training_data, initial_weights=[0.0, 0.0], initial_bias=0.0, learning_rate=0.1, max_epochs=500
    )
    assert result.epochs_run <= 100  # MAX_PLA_EPOCHS hard cap
