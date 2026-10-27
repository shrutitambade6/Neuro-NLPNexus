from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.rnn import RnnError
from app.schemas.rnn import (
    LstmForwardRequest,
    LstmForwardResponse,
    LstmWeightsIO,
    RandomLstmRequest,
    RandomRnnRequest,
    RnnForwardRequest,
    RnnForwardResponse,
    RnnWeightsIO,
)
from app.services.rnn_service import run_lstm_forward, run_random_lstm, run_random_rnn, run_rnn_forward

router = APIRouter()


@router.post("/dl/rnn/random", response_model=RnnWeightsIO)
def random_rnn_endpoint(payload: RandomRnnRequest, user: User = Depends(require_user)) -> RnnWeightsIO:
    try:
        return run_random_rnn(payload)
    except RnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/rnn/forward", response_model=RnnForwardResponse)
def rnn_forward_endpoint(payload: RnnForwardRequest, user: User = Depends(require_user)) -> RnnForwardResponse:
    try:
        return run_rnn_forward(payload.weights, payload.sequence, payload.activation, payload.output_activation)
    except RnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/lstm/random", response_model=LstmWeightsIO)
def random_lstm_endpoint(payload: RandomLstmRequest, user: User = Depends(require_user)) -> LstmWeightsIO:
    try:
        return run_random_lstm(payload)
    except RnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/lstm/forward", response_model=LstmForwardResponse)
def lstm_forward_endpoint(payload: LstmForwardRequest, user: User = Depends(require_user)) -> LstmForwardResponse:
    try:
        return run_lstm_forward(payload.weights, payload.sequence)
    except RnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
