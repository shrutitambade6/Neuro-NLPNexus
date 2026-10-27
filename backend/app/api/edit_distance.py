from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.edit_distance import EditDistanceRequest, EditDistanceResponse
from app.services.edit_distance_service import run_edit_distance

router = APIRouter()


@router.post("/edit-distance/compute", response_model=EditDistanceResponse)
def compute_edit_distance(payload: EditDistanceRequest, user: User = Depends(require_user)) -> EditDistanceResponse:
    return run_edit_distance(payload.source, payload.target)
