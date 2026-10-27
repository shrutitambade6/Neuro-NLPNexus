from pydantic import BaseModel, Field


class RandomRnnRequest(BaseModel):
    input_size: int = Field(..., ge=1, le=4)
    hidden_size: int = Field(..., ge=1, le=6)
    output_size: int = Field(..., ge=1, le=4)
    seed: int | None = None


class RnnWeightsIO(BaseModel):
    w_xh: list[list[float]]
    w_hh: list[list[float]]
    b_h: list[float]
    w_hy: list[list[float]]
    b_y: list[float]


class RnnForwardRequest(BaseModel):
    weights: RnnWeightsIO
    sequence: list[list[float]] = Field(..., min_length=1, max_length=8)
    activation: str = "tanh"
    output_activation: str = "softmax"


class RnnStepOut(BaseModel):
    x: list[float]
    z_h: list[float]
    h: list[float]
    y: list[float]


class RnnForwardResponse(BaseModel):
    steps: list[RnnStepOut]
    final_hidden: list[float]


class RandomLstmRequest(BaseModel):
    input_size: int = Field(..., ge=1, le=4)
    hidden_size: int = Field(..., ge=1, le=6)
    seed: int | None = None


class LstmWeightsIO(BaseModel):
    w_f: list[list[float]]; u_f: list[list[float]]; b_f: list[float]
    w_i: list[list[float]]; u_i: list[list[float]]; b_i: list[float]
    w_c: list[list[float]]; u_c: list[list[float]]; b_c: list[float]
    w_o: list[list[float]]; u_o: list[list[float]]; b_o: list[float]


class LstmForwardRequest(BaseModel):
    weights: LstmWeightsIO
    sequence: list[list[float]] = Field(..., min_length=1, max_length=8)


class LstmStepOut(BaseModel):
    x: list[float]
    forget_gate: list[float]
    input_gate: list[float]
    candidate: list[float]
    output_gate: list[float]
    cell_state: list[float]
    hidden_state: list[float]


class LstmForwardResponse(BaseModel):
    steps: list[LstmStepOut]
    final_hidden: list[float]
    final_cell: list[float]
