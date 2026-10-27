"""
Private 1:1 chat: conversations, messages, user search. Every function
here requires an already-authenticated `User` resolved by the caller (see
app/api/deps.require_user) — same convention as admin_service.py.

Real-time delivery is layered on top of these plain, synchronous,
pytest-friendly functions rather than baked into them: a function here
returns the fully persisted result, and the API layer (app/api/chat.py)
is what awaits connection_manager.send_to_user(...) afterward.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.algorithms.moderation import (
    MAX_MESSAGE_LENGTH,
    RATE_LIMIT_MAX_ACTIONS,
    RATE_LIMIT_WINDOW_SECONDS,
    RateLimitExceeded,
    validate_content,
)
from app.models.orm_models import Block, Conversation, Message, Notification, User
from app.schemas.auth import UserOut
from app.schemas.chat import ConversationSummaryOut, MessageOut
from app.services.connection_manager import connection_manager

SEARCH_RESULT_LIMIT = 20
MESSAGE_PAGE_SIZE = 50
DELETED_PLACEHOLDER = "This message was deleted."


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ordered_pair(user_a_id: int, user_b_id: int) -> tuple[int, int]:
    return (user_a_id, user_b_id) if user_a_id < user_b_id else (user_b_id, user_a_id)


def _other_user(convo: Conversation, user_id: int) -> User:
    return convo.user_b if convo.user_a_id == user_id else convo.user_a


def _require_participant(convo: Conversation, user: User) -> None:
    if user.id not in (convo.user_a_id, convo.user_b_id):
        raise PermissionError("You're not a participant in this conversation.")


def _serialize_message(message: Message) -> MessageOut:
    out = MessageOut.model_validate(message)
    if message.deleted:
        out.content = DELETED_PLACEHOLDER
    return out


def search_users(db: Session, raw_query: str, exclude_user_id: int) -> list[User]:
    cleaned = (raw_query or "").strip()
    if not cleaned:
        return []
    like = f"%{cleaned}%"
    return (
        db.query(User)
        .filter(User.id != exclude_user_id)
        .filter(or_(User.username.ilike(like), User.email.ilike(like)))
        .order_by(User.username.asc())
        .limit(SEARCH_RESULT_LIMIT)
        .all()
    )


def get_or_create_conversation(db: Session, user: User, other_user_id: int) -> Conversation:
    if other_user_id == user.id:
        raise ValueError("You can't start a conversation with yourself.")
    other = db.query(User).filter(User.id == other_user_id).first()
    if not other:
        raise ValueError("That user doesn't exist.")

    a_id, b_id = _ordered_pair(user.id, other_user_id)
    convo = (
        db.query(Conversation)
        .filter(Conversation.user_a_id == a_id, Conversation.user_b_id == b_id)
        .first()
    )
    if convo:
        return convo

    convo = Conversation(user_a_id=a_id, user_b_id=b_id)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


def list_conversations(db: Session, user: User) -> list[ConversationSummaryOut]:
    rows = (
        db.query(Conversation)
        .filter(or_(Conversation.user_a_id == user.id, Conversation.user_b_id == user.id))
        .order_by(func.coalesce(Conversation.last_message_at, Conversation.created_at).desc())
        .all()
    )
    summaries: list[ConversationSummaryOut] = []
    for convo in rows:
        other = _other_user(convo, user.id)
        last_message = (
            db.query(Message)
            .filter(Message.conversation_id == convo.id)
            .order_by(Message.id.desc())
            .first()
        )
        unread_count = (
            db.query(Message)
            .filter(
                Message.conversation_id == convo.id,
                Message.sender_id == other.id,
                Message.read_at.is_(None),
            )
            .count()
        )
        preview = None
        if last_message:
            preview = DELETED_PLACEHOLDER if last_message.deleted else last_message.content[:120]
        summaries.append(
            ConversationSummaryOut(
                id=convo.id,
                other_user=UserOut.model_validate(other),
                is_online=connection_manager.is_online(other.id),
                last_message_preview=preview,
                last_message_at=convo.last_message_at,
                unread_count=unread_count,
            )
        )
    return summaries


def get_messages(
    db: Session, user: User, conversation_id: int, before_id: int | None = None, limit: int = MESSAGE_PAGE_SIZE
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise ValueError("Conversation not found.")
    _require_participant(convo, user)

    q = db.query(Message).filter(Message.conversation_id == conversation_id)
    if before_id is not None:
        q = q.filter(Message.id < before_id)
    rows = q.order_by(Message.id.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    rows.reverse()  # ascending for display

    return convo, _other_user(convo, user.id), [_serialize_message(m) for m in rows], has_more


def _enforce_rate_limit(db: Session, user_id: int) -> None:
    window_start = _utcnow() - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
    recent_count = (
        db.query(Message).filter(Message.sender_id == user_id, Message.created_at >= window_start).count()
    )
    if recent_count >= RATE_LIMIT_MAX_ACTIONS:
        raise RateLimitExceeded("Too many messages sent too quickly — please slow down.")


def send_message(db: Session, user: User, conversation_id: int, content: str) -> tuple[MessageOut, User]:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise ValueError("Conversation not found.")
    _require_participant(convo, user)
    other = _other_user(convo, user.id)

    already_blocked = (
        db.query(Block).filter(Block.blocker_id == other.id, Block.blocked_id == user.id).first()
    )
    if already_blocked:
        raise PermissionError("This user isn't accepting messages from you right now.")

    _enforce_rate_limit(db, user.id)
    cleaned = validate_content(content, max_length=MAX_MESSAGE_LENGTH, field_name="message")

    message = Message(conversation_id=convo.id, sender_id=user.id, content=cleaned)
    db.add(message)
    convo.last_message_at = _utcnow()
    db.commit()
    db.refresh(message)

    # A persisted Notification is created on every message, regardless of
    # whether the recipient's socket is currently connected. "Online" only
    # means they have a WebSocket connection open somewhere in the app --
    # it does NOT mean they're looking at this conversation (e.g. they could
    # be sitting on /notifications, /dashboard, a lab page, anywhere else).
    # Gating this on is_online() used to mean an online-but-elsewhere
    # recipient got no notification bell entry at all for a new DM, even
    # though the live push below only updates an already-open thread, not
    # the notification bell/Notifications page. mark_read() below already
    # clears this the moment the recipient actually opens the conversation,
    # so there's no risk of a stale notification lingering after they've
    # read it -- this just stops the window where it never appeared.
    db.add(
        Notification(
            user_id=other.id,
            actor_id=user.id,
            notif_type="message",
            reference_type="conversation",
            reference_id=convo.id,
            content=f"{user.username} sent you a message.",
        )
    )
    db.commit()

    return _serialize_message(message), other


def mark_read(db: Session, user: User, conversation_id: int) -> int:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise ValueError("Conversation not found.")
    _require_participant(convo, user)
    other = _other_user(convo, user.id)

    unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == convo.id,
            Message.sender_id == other.id,
            Message.read_at.is_(None),
        )
        .all()
    )
    now = _utcnow()
    for m in unread:
        m.read_at = now

    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.notif_type == "message",
        Notification.reference_type == "conversation",
        Notification.reference_id == convo.id,
        Notification.is_read.is_(False),
    ).update({"is_read": True})

    db.commit()
    return len(unread)


def edit_message(db: Session, user: User, message_id: int, content: str) -> Message:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise ValueError("Message not found.")
    if message.sender_id != user.id:
        raise PermissionError("You can only edit your own messages.")
    if message.deleted:
        raise ValueError("Can't edit a deleted message.")
    message.content = validate_content(content, max_length=MAX_MESSAGE_LENGTH, field_name="message")
    message.edited_at = _utcnow()
    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, user: User, message_id: int) -> Message:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise ValueError("Message not found.")
    if message.sender_id != user.id:
        raise PermissionError("You can only delete your own messages.")
    message.deleted = True
    message.content = ""
    db.commit()
    db.refresh(message)
    return message


def block_user(db: Session, user: User, other_user_id: int) -> None:
    if other_user_id == user.id:
        raise ValueError("You can't block yourself.")
    other = db.query(User).filter(User.id == other_user_id).first()
    if not other:
        raise ValueError("That user doesn't exist.")
    existing = db.query(Block).filter(Block.blocker_id == user.id, Block.blocked_id == other_user_id).first()
    if existing:
        return
    db.add(Block(blocker_id=user.id, blocked_id=other_user_id))
    db.commit()


def unblock_user(db: Session, user: User, other_user_id: int) -> None:
    existing = db.query(Block).filter(Block.blocker_id == user.id, Block.blocked_id == other_user_id).first()
    if existing:
        db.delete(existing)
        db.commit()


def list_blocked_users(db: Session, user: User) -> list[User]:
    rows = db.query(Block).filter(Block.blocker_id == user.id).all()
    blocked_ids = [r.blocked_id for r in rows]
    if not blocked_ids:
        return []
    return db.query(User).filter(User.id.in_(blocked_ids)).all()
