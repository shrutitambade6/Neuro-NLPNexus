from app.algorithms.rnn import (
    LstmWeights,
    RnnWeights,
    lstm_forward,
    random_lstm_weights,
    random_rnn_weights,
    rnn_forward,
)
from app.schemas.rnn import (
    LstmForwardResponse,
    LstmStepOut,
    LstmWeightsIO,
    RandomLstmRequest,
    RandomRnnRequest,
    RnnForwardResponse,
    RnnStepOut,
    RnnWeightsIO,
)


def run_random_rnn(payload: RandomRnnRequest) -> RnnWeightsIO:
    w = random_rnn_weights(payload.input_size, payload.hidden_size, payload.output_size, payload.seed)
    return RnnWeightsIO(w_xh=w.w_xh, w_hh=w.w_hh, b_h=w.b_h, w_hy=w.w_hy, b_y=w.b_y)


def run_rnn_forward(weights: RnnWeightsIO, sequence, activation: str, output_activation: str) -> RnnForwardResponse:
    w = RnnWeights(w_xh=weights.w_xh, w_hh=weights.w_hh, b_h=weights.b_h, w_hy=weights.w_hy, b_y=weights.b_y)
    result = rnn_forward(w, sequence, activation, output_activation)
    return RnnForwardResponse(
        steps=[RnnStepOut(x=s.x, z_h=s.z_h, h=s.h, y=s.y) for s in result.steps],
        final_hidden=result.final_hidden,
    )


def run_random_lstm(payload: RandomLstmRequest) -> LstmWeightsIO:
    w = random_lstm_weights(payload.input_size, payload.hidden_size, payload.seed)
    return LstmWeightsIO(
        w_f=w.w_f, u_f=w.u_f, b_f=w.b_f,
        w_i=w.w_i, u_i=w.u_i, b_i=w.b_i,
        w_c=w.w_c, u_c=w.u_c, b_c=w.b_c,
        w_o=w.w_o, u_o=w.u_o, b_o=w.b_o,
    )


def run_lstm_forward(weights: LstmWeightsIO, sequence) -> LstmForwardResponse:
    w = LstmWeights(
        w_f=weights.w_f, u_f=weights.u_f, b_f=weights.b_f,
        w_i=weights.w_i, u_i=weights.u_i, b_i=weights.b_i,
        w_c=weights.w_c, u_c=weights.u_c, b_c=weights.b_c,
        w_o=weights.w_o, u_o=weights.u_o, b_o=weights.b_o,
    )
    result = lstm_forward(w, sequence)
    return LstmForwardResponse(
        steps=[
            LstmStepOut(
                x=s.x, forget_gate=s.forget_gate, input_gate=s.input_gate, candidate=s.candidate,
                output_gate=s.output_gate, cell_state=s.cell_state, hidden_state=s.hidden_state,
            )
            for s in result.steps
        ],
        final_hidden=result.final_hidden,
        final_cell=result.final_cell,
    )
