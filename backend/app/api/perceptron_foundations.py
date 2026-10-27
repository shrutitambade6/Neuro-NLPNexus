from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.perceptron_foundations import PerceptronFoundationsError
from app.schemas.perceptron_foundations import (
    MPNeuronRequest,
    MPNeuronResponse,
    PerceptronForwardRequest,
    PerceptronForwardResponse,
    PLAStepRequest,
    PLAStepResponse,
    PLATrainRequest,
    PLATrainResponse,
    TruthTableRequest,
    TruthTableResponse,
)
from app.services import perceptron_foundations_service as service

router = APIRouter()


@router.post("/dl-module1/mp-neuron", response_model=MPNeuronResponse)
def mp_neuron(payload: MPNeuronRequest, user: User = Depends(require_user)) -> MPNeuronResponse:
    try:
        return service.run_mp_neuron(payload)
    except PerceptronFoundationsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module1/truth-table", response_model=TruthTableResponse)
def truth_table(payload: TruthTableRequest, user: User = Depends(require_user)) -> TruthTableResponse:
    try:
        return service.run_truth_table(payload.gate)
    except PerceptronFoundationsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module1/perceptron-forward", response_model=PerceptronForwardResponse)
def perceptron_forward(payload: PerceptronForwardRequest, user: User = Depends(require_user)) -> PerceptronForwardResponse:
    try:
        return service.run_perceptron_forward(payload)
    except PerceptronFoundationsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module1/pla-step", response_model=PLAStepResponse)
def pla_step(payload: PLAStepRequest, user: User = Depends(require_user)) -> PLAStepResponse:
    try:
        return service.run_pla_step(payload)
    except PerceptronFoundationsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module1/pla-train", response_model=PLATrainResponse)
def pla_train(payload: PLATrainRequest, user: User = Depends(require_user)) -> PLATrainResponse:
    try:
        return service.run_pla_train(payload)
    except PerceptronFoundationsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
