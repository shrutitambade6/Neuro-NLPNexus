from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.nn_module2_examples import NNModule2Error
from app.schemas.nn_module2_examples import (
    BackpropStepRequest,
    BackpropStepResponse,
    BackpropTrainRequest,
    BackpropTrainResponse,
    EmailClassificationRequest,
    EmailClassificationResponse,
)
from app.services import nn_module2_examples_service as service

router = APIRouter()


@router.post("/dl-module2/email-classification", response_model=EmailClassificationResponse)
def email_classification(payload: EmailClassificationRequest, user: User = Depends(require_user)) -> EmailClassificationResponse:
    try:
        return service.run_email_classification(payload)
    except NNModule2Error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module2/backprop-step", response_model=BackpropStepResponse)
def backprop_step(payload: BackpropStepRequest, user: User = Depends(require_user)) -> BackpropStepResponse:
    try:
        return service.run_backprop_step(payload)
    except NNModule2Error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module2/backprop-train", response_model=BackpropTrainResponse)
def backprop_train(payload: BackpropTrainRequest, user: User = Depends(require_user)) -> BackpropTrainResponse:
    try:
        return service.run_backprop_train(payload)
    except NNModule2Error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
