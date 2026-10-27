"""
Community/Discussions: subject-focused doubt-solving threads, separate
from private chat (see app/models/orm_models.py's module docstring for
why). Every function here requires an already-authenticated `User`
resolved by the caller, same convention as admin_service.py/chat_service.py.

Discussions are public to the whole learning community by design (the
user's own spec: "public subject discussions are visible to the relevant
learning community") — there is no per-discussion privacy check here,
unlike chat_service's conversations.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.algorithms.community_catalog import (
    TOPICS_BY_DOMAIN,
    valid_domains,
    valid_module_id,
    valid_topic_names,
)
from app.algorithms.moderation import (
    MAX_DISCUSSION_DESCRIPTION_LENGTH,
    MAX_DISCUSSION_TITLE_LENGTH,
    MAX_REPLY_LENGTH,
    RATE_LIMIT_MAX_ACTIONS,
    RATE_LIMIT_WINDOW_SECONDS,
    RateLimitExceeded,
    extract_mentions,
    validate_content,
)
from app.models.orm_models import (
    ActivityLog,
    Discussion,
    DiscussionReply,
    Notification,
    Report,
    ReplyReaction,
    SavedDiscussion,
    User,
)
from app.schemas.auth import UserOut
from app.schemas.community import (
    CommunityTopicOut,
    DiscussionDetailOut,
    DiscussionSummaryOut,
    NotificationOut,
    ReplyOut,
    TopicsResponse,
)

DISCUSSION_LIST_LIMIT = 100


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_topics() -> TopicsResponse:
    return TopicsResponse(
        nlp=[CommunityTopicOut(name=t.name, default_module_id=t.default_module_id) for t in TOPICS_BY_DOMAIN["nlp"]],
        dl=[CommunityTopicOut(name=t.name, default_module_id=t.default_module_id) for t in TOPICS_BY_DOMAIN["dl"]],
    )


def _validate_domain_topic(domain: str, topic: str, linked_module_id: str | None) -> None:
    if domain not in valid_domains():
        raise ValueError("Domain must be 'nlp' or 'dl'.")
    if topic not in valid_topic_names(domain):
        raise ValueError(f"'{topic}' isn't a recognized topic for {domain.upper()}.")
    if not valid_module_id(domain, linked_module_id):
        raise ValueError("That linked lab/module doesn't exist for this domain.")


def _reply_counts(db: Session, discussion_ids: list[int]) -> dict[int, tuple[int, bool]]:
    """Returns {discussion_id: (reply_count, has_teacher_reply)} for a
    batch of discussions in one query each, rather than N+1 per-row
    queries, since a discussion list page can easily show 20+ rows."""
    if not discussion_ids:
        return {}
    rows = (
        db.query(DiscussionReply.discussion_id, DiscussionReply.author_id, User.role)
        .join(User, User.id == DiscussionReply.author_id)
        .filter(DiscussionReply.discussion_id.in_(discussion_ids), DiscussionReply.deleted.is_(False))
        .all()
    )
    result: dict[int, tuple[int, bool]] = {did: (0, False) for did in discussion_ids}
    counts: dict[int, int] = {}
    teacher_flags: dict[int, bool] = {}
    for discussion_id, _author_id, role in rows:
        counts[discussion_id] = counts.get(discussion_id, 0) + 1
        if role == "admin":
            teacher_flags[discussion_id] = True
    for did in discussion_ids:
        result[did] = (counts.get(did, 0), teacher_flags.get(did, False))
    return result


def _saved_ids(db: Session, user_id: int, discussion_ids: list[int]) -> set[int]:
    if not discussion_ids:
        return set()
    rows = (
        db.query(SavedDiscussion.discussion_id)
        .filter(SavedDiscussion.user_id == user_id, SavedDiscussion.discussion_id.in_(discussion_ids))
        .all()
    )
    return {r[0] for r in rows}


def _to_summary(discussion: Discussion, reply_count: int, has_teacher_reply: bool, is_saved: bool) -> DiscussionSummaryOut:
    return DiscussionSummaryOut(
        id=discussion.id,
        title=discussion.title,
        domain=discussion.domain,
        topic=discussion.topic,
        linked_module_id=discussion.linked_module_id,
        status=discussion.status,
        author=UserOut.model_validate(discussion.author),
        reply_count=reply_count,
        has_teacher_reply=has_teacher_reply,
        is_saved=is_saved,
        created_at=discussion.created_at,
        updated_at=discussion.updated_at,
    )


def list_discussions(
    db: Session,
    viewer: User,
    *,
    domain: str | None = None,
    topic: str | None = None,
    status: str | None = None,
    mine: bool = False,
    participated: bool = False,
    saved_only: bool = False,
    teacher_responded: bool | None = None,
) -> list[DiscussionSummaryOut]:
    q = db.query(Discussion).filter(Discussion.deleted.is_(False))
    if domain:
        q = q.filter(Discussion.domain == domain)
    if topic:
        q = q.filter(Discussion.topic == topic)
    if status:
        q = q.filter(Discussion.status == status)
    if mine:
        q = q.filter(Discussion.author_id == viewer.id)
    if participated:
        replied_ids = {
            r[0]
            for r in db.query(DiscussionReply.discussion_id)
            .filter(DiscussionReply.author_id == viewer.id)
            .distinct()
            .all()
        }
        if not replied_ids:
            return []
        q = q.filter(Discussion.id.in_(replied_ids))
    if saved_only:
        saved_ids = {
            r[0] for r in db.query(SavedDiscussion.discussion_id).filter(SavedDiscussion.user_id == viewer.id).all()
        }
        if not saved_ids:
            return []
        q = q.filter(Discussion.id.in_(saved_ids))

    rows = q.order_by(Discussion.updated_at.desc()).limit(DISCUSSION_LIST_LIMIT).all()
    ids = [d.id for d in rows]
    counts = _reply_counts(db, ids)
    saved = _saved_ids(db, viewer.id, ids)

    summaries = []
    for d in rows:
        reply_count, has_teacher_reply = counts.get(d.id, (0, False))
        if teacher_responded is not None and has_teacher_reply != teacher_responded:
            continue
        summaries.append(_to_summary(d, reply_count, has_teacher_reply, d.id in saved))
    return summaries


def _enforce_contribution_rate_limit(db: Session, user_id: int) -> None:
    window_start = _utcnow() - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
    discussion_count = (
        db.query(Discussion).filter(Discussion.author_id == user_id, Discussion.created_at >= window_start).count()
    )
    reply_count = (
        db.query(DiscussionReply)
        .filter(DiscussionReply.author_id == user_id, DiscussionReply.created_at >= window_start)
        .count()
    )
    if discussion_count + reply_count >= RATE_LIMIT_MAX_ACTIONS:
        raise RateLimitExceeded("Too many posts too quickly — please slow down.")


def _notify_mentions(db: Session, content: str, actor: User, reference_type: str, reference_id: int, context: str) -> None:
    usernames = extract_mentions(content)
    if not usernames:
        return
    mentioned_users = db.query(User).filter(User.username.in_(usernames), User.id != actor.id).all()
    for mentioned in mentioned_users:
        db.add(
            Notification(
                user_id=mentioned.id,
                actor_id=actor.id,
                notif_type="mention",
                reference_type=reference_type,
                reference_id=reference_id,
                content=f"{actor.username} mentioned you in {context}.",
            )
        )


def create_discussion(
    db: Session, author: User, title: str, description: str, domain: str, topic: str, linked_module_id: str | None
) -> Discussion:
    _validate_domain_topic(domain, topic, linked_module_id)
    _enforce_contribution_rate_limit(db, author.id)

    clean_title = validate_content(title, max_length=MAX_DISCUSSION_TITLE_LENGTH, field_name="title")
    clean_description = validate_content(
        description, max_length=MAX_DISCUSSION_DESCRIPTION_LENGTH, field_name="description"
    )

    discussion = Discussion(
        author_id=author.id,
        title=clean_title,
        description=clean_description,
        domain=domain,
        topic=topic,
        linked_module_id=linked_module_id,
    )
    db.add(discussion)
    db.commit()
    db.refresh(discussion)

    _notify_mentions(db, clean_description, author, "discussion", discussion.id, f'"{clean_title}"')
    db.commit()
    return discussion


def _reaction_info(db: Session, reply_ids: list[int], viewer_id: int) -> dict[int, tuple[int, bool]]:
    """{reply_id: (helpful_count, reacted_by_me)} for a batch of replies in
    one query, same batching approach as _reply_counts."""
    if not reply_ids:
        return {}
    rows = db.query(ReplyReaction.reply_id, ReplyReaction.user_id).filter(ReplyReaction.reply_id.in_(reply_ids)).all()
    counts: dict[int, int] = {}
    mine: dict[int, bool] = {}
    for reply_id, user_id in rows:
        counts[reply_id] = counts.get(reply_id, 0) + 1
        if user_id == viewer_id:
            mine[reply_id] = True
    return {rid: (counts.get(rid, 0), mine.get(rid, False)) for rid in reply_ids}


def _to_reply_out(
    reply: DiscussionReply, accepted_reply_id: int | None, helpful_count: int = 0, reacted_by_me: bool = False
) -> ReplyOut:
    return ReplyOut(
        id=reply.id,
        discussion_id=reply.discussion_id,
        author=UserOut.model_validate(reply.author),
        author_is_teacher=reply.author.role == "admin",
        content="This reply was deleted." if reply.deleted else reply.content,
        created_at=reply.created_at,
        edited_at=reply.edited_at,
        deleted=reply.deleted,
        is_accepted=(reply.id == accepted_reply_id),
        helpful_count=helpful_count,
        reacted_by_me=reacted_by_me,
    )


def get_discussion_detail(db: Session, viewer: User, discussion_id: int) -> DiscussionDetailOut:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id, Discussion.deleted.is_(False)).first()
    if not discussion:
        raise ValueError("Discussion not found.")

    replies = (
        db.query(DiscussionReply)
        .filter(DiscussionReply.discussion_id == discussion_id)
        .order_by(DiscussionReply.id.asc())
        .all()
    )
    reply_count, has_teacher_reply = _reply_counts(db, [discussion_id]).get(discussion_id, (0, False))
    is_saved = discussion_id in _saved_ids(db, viewer.id, [discussion_id])
    reactions = _reaction_info(db, [r.id for r in replies], viewer.id)

    return DiscussionDetailOut(
        id=discussion.id,
        title=discussion.title,
        domain=discussion.domain,
        topic=discussion.topic,
        linked_module_id=discussion.linked_module_id,
        status=discussion.status,
        author=UserOut.model_validate(discussion.author),
        reply_count=reply_count,
        has_teacher_reply=has_teacher_reply,
        is_saved=is_saved,
        created_at=discussion.created_at,
        updated_at=discussion.updated_at,
        description=discussion.description,
        accepted_reply_id=discussion.accepted_reply_id,
        replies=[
            _to_reply_out(r, discussion.accepted_reply_id, *reactions.get(r.id, (0, False))) for r in replies
        ],
    )


def create_reply(db: Session, author: User, discussion_id: int, content: str) -> tuple[DiscussionReply, Discussion]:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id, Discussion.deleted.is_(False)).first()
    if not discussion:
        raise ValueError("Discussion not found.")

    _enforce_contribution_rate_limit(db, author.id)
    cleaned = validate_content(content, max_length=MAX_REPLY_LENGTH, field_name="reply")

    reply = DiscussionReply(discussion_id=discussion.id, author_id=author.id, content=cleaned)
    db.add(reply)
    discussion.updated_at = _utcnow()
    db.commit()
    db.refresh(reply)

    if discussion.author_id != author.id:
        notif_type = "teacher_response" if author.role == "admin" else "reply"
        db.add(
            Notification(
                user_id=discussion.author_id,
                actor_id=author.id,
                notif_type=notif_type,
                reference_type="discussion",
                reference_id=discussion.id,
                content=f'{author.username} replied to your discussion "{discussion.title}".',
            )
        )

    _notify_mentions(db, cleaned, author, "discussion", discussion.id, f'a reply on "{discussion.title}"')
    db.commit()
    db.refresh(reply)
    return reply, discussion


def accept_reply(db: Session, user: User, discussion_id: int, reply_id: int) -> Discussion:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id, Discussion.deleted.is_(False)).first()
    if not discussion:
        raise ValueError("Discussion not found.")
    if discussion.author_id != user.id:
        raise PermissionError("Only the person who asked can mark an answer as accepted.")

    reply = (
        db.query(DiscussionReply)
        .filter(DiscussionReply.id == reply_id, DiscussionReply.discussion_id == discussion_id, DiscussionReply.deleted.is_(False))
        .first()
    )
    if not reply:
        raise ValueError("That reply doesn't belong to this discussion.")

    discussion.accepted_reply_id = reply.id
    discussion.status = "answered"
    discussion.updated_at = _utcnow()

    db.add(
        ActivityLog(
            user_id=user.id,
            activity_type="discussion_answered",
            domain=discussion.domain,
            activity_reference=f"discussion-{discussion.id}",
            detail=f'Marked an answer as accepted in "{discussion.title}".',
        )
    )
    if reply.author_id != user.id:
        db.add(
            ActivityLog(
                user_id=reply.author_id,
                activity_type="discussion_answer_accepted",
                domain=discussion.domain,
                activity_reference=f"discussion-{discussion.id}",
                detail=f'Your reply was marked as the accepted answer in "{discussion.title}".',
            )
        )
        db.add(
            Notification(
                user_id=reply.author_id,
                actor_id=user.id,
                notif_type="accepted_answer",
                reference_type="discussion",
                reference_id=discussion.id,
                content=f'Your answer was marked accepted in "{discussion.title}".',
            )
        )

    db.commit()
    db.refresh(discussion)
    return discussion


def toggle_saved(db: Session, user: User, discussion_id: int) -> bool:
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id, Discussion.deleted.is_(False)).first()
    if not discussion:
        raise ValueError("Discussion not found.")

    existing = (
        db.query(SavedDiscussion)
        .filter(SavedDiscussion.user_id == user.id, SavedDiscussion.discussion_id == discussion_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return False

    db.add(SavedDiscussion(user_id=user.id, discussion_id=discussion_id))
    db.commit()
    return True


def list_notifications(db: Session, user: User, unread_only: bool = False) -> tuple[list[NotificationOut], int]:
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    rows = q.order_by(Notification.id.desc()).limit(100).all()
    unread_count = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).count()

    out = [
        NotificationOut(
            id=n.id,
            notif_type=n.notif_type,
            reference_type=n.reference_type,
            reference_id=n.reference_id,
            content=n.content,
            is_read=n.is_read,
            created_at=n.created_at,
            actor=UserOut.model_validate(n.actor) if n.actor else None,
        )
        for n in rows
    ]
    return out, unread_count


def mark_notification_read(db: Session, user: User, notification_id: int) -> None:
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not notif:
        raise ValueError("Notification not found.")
    notif.is_read = True
    db.commit()


def mark_all_notifications_read(db: Session, user: User) -> int:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return updated


def toggle_reaction(db: Session, user: User, reply_id: int) -> tuple[bool, int]:
    """Toggles the one "Helpful" reaction a user can leave on a reply.
    Deliberately a single reaction type — this is a doubt-solving thread,
    not a social feed with a picker of five emoji."""
    reply = db.query(DiscussionReply).filter(DiscussionReply.id == reply_id, DiscussionReply.deleted.is_(False)).first()
    if not reply:
        raise ValueError("Reply not found.")

    existing = (
        db.query(ReplyReaction).filter(ReplyReaction.reply_id == reply_id, ReplyReaction.user_id == user.id).first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        reacted = False
    else:
        db.add(ReplyReaction(reply_id=reply_id, user_id=user.id))
        db.commit()
        reacted = True

    count = db.query(ReplyReaction).filter(ReplyReaction.reply_id == reply_id).count()
    return reacted, count


def create_report(db: Session, reporter: User, target_type: str, target_id: int, reason: str) -> Report:
    valid_targets = {"message", "discussion", "reply", "user"}
    if target_type not in valid_targets:
        raise ValueError(f"target_type must be one of {sorted(valid_targets)}.")
    cleaned_reason = validate_content(reason, max_length=1000, field_name="reason")
    report = Report(reporter_id=reporter.id, target_type=target_type, target_id=target_id, reason=cleaned_reason)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
