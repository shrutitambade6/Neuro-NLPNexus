"""
Private 1:1 chat REST API. Every endpoint requires require_user — there is
no admin-only chat endpoint and no way to list or read a conversation you
aren't a participant in (chat_service._require_participant enforces this
at the data layer, not just by route design).

Sending a message happens over REST (so it's persisted, tested, and
confirmed to the sender synchronously, exactly like every other write in
this app) and is THEN pushed live to the recipient's open WebSocket
connections, if any — see app/services/connection_manager.py and
app/api/ws.py. The WebSocket itself carries no writes other than ephemeral
typing indicators.
"""
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.algorithms.moderation import RateLimitExceeded
from app.database import get_db
from app.models.orm_models import User
from app.api.deps import require_user
from app.schemas.chat import (
    ConversationListResponse,
    EditMessageRequest,
    MessageListResponse,
    MessageOut,
    SendMessageRequest,
    StartConversationRequest,
    UserSearchResponse,
    UserSearchResultOut,
)
from app.schemas.community import BlockedUserOut, BlockRequest
from app.schemas.auth import UserOut
from app.services import chat_service
from app.services.connection_manager import connection_manager

router = APIRouter()


@router.get("/chat/users/search", response_model=UserSearchResponse)
def search_users_endpoint(
    q: str = Query(..., min_length=1), user: User = Depends(require_user), db: Session = Depends(get_db)
) -> UserSearchResponse:
    results = chat_service.search_users(db, q, user.id)
    return UserSearchResponse(
        users=[
            UserSearchResultOut(**UserOut.model_validate(u).model_dump(), is_online=connection_manager.is_online(u.id))
            for u in results
        ]
    )


@router.get("/chat/conversations", response_model=ConversationListResponse)
def list_conversations_endpoint(user: User = Depends(require_user), db: Session = Depends(get_db)) -> ConversationListResponse:
    return ConversationListResponse(conversations=chat_service.list_conversations(db, user))


@router.post("/chat/conversations", response_model=MessageListResponse, status_code=201)
def start_conversation_endpoint(
    payload: StartConversationRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> MessageListResponse:
    try:
        convo = chat_service.get_or_create_conversation(db, user, payload.other_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    _, other, messages, has_more = chat_service.get_messages(db, user, convo.id)
    return MessageListResponse(
        conversation_id=convo.id,
        other_user=UserOut.model_validate(other),
        is_online=connection_manager.is_online(other.id),
        messages=messages,
        has_more=has_more,
    )


@router.get("/chat/conversations/{conversation_id}/messages", response_model=MessageListResponse)
def get_messages_endpoint(
    conversation_id: int,
    before_id: int | None = Query(None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> MessageListResponse:
    try:
        _, other, messages, has_more = chat_service.get_messages(db, user, conversation_id, before_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return MessageListResponse(
        conversation_id=conversation_id,
        other_user=UserOut.model_validate(other),
        is_online=connection_manager.is_online(other.id),
        messages=messages,
        has_more=has_more,
    )


@router.post("/chat/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=201)
async def send_message_endpoint(
    conversation_id: int,
    payload: SendMessageRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    try:
        message, other = chat_service.send_message(db, user, conversation_id, payload.content)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except RateLimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    await connection_manager.send_to_user(
        other.id, {"type": "chat.message", "conversation_id": conversation_id, "message": message.model_dump(mode="json")}
    )
    # Multi-tab sync: the sender's OTHER open tabs/devices should see the
    # same message appear without a reload, same as the recipient does.
    await connection_manager.send_to_user(
        user.id, {"type": "chat.message", "conversation_id": conversation_id, "message": message.model_dump(mode="json")}
    )
    return message


@router.post("/chat/conversations/{conversation_id}/read")
async def mark_read_endpoint(
    conversation_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    try:
        count = chat_service.mark_read(db, user, conversation_id)
        convo = db.query(chat_service.Conversation).filter(chat_service.Conversation.id == conversation_id).first()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    if convo and count:
        other = chat_service._other_user(convo, user.id)
        await connection_manager.send_to_user(
            other.id, {"type": "chat.read_receipt", "conversation_id": conversation_id, "reader_id": user.id}
        )
    return {"marked_read": count}


@router.patch("/chat/messages/{message_id}", response_model=MessageOut)
def edit_message_endpoint(
    message_id: int, payload: EditMessageRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> MessageOut:
    try:
        message = chat_service.edit_message(db, user, message_id, payload.content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return chat_service._serialize_message(message)


@router.delete("/chat/messages/{message_id}", response_model=MessageOut)
def delete_message_endpoint(
    message_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> MessageOut:
    try:
        message = chat_service.delete_message(db, user, message_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return chat_service._serialize_message(message)


@router.post("/chat/block", status_code=201)
def block_user_endpoint(payload: BlockRequest, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    try:
        chat_service.block_user(db, user, payload.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"blocked": True}


@router.delete("/chat/block/{user_id}")
def unblock_user_endpoint(user_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    chat_service.unblock_user(db, user, user_id)
    return {"blocked": False}


@router.get("/chat/blocked", response_model=list[BlockedUserOut])
def list_blocked_endpoint(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[BlockedUserOut]:
    return [BlockedUserOut(id=u.id, username=u.username) for u in chat_service.list_blocked_users(db, user)]
