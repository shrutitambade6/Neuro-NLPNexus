from pydantic import BaseModel, Field


class LayerSpecIn(BaseModel):
    size: int = Field(..., ge=1, le=8)
    activation: str = "relu"


class RandomNetworkRequest(BaseModel):
    input_size: int = Field(..., ge=1, le=6)
    layers: list[LayerSpecIn] = Field(..., min_length=1, max_length=6)
    seed: int | None = None


class LayerWeightsIO(BaseModel):
    weights: list[list[float]]
    biases: list[float]
    activation: str


class RandomNetworkResponse(BaseModel):
    input_size: int
    layers: list[LayerWeightsIO]


class ForwardPropagationRequest(BaseModel):
    input_size: int = Field(..., ge=1, le=6)
    layers: list[LayerWeightsIO] = Field(..., min_length=1, max_length=6)
    inputs: list[float] = Field(..., min_length=1, max_length=6)


class NeuronActivationOut(BaseModel):
    z: float
    output: float


class LayerActivationOut(BaseModel):
    activation: str
    neurons: list[NeuronActivationOut]


class ForwardPropagationResponse(BaseModel):
    input_values: list[float]
    layers: list[LayerActivationOut]
    output: list[float]
