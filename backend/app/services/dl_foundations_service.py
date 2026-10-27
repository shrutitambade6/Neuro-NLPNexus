from app.algorithms.dl_foundations import (
    compute_loss,
    gradient_descent,
    neuron_forward,
    single_neuron_gradient,
)
from app.schemas.dl_foundations import (
    GradientDescentResponse,
    GradientDescentStepOut,
    GradientResponse,
    LossResponse,
    NeuronForwardResponse,
)


def run_neuron_forward(inputs: list[float], weights: list[float], bias: float, activation: str) -> NeuronForwardResponse:
    result = neuron_forward(inputs, weights, bias, activation)
    return NeuronForwardResponse(
        weighted_sum=result.weighted_sum,
        activated_output=result.activated_output,
        activation=result.activation,
        steps=result.steps,
    )


def run_compute_loss(y_pred: float, y_true: float, loss_type: str) -> LossResponse:
    result = compute_loss(y_pred, y_true, loss_type)
    return LossResponse(loss=result.loss, loss_type=result.loss_type, steps=result.steps)


def run_gradient(
    inputs: list[float], weights: list[float], bias: float, y_true: float, activation: str, loss_type: str
) -> GradientResponse:
    result = single_neuron_gradient(inputs, weights, bias, y_true, activation, loss_type)
    return GradientResponse(
        dl_dw=result.dL_dw,
        dl_db=result.dL_db,
        y_pred=result.y_pred,
        loss=result.loss,
        steps=result.steps,
    )


def run_gradient_descent(
    inputs: list[float],
    weights: list[float],
    bias: float,
    y_true: float,
    activation: str,
    loss_type: str,
    learning_rate: float,
    epochs: int,
) -> GradientDescentResponse:
    result = gradient_descent(inputs, weights, bias, y_true, activation, loss_type, learning_rate, epochs)
    return GradientDescentResponse(
        steps=[
            GradientDescentStepOut(epoch=s.epoch, weights=s.weights, bias=s.bias, y_pred=s.y_pred, loss=s.loss)
            for s in result.steps
        ],
        final_weights=result.final_weights,
        final_bias=result.final_bias,
        final_loss=result.final_loss,
    )
