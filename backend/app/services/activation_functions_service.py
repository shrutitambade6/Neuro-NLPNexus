import math

from app.algorithms.activation_functions import (
    activate,
    activate_derivative,
    activation_curve,
    softmax,
)
from app.schemas.activation_functions import (
    ActivationCurvePoint,
    ActivationCurveResponse,
    ActivationPointResponse,
    SoftmaxResponse,
)


def run_activation_curve(activation: str, z_min: float, z_max: float, num_points: int) -> ActivationCurveResponse:
    points = activation_curve(activation, z_min, z_max, num_points)
    return ActivationCurveResponse(
        activation=activation,
        points=[ActivationCurvePoint(z=z, y=y) for z, y in points],
    )


def run_activation_point(activation: str, z: float) -> ActivationPointResponse:
    y = activate(z, activation)
    derivative = activate_derivative(z, activation)
    return ActivationPointResponse(activation=activation, z=z, y=y, derivative=derivative)


def run_softmax(values: list[float]) -> SoftmaxResponse:
    output = softmax(values)
    exp_terms = ", ".join(f"e^{v:g}" for v in values)
    steps = [
        f"exponentiate: [{exp_terms}]",
        f"sum of exponentials = {sum(math.exp(v - max(values)) for v in values):g} (after subtracting max {max(values):g} for numerical stability)",
        "normalize: each exponentiated value ÷ the sum",
        f"output = [{', '.join(f'{o:.4f}' for o in output)}]",
    ]
    return SoftmaxResponse(input=values, output=output, steps=steps)
