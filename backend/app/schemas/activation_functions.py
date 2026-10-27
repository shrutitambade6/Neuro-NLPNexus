from pydantic import BaseModel, Field


class ActivationCurveRequest(BaseModel):
    activation: str = "sigmoid"
    z_min: float = -10.0
    z_max: float = 10.0
    num_points: int = Field(200, ge=2, le=400)


class ActivationCurvePoint(BaseModel):
    z: float
    y: float


class ActivationCurveResponse(BaseModel):
    activation: str
    points: list[ActivationCurvePoint]


class ActivationPointRequest(BaseModel):
    activation: str = "sigmoid"
    z: float = 0.0


class ActivationPointResponse(BaseModel):
    activation: str
    z: float
    y: float
    derivative: float


class SoftmaxRequest(BaseModel):
    values: list[float] = Field(..., min_length=1, max_length=8)


class SoftmaxResponse(BaseModel):
    input: list[float]
    output: list[float]
    steps: list[str]
