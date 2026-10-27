from app.algorithms.neural_network import (
    LayerSpec,
    LayerWeights,
    NetworkSpec,
    forward_propagate,
    random_network,
)
from app.schemas.neural_network import (
    ForwardPropagationResponse,
    LayerActivationOut,
    LayerWeightsIO,
    NeuronActivationOut,
    RandomNetworkResponse,
)


def run_random_network(input_size: int, layers, seed: int | None) -> RandomNetworkResponse:
    specs = [LayerSpec(size=l.size, activation=l.activation) for l in layers]
    network = random_network(input_size, specs, seed)
    return RandomNetworkResponse(
        input_size=network.input_size,
        layers=[
            LayerWeightsIO(weights=layer.weights, biases=layer.biases, activation=layer.activation)
            for layer in network.layers
        ],
    )


def run_forward_propagation(input_size: int, layers, inputs: list[float]) -> ForwardPropagationResponse:
    network = NetworkSpec(
        input_size=input_size,
        layers=[
            LayerWeights(weights=l.weights, biases=l.biases, activation=l.activation)
            for l in layers
        ],
    )
    result = forward_propagate(network, inputs)
    return ForwardPropagationResponse(
        input_values=result.input_values,
        layers=[
            LayerActivationOut(
                activation=layer.activation,
                neurons=[NeuronActivationOut(z=n.z, output=n.output) for n in layer.neurons],
            )
            for layer in result.layers
        ],
        output=result.output,
    )
