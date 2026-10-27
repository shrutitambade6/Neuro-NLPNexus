from pydantic import BaseModel, Field


class ConvolveRequest(BaseModel):
    image: list[list[float]]
    kernel: list[list[float]]
    stride: int = Field(default=1, ge=1, le=3)


class ConvolveResponse(BaseModel):
    feature_map: list[list[float]]


class PoolRequest(BaseModel):
    matrix: list[list[float]]
    pool_type: str = "max"
    size: int = Field(..., ge=1, le=4)
    stride: int = Field(..., ge=1, le=4)


class PoolResponse(BaseModel):
    pooled: list[list[float]]


class RandomDenseRequest(BaseModel):
    input_size: int = Field(..., ge=1, le=100)
    output_size: int = Field(..., ge=1, le=6)
    seed: int | None = None


class RandomDenseResponse(BaseModel):
    weights: list[list[float]]
    biases: list[float]


class DenseWeightsIO(BaseModel):
    weights: list[list[float]]
    biases: list[float]


class CnnForwardRequest(BaseModel):
    image: list[list[float]]
    kernel: list[list[float]]
    conv_stride: int = Field(default=1, ge=1, le=3)
    conv_activation: str = "relu"
    pool_type: str = "max"
    pool_size: int = Field(..., ge=1, le=4)
    pool_stride: int = Field(..., ge=1, le=4)
    dense: DenseWeightsIO
    class_labels: list[str] = Field(..., min_length=1, max_length=6)


class CnnForwardResponse(BaseModel):
    feature_map: list[list[float]]
    activated_map: list[list[float]]
    pooled_map: list[list[float]]
    flattened: list[float]
    dense_z: list[float]
    class_scores: list[float]
    class_labels: list[str]
    predicted_class: str


class PresetKernelsResponse(BaseModel):
    kernels: dict[str, list[list[float]]]
