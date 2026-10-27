"""
Convolutional Neural Network Lab — real 2D convolution, real pooling, and a
real dense classification head, chained into one pipeline: Image ->
Convolution -> Feature Map -> Activation -> Pooling -> Flatten -> Dense ->
Classification. Every stage is genuinely computed from the grid/kernel/
weights given (valid convolution, real max/average pooling arithmetic, a
real weighted sum + activation for the dense layer, real softmax over the
class scores) — nothing here is a pre-rendered illustration of what a CNN
"would" do. Kept intentionally small (a hand-sized grid, a 2D or 3D kernel)
so a person can trace every multiply-and-add by hand and check the backend
against their own arithmetic, the same "small enough to verify by hand"
scope as DL Foundations' single neuron.

Reuses the shared pointwise activation math (activate/softmax) from
activation_functions.py rather than reimplementing it, the same
"compose, don't duplicate" rule the Neural Network Playground already
follows for its own dense-style layers.
"""
import random
from dataclasses import dataclass

from app.algorithms.activation_functions import (
    ActivationFunctionsError,
    SCALAR_ACTIVATIONS,
    activate,
    softmax,
)

MIN_IMAGE_SIZE = 4
MAX_IMAGE_SIZE = 10
MIN_KERNEL_SIZE = 2
MAX_KERNEL_SIZE = 5
MAX_POOL_SIZE = 4
MAX_DENSE_OUTPUTS = 6
WEIGHT_INIT_RANGE = 1.0

POOL_TYPES = ("max", "avg")

# Well-known, hand-checkable preset kernels — real, standard image-processing
# kernels (not invented for this project), so a student can look one up
# independently and confirm the feature map it produces makes sense.
PRESET_KERNELS: dict[str, list[list[float]]] = {
    "identity": [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
    "edge_detect": [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
    "sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    "box_blur": [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
    "emboss": [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
    "vertical_edges": [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    "horizontal_edges": [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
}


class CnnError(ValueError):
    """Raised for invalid input to a CNN-lab calculation."""


def _rows_cols(matrix: list[list[float]]) -> tuple[int, int]:
    if not matrix or not matrix[0]:
        raise CnnError("Grid must have at least one row and one column.")
    n_cols = len(matrix[0])
    for row in matrix:
        if len(row) != n_cols:
            raise CnnError("Every row of the grid must have the same number of columns.")
    return len(matrix), n_cols


def _validate_image(image: list[list[float]]) -> tuple[int, int]:
    h, w = _rows_cols(image)
    if not (MIN_IMAGE_SIZE <= h <= MAX_IMAGE_SIZE) or not (MIN_IMAGE_SIZE <= w <= MAX_IMAGE_SIZE):
        raise CnnError(
            f"Image must be between {MIN_IMAGE_SIZE}x{MIN_IMAGE_SIZE} and "
            f"{MAX_IMAGE_SIZE}x{MAX_IMAGE_SIZE}, got {h}x{w}."
        )
    return h, w


def _validate_kernel(kernel: list[list[float]]) -> tuple[int, int]:
    kh, kw = _rows_cols(kernel)
    if kh != kw:
        raise CnnError(f"Kernel must be square, got {kh}x{kw}.")
    if not (MIN_KERNEL_SIZE <= kh <= MAX_KERNEL_SIZE):
        raise CnnError(f"Kernel size must be between {MIN_KERNEL_SIZE} and {MAX_KERNEL_SIZE}, got {kh}.")
    return kh, kw


def convolve2d(image: list[list[float]], kernel: list[list[float]], stride: int = 1) -> list[list[float]]:
    """Real 2D "valid" convolution (technically cross-correlation, the
    convention every deep-learning framework actually uses despite calling
    it "convolution"): no padding, the kernel only ever slides over
    positions that are fully inside the image. Every output cell is a real
    sum of kernel-weight × image-value products."""
    h, w = _validate_image(image)
    kh, kw = _validate_kernel(kernel)
    if not (1 <= stride <= 3):
        raise CnnError("Stride must be between 1 and 3.")
    if kh > h or kw > w:
        raise CnnError(f"Kernel ({kh}x{kw}) can't be larger than the image ({h}x{w}).")

    out_h = (h - kh) // stride + 1
    out_w = (w - kw) // stride + 1
    if out_h < 1 or out_w < 1:
        raise CnnError("This kernel size and stride leave no valid position on the image.")

    feature_map: list[list[float]] = []
    for oy in range(out_h):
        row: list[float] = []
        for ox in range(out_w):
            top, left = oy * stride, ox * stride
            total = 0.0
            for ky in range(kh):
                for kx in range(kw):
                    total += image[top + ky][left + kx] * kernel[ky][kx]
            row.append(total)
        feature_map.append(row)
    return feature_map


def apply_activation2d(matrix: list[list[float]], activation: str) -> list[list[float]]:
    """The same shared activate() function from activation_functions.py,
    applied element-by-element to every cell of a feature map — genuinely
    the identical pointwise math DL Foundations and the Neural Network
    Playground use, just applied across a grid instead of one z."""
    if activation not in SCALAR_ACTIVATIONS:
        raise CnnError(f"Unknown activation '{activation}'. Choose one of: {', '.join(SCALAR_ACTIVATIONS)}.")
    try:
        return [[activate(v, activation) for v in row] for row in matrix]
    except ActivationFunctionsError as exc:
        raise CnnError(str(exc)) from exc


def pool2d(matrix: list[list[float]], pool_type: str, size: int, stride: int) -> list[list[float]]:
    """Real max- or average-pooling: each output cell is the genuine
    max (or mean) of a real size x size window of the input — a real
    downsampling computation, not a resize/interpolation."""
    if pool_type not in POOL_TYPES:
        raise CnnError(f"Unknown pool type '{pool_type}'. Choose one of: {', '.join(POOL_TYPES)}.")
    h, w = _rows_cols(matrix)
    if not (1 <= size <= MAX_POOL_SIZE):
        raise CnnError(f"Pool size must be between 1 and {MAX_POOL_SIZE}.")
    if not (1 <= stride <= MAX_POOL_SIZE):
        raise CnnError(f"Pool stride must be between 1 and {MAX_POOL_SIZE}.")
    if size > h or size > w:
        raise CnnError(f"Pool window ({size}x{size}) can't be larger than the feature map ({h}x{w}).")

    out_h = (h - size) // stride + 1
    out_w = (w - size) // stride + 1
    if out_h < 1 or out_w < 1:
        raise CnnError("This pool size and stride leave no valid position on the feature map.")

    pooled: list[list[float]] = []
    for oy in range(out_h):
        row: list[float] = []
        for ox in range(out_w):
            top, left = oy * stride, ox * stride
            window = [matrix[top + dy][left + dx] for dy in range(size) for dx in range(size)]
            row.append(max(window) if pool_type == "max" else sum(window) / len(window))
        pooled.append(row)
    return pooled


def flatten(matrix: list[list[float]]) -> list[float]:
    return [v for row in matrix for v in row]


@dataclass
class DenseWeights:
    weights: list[list[float]]  # weights[j][i] = weight from flattened unit i to output neuron j
    biases: list[float]


def random_dense_weights(input_size: int, output_size: int, seed: int | None = None) -> DenseWeights:
    """Real random initialization for the dense classification head, the
    same Uniform(-1, 1) scheme and the same 'unseeded = genuinely different
    every time, seeded = reproducible' behavior as the Neural Network
    Playground's random_network() — no training happens here, so there is
    no learned weight to fall back on; these random weights are what the
    softmax scores are honestly computed from."""
    import random

    if input_size < 1:
        raise CnnError("Flattened input size must be at least 1.")
    if not (1 <= output_size <= MAX_DENSE_OUTPUTS):
        raise CnnError(f"Number of output classes must be between 1 and {MAX_DENSE_OUTPUTS}.")
    rng = random.Random(seed)
    weights = [[rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(input_size)] for _ in range(output_size)]
    biases = [rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(output_size)]
    return DenseWeights(weights=weights, biases=biases)


@dataclass
class DenseForwardResult:
    z: list[float]
    output: list[float]  # softmax probabilities


def dense_forward(inputs: list[float], dense: DenseWeights, class_labels: list[str]) -> DenseForwardResult:
    """The flattened, pooled feature vector run through one real dense
    layer (weighted sum + bias per class, exactly the same arithmetic as a
    single neuron's z), then a real softmax over the class scores so the
    outputs are genuine probabilities that sum to 1."""
    if len(dense.weights) != len(dense.biases):
        raise CnnError(f"{len(dense.weights)} neuron(s) of weights but {len(dense.biases)} bias(es).")
    if len(dense.weights) != len(class_labels):
        raise CnnError(f"{len(dense.weights)} output neuron(s) but {len(class_labels)} class label(s).")
    for neuron_weights in dense.weights:
        if len(neuron_weights) != len(inputs):
            raise CnnError(
                f"Each dense neuron needs {len(inputs)} weight(s) (one per flattened input), "
                f"got {len(neuron_weights)}."
            )

    z = [sum(w * x for w, x in zip(neuron_weights, inputs)) + b for neuron_weights, b in zip(dense.weights, dense.biases)]
    try:
        probs = softmax(z)
    except ActivationFunctionsError as exc:
        raise CnnError(str(exc)) from exc
    return DenseForwardResult(z=z, output=probs)


@dataclass
class CnnForwardResult:
    feature_map: list[list[float]]
    activated_map: list[list[float]]
    pooled_map: list[list[float]]
    flattened: list[float]
    dense_z: list[float]
    class_scores: list[float]
    class_labels: list[str]
    predicted_class: str


def cnn_forward(
    image: list[list[float]],
    kernel: list[list[float]],
    conv_stride: int,
    conv_activation: str,
    pool_type: str,
    pool_size: int,
    pool_stride: int,
    dense: DenseWeights,
    class_labels: list[str],
) -> CnnForwardResult:
    """The full pipeline, one real stage after another: convolve, activate,
    pool, flatten, then a dense+softmax classification head — each stage's
    output really is the next stage's input, nothing is faked or
    interpolated for the sake of the animation that renders it."""
    feature_map = convolve2d(image, kernel, conv_stride)
    activated_map = apply_activation2d(feature_map, conv_activation)
    pooled_map = pool2d(activated_map, pool_type, pool_size, pool_stride)
    flat = flatten(pooled_map)
    dense_result = dense_forward(flat, dense, class_labels)

    best_idx = max(range(len(dense_result.output)), key=lambda i: dense_result.output[i])
    return CnnForwardResult(
        feature_map=feature_map,
        activated_map=activated_map,
        pooled_map=pooled_map,
        flattened=flat,
        dense_z=dense_result.z,
        class_scores=dense_result.output,
        class_labels=class_labels,
        predicted_class=class_labels[best_idx],
    )
