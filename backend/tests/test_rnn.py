import math

import pytest

from app.algorithms.dl_foundations import neuron_forward
from app.algorithms.rnn import (
    LstmWeights,
    RnnError,
    RnnWeights,
    lstm_forward,
    random_lstm_weights,
    random_rnn_weights,
    rnn_forward,
)


class TestRandomRnnWeights:
    def test_shapes(self):
        w = random_rnn_weights(3, 4, 2, seed=1)
        assert len(w.w_xh) == 4 and len(w.w_xh[0]) == 3
        assert len(w.w_hh) == 4 and len(w.w_hh[0]) == 4
        assert len(w.b_h) == 4
        assert len(w.w_hy) == 2 and len(w.w_hy[0]) == 4
        assert len(w.b_y) == 2

    def test_seeded_reproducible(self):
        a = random_rnn_weights(2, 3, 1, seed=7)
        b = random_rnn_weights(2, 3, 1, seed=7)
        assert a == b

    def test_unseeded_differs(self):
        a = random_rnn_weights(2, 3, 1)
        b = random_rnn_weights(2, 3, 1)
        assert a != b

    def test_dims_out_of_range_rejected(self):
        with pytest.raises(RnnError):
            random_rnn_weights(0, 3, 1)
        with pytest.raises(RnnError):
            random_rnn_weights(2, 100, 1)


class TestRnnForward:
    def test_single_step_zero_initial_hidden_matches_neuron_forward(self):
        # With h0 = 0, the first timestep's z_h has no real contribution
        # from w_hh @ h (it's all zeros), so each hidden unit's z should be
        # exactly the same weighted-sum arithmetic as a single DL
        # Foundations neuron with those w_xh weights and b_h bias.
        weights = RnnWeights(
            w_xh=[[0.5, -0.3, 0.2]], w_hh=[[0.9]], b_h=[0.1],
            w_hy=[[1.0]], b_y=[0.0],
        )
        x1 = [1.0, 2.0, -1.0]
        result = rnn_forward(weights, [x1], activation="tanh", output_activation="linear")
        expected_z = neuron_forward(x1, weights.w_xh[0], weights.b_h[0], "linear").weighted_sum
        assert result.steps[0].z_h[0] == pytest.approx(expected_z)
        assert result.steps[0].h[0] == pytest.approx(math.tanh(expected_z))

    def test_recurrence_actually_affects_second_step(self):
        weights = random_rnn_weights(2, 2, 1, seed=3)
        seq = [[1.0, 0.0], [1.0, 0.0]]
        result = rnn_forward(weights, seq, activation="tanh", output_activation="linear")
        # second step's z_h must differ from the first (same x, but h now
        # feeds back a nonzero previous hidden state) unless w_hh is all
        # zero, which a random seed essentially never produces
        assert result.steps[0].z_h != result.steps[1].z_h

    def test_softmax_output_sums_to_one(self):
        weights = random_rnn_weights(2, 3, 3, seed=5)
        result = rnn_forward(weights, [[1.0, -1.0], [0.5, 0.5]], activation="relu", output_activation="softmax")
        for step in result.steps:
            assert sum(step.y) == pytest.approx(1.0)

    def test_wrong_input_dim_rejected(self):
        weights = random_rnn_weights(2, 2, 1, seed=1)
        with pytest.raises(RnnError):
            rnn_forward(weights, [[1.0, 2.0, 3.0]], activation="tanh", output_activation="linear")

    def test_empty_sequence_rejected(self):
        weights = random_rnn_weights(2, 2, 1, seed=1)
        with pytest.raises(RnnError):
            rnn_forward(weights, [], activation="tanh", output_activation="linear")

    def test_final_hidden_matches_last_step(self):
        weights = random_rnn_weights(2, 3, 1, seed=9)
        seq = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
        result = rnn_forward(weights, seq, activation="tanh", output_activation="linear")
        assert result.final_hidden == result.steps[-1].h


class TestRandomLstmWeights:
    def test_shapes(self):
        w = random_lstm_weights(2, 3, seed=1)
        for wm, um, b in [(w.w_f, w.u_f, w.b_f), (w.w_i, w.u_i, w.b_i), (w.w_c, w.u_c, w.b_c), (w.w_o, w.u_o, w.b_o)]:
            assert len(wm) == 3 and len(wm[0]) == 2
            assert len(um) == 3 and len(um[0]) == 3
            assert len(b) == 3

    def test_seeded_reproducible(self):
        a = random_lstm_weights(2, 3, seed=11)
        b = random_lstm_weights(2, 3, seed=11)
        assert a == b


class TestLstmForward:
    def test_first_step_forget_gate_matches_neuron_forward_sigmoid(self):
        # At t=1, h0=c0=0, so the forget gate's z has no real contribution
        # from u_f @ h (all zero) — it should exactly match a single sigmoid
        # neuron on w_f[0]/b_f[0].
        w = LstmWeights(
            w_f=[[0.4, -0.2]], u_f=[[0.1]], b_f=[0.05],
            w_i=[[0.3, 0.1]], u_i=[[0.2]], b_i=[0.0],
            w_c=[[0.2, 0.2]], u_c=[[0.1]], b_c=[0.0],
            w_o=[[0.5, -0.5]], u_o=[[0.3]], b_o=[0.1],
        )
        x1 = [1.0, -1.0]
        result = lstm_forward(w, [x1])
        expected = neuron_forward(x1, w.w_f[0], w.b_f[0], "sigmoid").activated_output
        assert result.steps[0].forget_gate[0] == pytest.approx(expected)

    def test_cell_state_update_matches_hand_computation(self):
        # With f=i=1 (forced via huge positive bias so sigmoid saturates to
        # ~1) and c0=0, c_1 should be ~= candidate (tanh of its z).
        w = LstmWeights(
            w_f=[[0.0]], u_f=[[0.0]], b_f=[50.0],
            w_i=[[0.0]], u_i=[[0.0]], b_i=[50.0],
            w_c=[[1.0]], u_c=[[0.0]], b_c=[0.0],
            w_o=[[0.0]], u_o=[[0.0]], b_o=[50.0],
        )
        result = lstm_forward(w, [[0.5]])
        expected_candidate = math.tanh(0.5)
        assert result.steps[0].cell_state[0] == pytest.approx(expected_candidate, abs=1e-3)
        assert result.steps[0].hidden_state[0] == pytest.approx(math.tanh(expected_candidate), abs=1e-3)

    def test_gates_are_bounded(self):
        w = random_lstm_weights(2, 3, seed=4)
        result = lstm_forward(w, [[1.0, -1.0], [0.3, 0.7]])
        for step in result.steps:
            assert all(0.0 <= v <= 1.0 for v in step.forget_gate)
            assert all(0.0 <= v <= 1.0 for v in step.input_gate)
            assert all(0.0 <= v <= 1.0 for v in step.output_gate)
            assert all(-1.0 <= v <= 1.0 for v in step.candidate)

    def test_final_hidden_and_cell_match_last_step(self):
        w = random_lstm_weights(2, 2, seed=6)
        seq = [[1.0, 0.0], [0.0, 1.0]]
        result = lstm_forward(w, seq)
        assert result.final_hidden == result.steps[-1].hidden_state
        assert result.final_cell == result.steps[-1].cell_state

    def test_wrong_input_dim_rejected(self):
        w = random_lstm_weights(2, 2, seed=1)
        with pytest.raises(RnnError):
            lstm_forward(w, [[1.0, 2.0, 3.0]])
