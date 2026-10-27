"""
The activation functions used across NeuroNLP Nexus's Deep Learning labs,
kept in one place so every lab computes them exactly the same way —
DL Foundations' neuron calculators import their scalar math from here
rather than duplicating it. A "live graph" in the Activation Function
Visualizer is this same activate() function evaluated at many points, not
a separately drawn curve; softmax is handled separately since it's defined
over a whole vector, not one z at a time.
"""
import math

LEAKY_ALPHA = 0.01

SCALAR_ACTIVATIONS = ("sigmoid", "tanh", "relu", "leaky_relu", "linear")


class ActivationFunctionsError(ValueError):
    """Raised for invalid input to an activation-function calculation."""


def activate(z: float, name: str) -> float:
    if name == "sigmoid":
        # Guard against float overflow in exp() for very negative/positive z —
        # the mathematically correct limit is 0 or 1 either way.
        if z < -700:
            return 0.0
        if z > 700:
            return 1.0
        return 1.0 / (1.0 + math.exp(-z))
    if name == "tanh":
        return math.tanh(z)
    if name == "relu":
        return max(0.0, z)
    if name == "leaky_relu":
        return z if z > 0 else LEAKY_ALPHA * z
    if name == "linear":
        return z
    if name == "softmax":
        raise ActivationFunctionsError(
            "Softmax is defined over a whole vector of values, not a single z — use softmax() instead."
        )
    raise ActivationFunctionsError(
        f"Unknown activation '{name}'. Choose one of: {', '.join(SCALAR_ACTIVATIONS)}."
    )


def activate_derivative(z: float, name: str) -> float:
    """d(activation)/dz, evaluated at z — the real derivative, not an approximation."""
    if name == "sigmoid":
        s = activate(z, "sigmoid")
        return s * (1 - s)
    if name == "tanh":
        t = math.tanh(z)
        return 1 - t * t
    if name == "relu":
        return 1.0 if z > 0 else 0.0
    if name == "leaky_relu":
        return 1.0 if z > 0 else LEAKY_ALPHA
    if name == "linear":
        return 1.0
    if name == "softmax":
        raise ActivationFunctionsError(
            "Softmax's derivative is a full Jacobian matrix over the vector, not a single number — "
            "not computed here."
        )
    raise ActivationFunctionsError(
        f"Unknown activation '{name}'. Choose one of: {', '.join(SCALAR_ACTIVATIONS)}."
    )


def activation_curve(name: str, z_min: float, z_max: float, num_points: int) -> list[tuple[float, float]]:
    """Real (z, activate(z)) pairs across the requested range — literally the
    same activate() function called at each point, for the visualizer's graph."""
    if name not in SCALAR_ACTIVATIONS:
        raise ActivationFunctionsError(
            f"Unknown activation '{name}'. Choose one of: {', '.join(SCALAR_ACTIVATIONS)}."
        )
    if not (z_min < z_max):
        raise ActivationFunctionsError("z_min must be less than z_max.")
    if not (2 <= num_points <= 400):
        raise ActivationFunctionsError("num_points must be between 2 and 400.")

    step = (z_max - z_min) / (num_points - 1)
    return [(z_min + i * step, activate(z_min + i * step, name)) for i in range(num_points)]


def softmax(values: list[float]) -> list[float]:
    """Real softmax: exponentiate, normalize so the outputs sum to 1. Uses
    the standard max-subtraction trick for numerical stability (doesn't
    change the mathematical result, only avoids float overflow for large
    inputs)."""
    if not values:
        raise ActivationFunctionsError("Provide at least one value.")
    m = max(values)
    exps = [math.exp(v - m) for v in values]
    total = sum(exps)
    return [e / total for e in exps]
