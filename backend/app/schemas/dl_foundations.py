from pydantic import BaseModel, Field


class NeuronForwardRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    weights: list[float] = Field(..., min_length=1, max_length=8)
    bias: float = 0.0
    activation: str = "sigmoid"


class NeuronForwardResponse(BaseModel):
    weighted_sum: float
    activated_output: float
    activation: str
    steps: list[str]


class LossRequest(BaseModel):
    y_pred: float
    y_true: float
    loss_type: str = "mse"


class LossResponse(BaseModel):
    loss: float
    loss_type: str
    steps: list[str]


class GradientRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    weights: list[float] = Field(..., min_length=1, max_length=8)
    bias: float = 0.0
    y_true: float
    activation: str = "sigmoid"
    loss_type: str = "mse"


class GradientResponse(BaseModel):
    dl_dw: list[float]
    dl_db: float
    y_pred: float
    loss: float
    steps: list[str]


class GradientDescentRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    weights: list[float] = Field(..., min_length=1, max_length=8)
    bias: float = 0.0
    y_true: float
    activation: str = "sigmoid"
    loss_type: str = "mse"
    learning_rate: float = Field(0.1, gt=0, le=5)
    epochs: int = Field(10, ge=1, le=50)


class GradientDescentStepOut(BaseModel):
    epoch: int
    weights: list[float]
    bias: float
    y_pred: float
    loss: float


class GradientDescentResponse(BaseModel):
    steps: list[GradientDescentStepOut]
    final_weights: list[float]
    final_bias: float
    final_loss: float
