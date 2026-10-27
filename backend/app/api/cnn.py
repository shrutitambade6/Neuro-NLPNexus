from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.cnn import CnnError
from app.schemas.cnn import (
    CnnForwardRequest,
    CnnForwardResponse,
    ConvolveRequest,
    ConvolveResponse,
    PoolRequest,
    PoolResponse,
    PresetKernelsResponse,
    RandomDenseRequest,
    RandomDenseResponse,
)
from app.services.cnn_service import (
    get_preset_kernels,
    run_cnn_forward,
    run_convolve,
    run_pool,
    run_random_dense,
)

router = APIRouter()


@router.get("/dl/cnn/kernels", response_model=PresetKernelsResponse)
def preset_kernels_endpoint(user: User = Depends(require_user)) -> PresetKernelsResponse:
    return get_preset_kernels()


@router.post("/dl/cnn/convolve", response_model=ConvolveResponse)
def convolve_endpoint(payload: ConvolveRequest, user: User = Depends(require_user)) -> ConvolveResponse:
    try:
        return run_convolve(payload.image, payload.kernel, payload.stride)
    except CnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/cnn/pool", response_model=PoolResponse)
def pool_endpoint(payload: PoolRequest, user: User = Depends(require_user)) -> PoolResponse:
    try:
        return run_pool(payload.matrix, payload.pool_type, payload.size, payload.stride)
    except CnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/cnn/random-dense", response_model=RandomDenseResponse)
def random_dense_endpoint(payload: RandomDenseRequest, user: User = Depends(require_user)) -> RandomDenseResponse:
    try:
        return run_random_dense(payload.input_size, payload.output_size, payload.seed)
    except CnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/cnn/forward", response_model=CnnForwardResponse)
def cnn_forward_endpoint(payload: CnnForwardRequest, user: User = Depends(require_user)) -> CnnForwardResponse:
    try:
        return run_cnn_forward(
            payload.image,
            payload.kernel,
            payload.conv_stride,
            payload.conv_activation,
            payload.pool_type,
            payload.pool_size,
            payload.pool_stride,
            payload.dense,
            payload.class_labels,
        )
    except CnnError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
