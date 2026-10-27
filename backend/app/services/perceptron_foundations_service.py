from app.algorithms import perceptron_foundations as algo
from app.schemas.perceptron_foundations import (
    MPNeuronRequest,
    MPNeuronResponse,
    PerceptronForwardRequest,
    PerceptronForwardResponse,
    PLAStepRequest,
    PLAStepResponse,
    PLATrainRequest,
    PLATrainResponse,
    PLATrainStepOut,
    TruthTableResponse,
    TruthTableRow,
)


def run_mp_neuron(payload: MPNeuronRequest) -> MPNeuronResponse:
    result = algo.mp_neuron(payload.inputs, payload.weights, payload.threshold)
    return MPNeuronResponse(
        weighted_sum=result.weighted_sum,
        threshold=result.threshold,
        fired=result.fired,
        output=1 if result.fired else 0,
        steps=result.steps,
    )


def run_truth_table(gate: str) -> TruthTableResponse:
    preset = algo.GATE_PRESETS[gate]
    rows = algo.truth_table(gate)
    return TruthTableResponse(
        gate=gate,
        weights=preset["weights"],
        threshold=preset["threshold"],
        rows=[TruthTableRow(**r) for r in rows],
    )


def run_perceptron_forward(payload: PerceptronForwardRequest) -> PerceptronForwardResponse:
    result = algo.perceptron_forward(payload.inputs, payload.weights, payload.bias)
    return PerceptronForwardResponse(weighted_sum=result.weighted_sum, output=result.output, steps=result.steps)


def run_pla_step(payload: PLAStepRequest) -> PLAStepResponse:
    result = algo.perceptron_learning_step(
        payload.inputs, payload.weights, payload.bias, payload.target, payload.learning_rate
    )
    return PLAStepResponse(
        weighted_sum=result.weighted_sum,
        prediction=result.prediction,
        error=result.error,
        updated_weights=result.updated_weights,
        updated_bias=result.updated_bias,
        steps=result.steps,
    )


def run_pla_train(payload: PLATrainRequest) -> PLATrainResponse:
    training_data = [(ex.inputs, ex.target) for ex in payload.training_data]
    result = algo.perceptron_learning_train(
        training_data, payload.initial_weights, payload.initial_bias, payload.learning_rate, payload.max_epochs
    )
    return PLATrainResponse(
        history=[
            PLATrainStepOut(
                weighted_sum=s.weighted_sum,
                prediction=s.prediction,
                error=s.error,
                updated_weights=s.updated_weights,
                updated_bias=s.updated_bias,
                steps=s.steps,
            )
            for s in result.history
        ],
        final_weights=result.final_weights,
        final_bias=result.final_bias,
        converged=result.converged,
        epochs_run=result.epochs_run,
    )
