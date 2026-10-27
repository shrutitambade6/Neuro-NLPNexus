from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.dl_foundations import DlFoundationsError
from app.schemas.dl_foundations import (
    GradientDescentRequest,
    GradientDescentResponse,
    GradientRequest,
    GradientResponse,
    LossRequest,
    LossResponse,
    NeuronForwardRequest,
    NeuronForwardResponse,
)
from app.services.dl_foundations_service import (
    run_compute_loss,
    run_gradient,
    run_gradient_descent,
    run_neuron_forward,
)

router = APIRouter()


@router.post("/dl/neuron-forward", response_model=NeuronForwardResponse)
def neuron_forward_endpoint(payload: NeuronForwardRequest, user: User = Depends(require_user)) -> NeuronForwardResponse:
    try:
        return run_neuron_forward(payload.inputs, payload.weights, payload.bias, payload.activation)
    except DlFoundationsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/loss", response_model=LossResponse)
def loss_endpoint(payload: LossRequest, user: User = Depends(require_user)) -> LossResponse:
    try:
        return run_compute_loss(payload.y_pred, payload.y_true, payload.loss_type)
    except DlFoundationsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/gradient", response_model=GradientResponse)
def gradient_endpoint(payload: GradientRequest, user: User = Depends(require_user)) -> GradientResponse:
    try:
        return run_gradient(
            payload.inputs, payload.weights, payload.bias, payload.y_true, payload.activation, payload.loss_type
        )
    except DlFoundationsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/gradient-descent", response_model=GradientDescentResponse)
def gradient_descent_endpoint(payload: GradientDescentRequest, user: User = Depends(require_user)) -> GradientDescentResponse:
    try:
        return run_gradient_descent(
            payload.inputs,
            payload.weights,
            payload.bias,
            payload.y_true,
            payload.activation,
            payload.loss_type,
            payload.learning_rate,
            payload.epochs,
        )
    except DlFoundationsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
