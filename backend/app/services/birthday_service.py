"""
Birthday Experience — a self-contained celebration layer bolted onto the
existing user/chat/notification systems, not a parallel one (per the
spec's explicit "integrate into the existing architecture" instruction).

Three deliberate design choices worth calling out:

1. There is no stored "isBirthdayToday" flag anywhere, and no cron job.
   Every check in this file is computed LIVE from `User.birthday` +
   `User.timezone` against the current moment. That's what makes the
   24-hour window start and end exactly on the user's own calendar day
   with zero extra machinery — there's nothing to "turn off" at midnight,
   because there was never anything persisted that could get stuck on.

2. "Legitimate relationship" (point 10) is checked against data that
   already exists for an unrelated reason — a real `Conversation` row, or
   the admin/teacher role — never a new friends/followers table. A
   student's birthday is visible to: everyone they already have a chat
   conversation with, and every teacher/admin account (this app has no
   per-teacher roster; every admin already sees every student elsewhere,
   e.g. admin_service.list_students, so this matches that existing rule
   rather than inventing a narrower one). A teacher's birthday, symmetrically,
   is visible to every student plus anyone they already chat with.

3. Birthday wishes are sent as REAL chat messages via chat_service
   (point 13: "use the existing chat/message infrastructure"). The
   Notification table is reused for both the "it's so-and-so's birthday"
   alert (notif_type="birthday") and the "X sent you a wish" alert
   (notif_type="birthday_wish") — two new string values on an existing
   column, not a new table.
"""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.orm_models import Conversation, Notification, User
from app.schemas.birthday import BirthdayWishOut, RelatedBirthdayOut
from app.services import chat_service

DEFAULT_TIMEZONE = "UTC"
MAX_WISH_LENGTH = 300


def _safe_zone(tz_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or DEFAULT_TIMEZONE)
    except Exception:
        # An unrecognized/garbled zone name should never 500 a login —
        # fall back to UTC rather than raising (point 4 only promises
        # "the user's appropriate timezone," which UTC trivially satisfies
        # as a safe default when the real one can't be resolved).
        return ZoneInfo(DEFAULT_TIMEZONE)


def local_today(user: User) -> date:
    """`today` in the USER's own timezone, not the server's/UTC's (point
    4) — comparing raw UTC dates could start or end the birthday
    experience on the wrong calendar day for anyone not near UTC+0."""
    return datetime.now(_safe_zone(user.timezone)).date()


def celebration_date_this_year(birthday: date, year: int) -> date:
    """Point 18: a Feb 29 birthday celebrates on Feb 28 in a non-leap
    year. Centralized here — the one function every other check in this
    file calls — rather than re-implemented ad hoc at each comparison
    site, so this rule only has to be documented and gotten right once."""
    month, day = birthday.month, birthday.day
    if month == 2 and day == 29:
        is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
        if not is_leap:
            day = 28
    return date(year, month, day)


def is_birthday_today(user: User) -> bool:
    if not user.birthday:
        return False
    today = local_today(user)
    return celebration_date_this_year(user.birthday, today.year) == today


def set_birthday(db: Session, user: User, birthday: date | None, tz_name: str | None = None) -> User:
    """Settings → Account & Privacy: add / change / remove. Removing (an
    explicit `birthday=None`) immediately makes is_birthday_today() start
    returning False again — "if birthday is removed, the celebration
    feature should stop working" (point 22) needs no extra code, it falls
    straight out of birthday being the only source of truth."""
    user.birthday = birthday
    if tz_name:
        user.timezone = tz_name
    db.commit()
    db.refresh(user)
    return user


def _relationship_kind(viewer: User, other: User) -> str | None:
    if viewer.id == other.id:
        return None
    if viewer.role == "admin" and other.role == "student":
        return "student"  # from the teacher's point of view, `other` is a student
    if viewer.role == "student" and other.role == "admin":
        return "teacher"
    return None


def _has_chat_relationship(db: Session, user_a_id: int, user_b_id: int) -> bool:
    a_id, b_id = (user_a_id, user_b_id) if user_a_id < user_b_id else (user_b_id, user_a_id)
    return (
        db.query(Conversation)
        .filter(Conversation.user_a_id == a_id, Conversation.user_b_id == b_id)
        .first()
        is not None
    )


def _has_relationship(db: Session, viewer: User, other: User) -> bool:
    """Point 10's "legitimate relationship" check, used both to decide who
    gets notified about a birthday and to gate POST /api/birthday/wish —
    so a wish can never be sent to (or really, a notification never sent
    about) someone with no real connection to the sender."""
    if viewer.id == other.id:
        return False
    if _relationship_kind(viewer, other) is not None:
        return True
    return _has_chat_relationship(db, viewer.id, other.id)


def _relationships_with_kind(db: Session, user: User) -> list[tuple[User, str]]:
    """Every OTHER user who has a legitimate relationship to `user`, each
    tagged with why ("chat", "teacher", or "student") so the frontend can
    phrase a banner appropriately without a second lookup."""
    related: dict[int, tuple[User, str]] = {}

    convo_rows = (
        db.query(Conversation)
        .filter(or_(Conversation.user_a_id == user.id, Conversation.user_b_id == user.id))
        .all()
    )
    for convo in convo_rows:
        other = convo.user_b if convo.user_a_id == user.id else convo.user_a
        related[other.id] = (other, "chat")

    if user.role == "student":
        for teacher in db.query(User).filter(User.role == "admin").all():
            related.setdefault(teacher.id, (teacher, "teacher"))
    elif user.role == "admin":
        for student in db.query(User).filter(User.role == "student").all():
            related.setdefault(student.id, (student, "student"))

    return list(related.values())


def list_related_birthdays_today(db: Session, viewer: User) -> list[RelatedBirthdayOut]:
    """People `viewer` has a real relationship with whose birthday is
    today — powers the friend/teacher-facing notification, the chat
    conversation banner, and the dashboard "someone you know" surfaces,
    all from one call. Never includes `viewer`'s own birthday (that's
    `is_my_birthday` on the same response, handled by the API layer) and
    never includes anyone's actual date of birth (point 2/24) — only the
    derived yes/no plus username."""
    return [
        RelatedBirthdayOut(user_id=other.id, username=other.username, relationship=kind)
        for other, kind in _relationships_with_kind(db, viewer)
        if is_birthday_today(other)
    ]


def _utc_midnight_for(user: User) -> datetime:
    """The start of `user`'s current local day, expressed in naive UTC —
    what `Notification.created_at` (stored via utcnow(), naive) needs to
    be compared against so "sent today" means the user's today, not the
    server's."""
    zone = _safe_zone(user.timezone)
    local_midnight = datetime.combine(local_today(user), datetime.min.time(), tzinfo=zone)
    return local_midnight.astimezone(timezone.utc).replace(tzinfo=None)


def _already_notified_today(db: Session, recipient_id: int, birthday_user: User) -> bool:
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == recipient_id,
            Notification.actor_id == birthday_user.id,
            Notification.notif_type == "birthday",
            Notification.created_at >= _utc_midnight_for(birthday_user),
        )
        .first()
        is not None
    )


def notify_relevant_users(db: Session, birthday_user: User) -> int:
    """Called from auth_service.login_user — "on every login/session"
    (point 4) is the trigger, not a scheduled job. Point 20's anti-spam
    rule ("one birthday notification per relevant recipient") is enforced
    by _already_notified_today rather than by only running this once
    globally, so logging in multiple times on your birthday is harmless."""
    if not is_birthday_today(birthday_user):
        return 0
    created = 0
    for other, _kind in _relationships_with_kind(db, birthday_user):
        if _already_notified_today(db, other.id, birthday_user):
            continue
        db.add(
            Notification(
                user_id=other.id,
                actor_id=birthday_user.id,
                notif_type="birthday",
                reference_type="user",
                reference_id=birthday_user.id,
                content=f"Today is {birthday_user.username}'s birthday.",
            )
        )
        created += 1
    if created:
        db.commit()
    return created


def send_wish(db: Session, sender: User, to_user_id: int, message: str) -> tuple["chat_service.MessageOut", int]:
    """Delivers a birthday wish as a REAL chat message (point 13), then
    records a `birthday_wish` notification so the recipient's "Birthday
    Wishes" panel (list_wishes_today) can find it without re-parsing chat
    history. Returns (the sent message, the conversation id) so the API
    layer can push the same live WebSocket event chat.py's own send-
    message endpoint does."""
    to_user = db.query(User).filter(User.id == to_user_id).first()
    if not to_user:
        raise ValueError("That user doesn't exist.")
    if to_user.id == sender.id:
        raise ValueError("You can't send yourself a birthday wish.")
    if not is_birthday_today(to_user):
        raise ValueError("It's not this person's birthday today.")
    if not _has_relationship(db, sender, to_user):
        raise PermissionError("You can only send a birthday wish to someone you already have a connection with.")

    clean = (message or "").strip()
    if not clean:
        raise ValueError("Write a short birthday message first.")
    if len(clean) > MAX_WISH_LENGTH:
        raise ValueError(f"Keep it a little shorter — {MAX_WISH_LENGTH} characters max.")

    convo = chat_service.get_or_create_conversation(db, sender, to_user_id)
    sent_message, _other = chat_service.send_message(db, sender, convo.id, clean)

    db.add(
        Notification(
            user_id=to_user_id,
            actor_id=sender.id,
            notif_type="birthday_wish",
            reference_type="conversation",
            reference_id=convo.id,
            content=clean[:255],
        )
    )
    db.commit()
    return sent_message, convo.id


def list_wishes_today(db: Session, user: User) -> list[BirthdayWishOut]:
    """Wishes are deliberately scoped to "today's celebration" (point 17):
    once the user's birthday day ends, this starts returning an empty
    list again with no cleanup job — next year's wishes will simply be
    newer rows past that boundary. Old rows are never deleted; they just
    stop being "today's" wishes."""
    if not is_birthday_today(user):
        return []
    rows = (
        db.query(Notification)
        .filter(
            Notification.user_id == user.id,
            Notification.notif_type == "birthday_wish",
            Notification.created_at >= _utc_midnight_for(user),
        )
        .order_by(Notification.created_at.asc())
        .all()
    )
    return [
        BirthdayWishOut(
            from_username=n.actor.username if n.actor else "Someone",
            # Point 12/13: a teacher's wish is labeled distinctly ("teacher")
            # from a friend's ("friend") without exposing anything about the
            # teacher account beyond that role, which is already public
            # elsewhere (e.g. Teacher Dashboard being admin-only is not a
            # secret).
            from_role="teacher" if (n.actor and n.actor.role == "admin") else "friend",
            message=n.content,
            created_at=n.created_at,
        )
        for n in rows
    ]
