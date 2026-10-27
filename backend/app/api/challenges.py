from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.challenges import AttemptRequest, AttemptResponse, ChallengeOut, MyProgressResponse
from app.services.auth_service import get_current_user
from app.services.challenges_service import attempt_dl_challenge, get_my_dl_progress, list_dl_challenges

router = APIRouter()


def _require_user(authorization: str | None, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in to attempt a challenge — your XP is tracked per account.")
    token = authorization.removeprefix("Bearer ").strip()
    user = get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session — please sign in again.")
    return user


@router.get("/dl/challenges", response_model=list[ChallengeOut])
def list_challenges_endpoint(db: Session = Depends(get_db)) -> list[ChallengeOut]:
    return list_dl_challenges(db)


@router.get("/dl/challenges/my-progress", response_model=MyProgressResponse)
def my_progress_endpoint(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> MyProgressResponse:
    user = _require_user(authorization, db)
    return get_my_dl_progress(db, user)


@router.post("/dl/challenges/{challenge_id}/attempt", response_model=AttemptResponse)
def attempt_challenge_endpoint(
    challenge_id: int,
    payload: AttemptRequest,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> AttemptResponse:
    user = _require_user(authorization, db)
    try:
        return attempt_dl_challenge(db, user, challenge_id, payload.submitted_answer)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
