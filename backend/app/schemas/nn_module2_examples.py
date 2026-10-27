from pydantic import BaseModel, Field


class EmailClassificationRequest(BaseModel):
    inputs: list[float] = Field(..., min_length=3, max_length=3)
    h1_weights: list[float] | None = Field(None, min_length=3, max_length=3)
    h2_weights: list[float] | None = Field(None, min_length=3, max_length=3)
    output_weights: list[float] | None = Field(None, min_length=2, max_length=2)


class EmailClassificationResponse(BaseModel):
    h1_weighted_sum: float
    h1_output: float
    h2_weighted_sum: float
    h2_output: float
    output_weighted_sum: float
    output_probability: float
    is_spam: bool
    steps: list[str]


class BackpropNetworkIn(BaseModel):
    w13: float = 0.2
    w23: float = 0.2
    w14: float = 0.3
    w24: float = 0.3
    w35: float = 0.3
    w45: float = 0.9


class BackpropNetworkOut(BaseModel):
    w13: float
    w23: float
    w14: float
    w24: float
    w35: float
    w45: float


class BackpropStepRequest(BaseModel):
    x1: float = 0.35
    x2: float = 0.7
    target: float = Field(0.5, ge=0.0, le=1.0)
    learning_rate: float = Field(1.0, gt=0, le=10)
    network: BackpropNetworkIn = Field(default_factory=BackpropNetworkIn)


class BackpropStepResponse(BaseModel):
    a3: float
    y3: float
    a4: float
    y4: float
    a5: float
    y5: float
    error: float
    delta5: float
    delta3: float
    delta4: float
    updated_network: BackpropNetworkOut
    steps: list[str]


class BackpropTrainRequest(BaseModel):
    x1: float = 0.35
    x2: float = 0.7
    target: float = Field(0.5, ge=0.0, le=1.0)
    learning_rate: float = Field(1.0, gt=0, le=10)
    network: BackpropNetworkIn = Field(default_factory=BackpropNetworkIn)
    num_steps: int = Field(10, ge=1, le=500)


class BackpropTrainResponse(BaseModel):
    history: list[BackpropStepResponse]
    final_network: BackpropNetworkOut
    final_output: float
    final_error: float
