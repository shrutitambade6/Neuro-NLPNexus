from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.autoencoder_concepts import AutoencoderConceptsError
from app.schemas.autoencoder_concepts import (
    DropoutRequest,
    DropoutResponse,
    L2PenaltyRequest,
    L2PenaltyResponse,
    LinearAutoencoderRequest,
    LinearAutoencoderResponse,
    ReconstructionLossRequest,
    ReconstructionLossResponse,
    SparsityPenaltyRequest,
    SparsityPenaltyResponse,
)
from app.services import autoencoder_concepts_service as service

router = APIRouter()


@router.post("/dl-module3/linear-autoencoder", response_model=LinearAutoencoderResponse)
def linear_autoencoder(payload: LinearAutoencoderRequest, user: User = Depends(require_user)) -> LinearAutoencoderResponse:
    try:
        return service.run_linear_autoencoder(payload)
    except AutoencoderConceptsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module3/reconstruction-loss", response_model=ReconstructionLossResponse)
def reconstruction_loss(payload: ReconstructionLossRequest, user: User = Depends(require_user)) -> ReconstructionLossResponse:
    try:
        return service.run_reconstruction_loss(payload)
    except AutoencoderConceptsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module3/sparsity-penalty", response_model=SparsityPenaltyResponse)
def sparsity_penalty(payload: SparsityPenaltyRequest, user: User = Depends(require_user)) -> SparsityPenaltyResponse:
    try:
        return service.run_sparsity_penalty(payload)
    except AutoencoderConceptsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module3/l2-penalty", response_model=L2PenaltyResponse)
def l2_penalty(payload: L2PenaltyRequest, user: User = Depends(require_user)) -> L2PenaltyResponse:
    try:
        return service.run_l2_penalty(payload)
    except AutoencoderConceptsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/dl-module3/dropout", response_model=DropoutResponse)
def dropout(payload: DropoutRequest, user: User = Depends(require_user)) -> DropoutResponse:
    try:
        return service.run_dropout(payload)
    except AutoencoderConceptsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
