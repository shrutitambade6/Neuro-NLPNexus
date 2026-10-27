from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.activation_functions import ActivationFunctionsError
from app.schemas.activation_functions import (
    ActivationCurveRequest,
    ActivationCurveResponse,
    ActivationPointRequest,
    ActivationPointResponse,
    SoftmaxRequest,
    SoftmaxResponse,
)
from app.services.activation_functions_service import (
    run_activation_curve,
    run_activation_point,
    run_softmax,
)

router = APIRouter()


@router.post("/dl/activation-curve", response_model=ActivationCurveResponse)
def activation_curve_endpoint(payload: ActivationCurveRequest, user: User = Depends(require_user)) -> ActivationCurveResponse:
    try:
        return run_activation_curve(payload.activation, payload.z_min, payload.z_max, payload.num_points)
    except ActivationFunctionsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/activation-point", response_model=ActivationPointResponse)
def activation_point_endpoint(payload: ActivationPointRequest, user: User = Depends(require_user)) -> ActivationPointResponse:
    try:
        return run_activation_point(payload.activation, payload.z)
    except ActivationFunctionsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/softmax", response_model=SoftmaxResponse)
def softmax_endpoint(payload: SoftmaxRequest, user: User = Depends(require_user)) -> SoftmaxResponse:
    try:
        return run_softmax(payload.values)
    except ActivationFunctionsError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
