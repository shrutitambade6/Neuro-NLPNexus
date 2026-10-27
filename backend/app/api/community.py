"""
Community/Discussions REST API. Discussions and replies are readable by
any authenticated user (public to the learning community); writes
(creating a discussion/reply, accepting an answer, saving) all require
require_user, same as every other student-facing write in this app.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.algorithms.moderation import RateLimitExceeded
from app.api.deps import require_user
from app.database import get_db
from app.models.orm_models import User
from app.schemas.community import (
    AcceptReplyRequest,
    CreateDiscussionRequest,
    CreateReplyRequest,
    DiscussionDetailOut,
    DiscussionListResponse,
    DiscussionSummaryOut,
    NotificationListResponse,
    ReactionToggleResponse,
    ReplyOut,
    ReportRequest,
    ReportResponse,
    SaveToggleResponse,
    TopicsResponse,
)
from app.services import community_service
from app.services.connection_manager import connection_manager

router = APIRouter()


@router.get("/community/topics", response_model=TopicsResponse)
def topics_endpoint() -> TopicsResponse:
    return community_service.get_topics()


@router.get("/community/discussions", response_model=DiscussionListResponse)
def list_discussions_endpoint(
    domain: str | None = Query(None),
    topic: str | None = Query(None),
    status: str | None = Query(None),
    mine: bool = Query(False),
    participated: bool = Query(False),
    saved: bool = Query(False),
    teacher_responded: bool | None = Query(None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> DiscussionListResponse:
    discussions = community_service.list_discussions(
        db,
        user,
        domain=domain,
        topic=topic,
        status=status,
        mine=mine,
        participated=participated,
        saved_only=saved,
        teacher_responded=teacher_responded,
    )
    return DiscussionListResponse(discussions=discussions, total=len(discussions))


@router.post("/community/discussions", response_model=DiscussionDetailOut, status_code=201)
async def create_discussion_endpoint(
    payload: CreateDiscussionRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> DiscussionDetailOut:
    try:
        discussion = community_service.create_discussion(
            db, user, payload.title, payload.description, payload.domain, payload.topic, payload.linked_module_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RateLimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    detail = community_service.get_discussion_detail(db, user, discussion.id)
    await connection_manager.send_to_user(
        user.id, {"type": "discussion.created", "discussion": detail.model_dump(mode="json")}
    )
    return detail


@router.get("/community/discussions/{discussion_id}", response_model=DiscussionDetailOut)
def get_discussion_endpoint(
    discussion_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> DiscussionDetailOut:
    try:
        return community_service.get_discussion_detail(db, user, discussion_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/community/discussions/{discussion_id}/replies", response_model=ReplyOut, status_code=201)
async def create_reply_endpoint(
    discussion_id: int, payload: CreateReplyRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> ReplyOut:
    try:
        reply, discussion = community_service.create_reply(db, user, discussion_id, payload.content)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RateLimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    reply_out = community_service._to_reply_out(reply, discussion.accepted_reply_id)
    # Push to the discussion's author (if they're not the one replying) and
    # to the replier's own other tabs — anyone else just sees it next time
    # they open/refresh the discussion, same as a fresh page load would
    # show it, since this isn't a chat window they're staring at.
    if discussion.author_id != user.id:
        await connection_manager.send_to_user(
            discussion.author_id,
            {"type": "discussion.reply", "discussion_id": discussion_id, "reply": reply_out.model_dump(mode="json")},
        )
    await connection_manager.send_to_user(
        user.id, {"type": "discussion.reply", "discussion_id": discussion_id, "reply": reply_out.model_dump(mode="json")}
    )
    return reply_out


@router.post("/community/discussions/{discussion_id}/accept", response_model=DiscussionDetailOut)
async def accept_reply_endpoint(
    discussion_id: int, payload: AcceptReplyRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> DiscussionDetailOut:
    try:
        discussion = community_service.accept_reply(db, user, discussion_id, payload.reply_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    detail = community_service.get_discussion_detail(db, user, discussion_id)
    accepted_reply = next((r for r in detail.replies if r.id == payload.reply_id), None)
    if accepted_reply:
        await connection_manager.send_to_user(
            accepted_reply.author.id,
            {"type": "discussion.accepted", "discussion_id": discussion_id, "discussion": detail.model_dump(mode="json")},
        )
    return detail


@router.post("/community/discussions/{discussion_id}/save", response_model=SaveToggleResponse)
def toggle_saved_endpoint(
    discussion_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> SaveToggleResponse:
    try:
        saved = community_service.toggle_saved(db, user, discussion_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return SaveToggleResponse(saved=saved)


@router.get("/community/notifications", response_model=NotificationListResponse)
def list_notifications_endpoint(
    unread_only: bool = Query(False), user: User = Depends(require_user), db: Session = Depends(get_db)
) -> NotificationListResponse:
    notifications, unread_count = community_service.list_notifications(db, user, unread_only)
    return NotificationListResponse(notifications=notifications, unread_count=unread_count)


@router.post("/community/notifications/{notification_id}/read")
def mark_notification_read_endpoint(
    notification_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> dict:
    try:
        community_service.mark_notification_read(db, user, notification_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@router.post("/community/notifications/read-all")
def mark_all_notifications_read_endpoint(user: User = Depends(require_user), db: Session = Depends(get_db)) -> dict:
    count = community_service.mark_all_notifications_read(db, user)
    return {"marked_read": count}


@router.post("/community/replies/{reply_id}/reactions", response_model=ReactionToggleResponse)
def toggle_reaction_endpoint(
    reply_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> ReactionToggleResponse:
    try:
        reacted, count = community_service.toggle_reaction(db, user, reply_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ReactionToggleResponse(reacted=reacted, helpful_count=count)


@router.post("/community/reports", response_model=ReportResponse, status_code=201)
def create_report_endpoint(
    payload: ReportRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> ReportResponse:
    try:
        report = community_service.create_report(db, user, payload.target_type, payload.target_id, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ReportResponse(id=report.id, status=report.status)
