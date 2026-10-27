"""
A small feedforward neural network — real forward propagation through an
arbitrary number of layers, each with its own size and activation
function, built out of the same neuron arithmetic (weighted sum + real
activation, via activation_functions.activate) as DL Foundations' single
neuron and the Activation Function Visualizer. Weights and biases are
randomly initialized — real random numbers, freshly generated on request,
optionally seeded for reproducibility — since this playground is about
visualizing how forward propagation actually flows through a network
structure, not about training one; gradient descent and training live in
DL Foundations' single-neuron labs.
"""
import random
from dataclasses import dataclass, field

from app.algorithms.activation_functions import SCALAR_ACTIVATIONS, activate

MAX_LAYERS = 6             # hidden + output layers (input layer isn't counted)
MAX_NEURONS_PER_LAYER = 8
MAX_INPUT_SIZE = 6
WEIGHT_INIT_RANGE = 1.0    # weights/biases drawn from Uniform(-1, 1)


class NeuralNetworkError(ValueError):
    """Raised for invalid input to a neural-network calculation."""


@dataclass
class LayerSpec:
    size: int
    activation: str


@dataclass
class LayerWeights:
    weights: list[list[float]]  # weights[j][i] = weight from previous-layer unit i to this layer's neuron j
    biases: list[float]
    activation: str


@dataclass
class NetworkSpec:
    input_size: int
    layers: list[LayerWeights]


def _validate_architecture(input_size: int, layer_specs: list[LayerSpec]) -> None:
    if not (1 <= input_size <= MAX_INPUT_SIZE):
        raise NeuralNetworkError(f"Input size must be between 1 and {MAX_INPUT_SIZE}.")
    if not layer_specs:
        raise NeuralNetworkError("Provide at least one layer (the output layer).")
    if len(layer_specs) > MAX_LAYERS:
        raise NeuralNetworkError(f"At most {MAX_LAYERS} layers (including the output layer) are supported here.")
    for spec in layer_specs:
        if not (1 <= spec.size <= MAX_NEURONS_PER_LAYER):
            raise NeuralNetworkError(f"Each layer must have between 1 and {MAX_NEURONS_PER_LAYER} neurons.")
        if spec.activation not in SCALAR_ACTIVATIONS:
            raise NeuralNetworkError(
                f"Unknown activation '{spec.activation}'. Choose one of: {', '.join(SCALAR_ACTIVATIONS)}."
            )


def random_network(input_size: int, layer_specs: list[LayerSpec], seed: int | None = None) -> NetworkSpec:
    """Builds a network of the given architecture with real, freshly
    randomized weights and biases (Uniform(-1, 1)) — the same architecture
    requested twice without a seed gets two genuinely different networks;
    with a seed, the same network every time (for reproducing a run)."""
    _validate_architecture(input_size, layer_specs)

    rng = random.Random(seed)
    layers: list[LayerWeights] = []
    prev_size = input_size
    for spec in layer_specs:
        weights = [
            [rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(prev_size)]
            for _ in range(spec.size)
        ]
        biases = [rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(spec.size)]
        layers.append(LayerWeights(weights=weights, biases=biases, activation=spec.activation))
        prev_size = spec.size

    return NetworkSpec(input_size=input_size, layers=layers)


def _validate_network_shape(network: NetworkSpec) -> None:
    """Defensive re-check of a network's internal consistency — the
    frontend round-trips a previously-generated network back to us
    (this backend is stateless), so a tampered or desynced payload must
    fail with a clear error rather than an obscure index crash."""
    if not (1 <= network.input_size <= MAX_INPUT_SIZE):
        raise NeuralNetworkError(f"Input size must be between 1 and {MAX_INPUT_SIZE}.")
    if not network.layers:
        raise NeuralNetworkError("Network must have at least one layer.")
    if len(network.layers) > MAX_LAYERS:
        raise NeuralNetworkError(f"At most {MAX_LAYERS} layers are supported here.")

    prev_size = network.input_size
    for idx, layer in enumerate(network.layers):
        if layer.activation not in SCALAR_ACTIVATIONS:
            raise NeuralNetworkError(
                f"Layer {idx + 1}: unknown activation '{layer.activation}'."
            )
        if len(layer.weights) != len(layer.biases):
            raise NeuralNetworkError(
                f"Layer {idx + 1}: {len(layer.weights)} neuron(s) of weights but {len(layer.biases)} bias(es)."
            )
        if not (1 <= len(layer.weights) <= MAX_NEURONS_PER_LAYER):
            raise NeuralNetworkError(f"Layer {idx + 1} must have between 1 and {MAX_NEURONS_PER_LAYER} neurons.")
        for neuron_weights in layer.weights:
            if len(neuron_weights) != prev_size:
                raise NeuralNetworkError(
                    f"Layer {idx + 1}: each neuron needs {prev_size} weight(s) "
                    f"(one per unit in the previous layer), got {len(neuron_weights)}."
                )
        prev_size = len(layer.weights)


@dataclass
class NeuronActivationRecord:
    z: float
    output: float


@dataclass
class LayerActivationRecord:
    activation: str
    neurons: list[NeuronActivationRecord] = field(default_factory=list)


@dataclass
class ForwardPropagationResult:
    input_values: list[float]
    layers: list[LayerActivationRecord]
    output: list[float]


def forward_propagate(network: NetworkSpec, inputs: list[float]) -> ForwardPropagationResult:
    """Real forward propagation: layer by layer, every neuron's weighted
    sum and activation is genuinely computed from the previous layer's real
    output (or the network's real input, for the first layer) — the same
    single-neuron arithmetic as DL Foundations, just repeated across a
    whole network."""
    _validate_network_shape(network)
    if len(inputs) != network.input_size:
        raise NeuralNetworkError(f"Expected {network.input_size} input value(s), got {len(inputs)}.")

    current: list[float] = list(inputs)
    layer_records: list[LayerActivationRecord] = []

    for layer in network.layers:
        neuron_records: list[NeuronActivationRecord] = []
        next_values: list[float] = []
        for neuron_weights, bias in zip(layer.weights, layer.biases):
            z = sum(w * x for w, x in zip(neuron_weights, current)) + bias
            out = activate(z, layer.activation)
            neuron_records.append(NeuronActivationRecord(z=z, output=out))
            next_values.append(out)
        layer_records.append(LayerActivationRecord(activation=layer.activation, neurons=neuron_records))
        current = next_values

    return ForwardPropagationResult(input_values=list(inputs), layers=layer_records, output=current)
