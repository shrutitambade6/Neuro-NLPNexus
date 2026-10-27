from pydantic import BaseModel, Field


class MPNeuronRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    weights: list[float] = Field(..., min_length=1, max_length=8)
    threshold: float = 0.0


class MPNeuronResponse(BaseModel):
    weighted_sum: float
    threshold: float
    fired: bool
    output: int
    steps: list[str]


class TruthTableRequest(BaseModel):
    gate: str = Field(..., pattern="^(AND|OR|NOT)$")


class TruthTableRow(BaseModel):
    inputs: list[int]
    output: int


class TruthTableResponse(BaseModel):
    gate: str
    weights: list[float]
    threshold: float
    rows: list[TruthTableRow]


class PerceptronForwardRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    weights: list[float] = Field(..., min_length=1, max_length=8)
    bias: float = 0.0


class PerceptronForwardResponse(BaseModel):
    weighted_sum: float
    output: int
    steps: list[str]


class PLAStepRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    weights: list[float] = Field(..., min_length=1, max_length=8)
    bias: float = 0.0
    target: int = Field(..., ge=0, le=1)
    learning_rate: float = Field(0.1, gt=0, le=5)


class PLAStepResponse(BaseModel):
    weighted_sum: float
    prediction: int
    error: int
    updated_weights: list[float]
    updated_bias: float
    steps: list[str]


class PLATrainExample(BaseModel):
    inputs: list[float] = Field(..., min_length=1, max_length=8)
    target: int = Field(..., ge=0, le=1)


class PLATrainRequest(BaseModel):
    training_data: list[PLATrainExample] = Field(..., min_length=1, max_length=16)
    initial_weights: list[float] = Field(..., min_length=1, max_length=8)
    initial_bias: float = 0.0
    learning_rate: float = Field(0.1, gt=0, le=5)
    max_epochs: int = Field(20, ge=1, le=100)


class PLATrainStepOut(BaseModel):
    weighted_sum: float
    prediction: int
    error: int
    updated_weights: list[float]
    updated_bias: float
    steps: list[str]


class PLATrainResponse(BaseModel):
    history: list[PLATrainStepOut]
    final_weights: list[float]
    final_bias: float
    converged: bool
    epochs_run: int
