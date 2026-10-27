from app.algorithms.cnn import (
    PRESET_KERNELS,
    DenseWeights,
    cnn_forward,
    convolve2d,
    pool2d,
    random_dense_weights,
)
from app.schemas.cnn import (
    CnnForwardResponse,
    ConvolveResponse,
    DenseWeightsIO,
    PoolResponse,
    PresetKernelsResponse,
    RandomDenseResponse,
)


def run_convolve(image, kernel, stride: int) -> ConvolveResponse:
    return ConvolveResponse(feature_map=convolve2d(image, kernel, stride))


def run_pool(matrix, pool_type: str, size: int, stride: int) -> PoolResponse:
    return PoolResponse(pooled=pool2d(matrix, pool_type, size, stride))


def run_random_dense(input_size: int, output_size: int, seed: int | None) -> RandomDenseResponse:
    dense = random_dense_weights(input_size, output_size, seed)
    return RandomDenseResponse(weights=dense.weights, biases=dense.biases)


def run_cnn_forward(
    image,
    kernel,
    conv_stride: int,
    conv_activation: str,
    pool_type: str,
    pool_size: int,
    pool_stride: int,
    dense: DenseWeightsIO,
    class_labels: list[str],
) -> CnnForwardResponse:
    result = cnn_forward(
        image=image,
        kernel=kernel,
        conv_stride=conv_stride,
        conv_activation=conv_activation,
        pool_type=pool_type,
        pool_size=pool_size,
        pool_stride=pool_stride,
        dense=DenseWeights(weights=dense.weights, biases=dense.biases),
        class_labels=class_labels,
    )
    return CnnForwardResponse(
        feature_map=result.feature_map,
        activated_map=result.activated_map,
        pooled_map=result.pooled_map,
        flattened=result.flattened,
        dense_z=result.dense_z,
        class_scores=result.class_scores,
        class_labels=result.class_labels,
        predicted_class=result.predicted_class,
    )


def get_preset_kernels() -> PresetKernelsResponse:
    return PresetKernelsResponse(kernels=PRESET_KERNELS)
