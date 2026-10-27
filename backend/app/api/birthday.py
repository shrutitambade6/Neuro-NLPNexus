"""
Birthday Experience REST API. Every endpoint requires require_user — there
is no public/unauthenticated birthday data anywhere, and the ONE place the
real date of birth is ever returned is /users/me/birthday, which only ever
answers for the caller's own account (never takes a target user id).

Sending a wish rides the existing chat system end-to-end: birthday_service.
send_wish calls chat_service.get_or_create_conversation + send_message
under the hood, so this endpoint pushes the exact same
"type": "chat.message" WebSocket event chat.py's own send-message endpoint
does — a birthday wish really is just a chat message, from the recipient's
point of view.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.algorithms.moderation import RateLimitExceeded
from app.database import get_db
from app.models.orm_models import User
from app.api.deps import require_user
from app.schemas.birthday import (
    BirthdayMeOut,
    BirthdayStatusOut,
    BirthdayUpdateRequest,
    BirthdayWishesResponse,
    SendBirthdayWishRequest,
)
from app.schemas.chat import MessageOut
from app.services import birthday_service
from app.services.connection_manager import connection_manager

router = APIRouter()


@router.get("/users/me/birthday", response_model=BirthdayMeOut)
def get_my_birthday(user: User = Depends(require_user)) -> BirthdayMeOut:
    return BirthdayMeOut(
        birthday=user.birthday,
        timezone=user.timezone,
        is_birthday_today=birthday_service.is_birthday_today(user),
    )


@router.patch("/users/me/birthday", response_model=BirthdayMeOut)
def update_my_birthday(
    payload: BirthdayUpdateRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> BirthdayMeOut:
    updated = birthday_service.set_birthday(db, user, payload.birthday, payload.timezone)
    return BirthdayMeOut(
        birthday=updated.birthday,
        timezone=updated.timezone,
        is_birthday_today=birthday_service.is_birthday_today(updated),
    )


@router.get("/birthday/today", response_model=BirthdayStatusOut)
def birthday_today(user: User = Depends(require_user), db: Session = Depends(get_db)) -> BirthdayStatusOut:
    # Backend-validated, not frontend-trusted (point 24) — this recomputes
    # is_birthday_today server-side on every call rather than reading any
    # client-supplied flag.
    return BirthdayStatusOut(
        is_my_birthday=birthday_service.is_birthday_today(user),
        related_birthdays_today=birthday_service.list_related_birthdays_today(db, user),
    )


@router.get("/birthday/wishes", response_model=BirthdayWishesResponse)
def birthday_wishes(user: User = Depends(require_user), db: Session = Depends(get_db)) -> BirthdayWishesResponse:
    return BirthdayWishesResponse(wishes=birthday_service.list_wishes_today(db, user))


@router.post("/birthday/wish", response_model=MessageOut, status_code=201)
async def send_birthday_wish(
    payload: SendBirthdayWishRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> MessageOut:
    try:
        message, conversation_id = birthday_service.send_wish(db, user, payload.to_user_id, payload.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except RateLimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    # Mirrors chat.py's send_message_endpoint exactly: push to the
    # recipient AND back to the sender's other open tabs, so a birthday
    # wish shows up live in Chat for both sides, not just on reload.
    payload_out = {"type": "chat.message", "conversation_id": conversation_id, "message": message.model_dump(mode="json")}
    await connection_manager.send_to_user(payload.to_user_id, payload_out)
    await connection_manager.send_to_user(user.id, payload_out)
    return message
