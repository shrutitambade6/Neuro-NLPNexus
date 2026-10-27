from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.neural_network import NeuralNetworkError
from app.schemas.neural_network import (
    ForwardPropagationRequest,
    ForwardPropagationResponse,
    RandomNetworkRequest,
    RandomNetworkResponse,
)
from app.services.neural_network_service import run_forward_propagation, run_random_network

router = APIRouter()


@router.post("/dl/network/random", response_model=RandomNetworkResponse)
def random_network_endpoint(payload: RandomNetworkRequest, user: User = Depends(require_user)) -> RandomNetworkResponse:
    try:
        return run_random_network(payload.input_size, payload.layers, payload.seed)
    except NeuralNetworkError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/network/forward", response_model=ForwardPropagationResponse)
def forward_propagation_endpoint(payload: ForwardPropagationRequest, user: User = Depends(require_user)) -> ForwardPropagationResponse:
    try:
        return run_forward_propagation(payload.input_size, payload.layers, payload.inputs)
    except NeuralNetworkError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
