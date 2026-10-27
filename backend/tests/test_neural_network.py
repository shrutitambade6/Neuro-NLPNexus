import pytest

from app.algorithms.activation_functions import activate
from app.algorithms.dl_foundations import neuron_forward
from app.algorithms.neural_network import (
    LayerSpec,
    LayerWeights,
    NetworkSpec,
    NeuralNetworkError,
    forward_propagate,
    random_network,
)


# ---- random_network ----

def test_random_network_produces_correct_shape():
    net = random_network(3, [LayerSpec(size=4, activation="relu"), LayerSpec(size=2, activation="sigmoid")])
    assert net.input_size == 3
    assert len(net.layers) == 2
    assert len(net.layers[0].weights) == 4
    assert all(len(w) == 3 for w in net.layers[0].weights)  # first layer: 3 weights per neuron (matches input)
    assert len(net.layers[0].biases) == 4
    assert len(net.layers[1].weights) == 2
    assert all(len(w) == 4 for w in net.layers[1].weights)  # second layer: 4 weights per neuron (matches layer 1 size)


def test_random_network_weights_are_within_init_range():
    net = random_network(2, [LayerSpec(size=5, activation="tanh")])
    for neuron_weights in net.layers[0].weights:
        for w in neuron_weights:
            assert -1.0 <= w <= 1.0
    for b in net.layers[0].biases:
        assert -1.0 <= b <= 1.0


def test_random_network_same_seed_is_reproducible():
    net1 = random_network(2, [LayerSpec(size=3, activation="relu")], seed=42)
    net2 = random_network(2, [LayerSpec(size=3, activation="relu")], seed=42)
    assert net1.layers[0].weights == net2.layers[0].weights
    assert net1.layers[0].biases == net2.layers[0].biases


def test_random_network_no_seed_is_not_identical():
    net1 = random_network(2, [LayerSpec(size=3, activation="relu")])
    net2 = random_network(2, [LayerSpec(size=3, activation="relu")])
    # Astronomically unlikely to collide by chance across 6 real random floats.
    assert net1.layers[0].weights != net2.layers[0].weights


def test_random_network_rejects_too_many_layers():
    with pytest.raises(NeuralNetworkError):
        random_network(2, [LayerSpec(size=1, activation="relu")] * 10)


def test_random_network_rejects_too_many_neurons_in_a_layer():
    with pytest.raises(NeuralNetworkError):
        random_network(2, [LayerSpec(size=50, activation="relu")])


def test_random_network_rejects_unknown_activation():
    with pytest.raises(NeuralNetworkError):
        random_network(2, [LayerSpec(size=2, activation="gelu")])


def test_random_network_rejects_empty_layer_list():
    with pytest.raises(NeuralNetworkError):
        random_network(2, [])


# ---- forward_propagate ----

def test_forward_propagate_matches_hand_computed_single_layer_network():
    # A single layer of one neuron is exactly a single neuron — build it by
    # hand and check against a manually computed value.
    network = NetworkSpec(
        input_size=2,
        layers=[LayerWeights(weights=[[0.5, -1.0]], biases=[0.5], activation="sigmoid")],
    )
    result = forward_propagate(network, [1.0, 2.0])
    # z = 0.5*1 + (-1)*2 + 0.5 = -1
    assert result.layers[0].neurons[0].z == pytest.approx(-1.0)
    assert result.output[0] == pytest.approx(activate(-1.0, "sigmoid"))


def test_forward_propagate_one_layer_matches_dl_foundations_neuron_forward():
    # Cross-check against Stage 3's single-neuron module — a 1-layer,
    # 1-neuron network must compute exactly what neuron_forward computes
    # for the same weights/bias/activation, since it's the same math.
    inputs = [1.0, -2.0, 0.5]
    weights = [0.3, -0.7, 1.2]
    bias = 0.1
    network = NetworkSpec(
        input_size=3,
        layers=[LayerWeights(weights=[weights], biases=[bias], activation="tanh")],
    )
    net_result = forward_propagate(network, inputs)
    single = neuron_forward(inputs, weights, bias, "tanh")
    assert net_result.layers[0].neurons[0].z == pytest.approx(single.weighted_sum)
    assert net_result.output[0] == pytest.approx(single.activated_output)


def test_forward_propagate_multi_layer_shapes_and_chaining():
    network = NetworkSpec(
        input_size=2,
        layers=[
            LayerWeights(weights=[[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]], biases=[0.0, 0.0, 0.0], activation="relu"),
            LayerWeights(weights=[[1.0, 1.0, 1.0]], biases=[0.0], activation="linear"),
        ],
    )
    result = forward_propagate(network, [2.0, 3.0])
    # Layer 1 outputs: relu(2)=2, relu(3)=3, relu(5)=5
    assert [n.output for n in result.layers[0].neurons] == pytest.approx([2.0, 3.0, 5.0])
    # Layer 2 (linear, sums the 3 hidden outputs): 2+3+5 = 10
    assert result.output == pytest.approx([10.0])


def test_forward_propagate_rejects_wrong_input_count():
    network = NetworkSpec(input_size=3, layers=[LayerWeights(weights=[[1, 1, 1]], biases=[0], activation="relu")])
    with pytest.raises(NeuralNetworkError):
        forward_propagate(network, [1.0, 2.0])


def test_forward_propagate_rejects_mismatched_weight_dimensions():
    # First layer's neuron expects 2 weights (matching input_size=2) but only has 1.
    network = NetworkSpec(input_size=2, layers=[LayerWeights(weights=[[1.0]], biases=[0.0], activation="relu")])
    with pytest.raises(NeuralNetworkError):
        forward_propagate(network, [1.0, 2.0])


def test_forward_propagate_rejects_weights_biases_length_mismatch():
    network = NetworkSpec(
        input_size=2, layers=[LayerWeights(weights=[[1.0, 1.0], [1.0, 1.0]], biases=[0.0], activation="relu")]
    )
    with pytest.raises(NeuralNetworkError):
        forward_propagate(network, [1.0, 2.0])


def test_random_network_then_forward_propagate_round_trip():
    net = random_network(2, [LayerSpec(size=3, activation="relu"), LayerSpec(size=1, activation="sigmoid")], seed=7)
    result = forward_propagate(net, [1.0, -1.0])
    assert len(result.layers) == 2
    assert len(result.output) == 1
    assert 0.0 < result.output[0] < 1.0  # sigmoid output is always in (0, 1)
