"""
Pydantic schemas for the Community/Discussions API.
"""
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import UserOut


class CommunityTopicOut(BaseModel):
    name: str
    default_module_id: str | None = None


class TopicsResponse(BaseModel):
    nlp: list[CommunityTopicOut]
    dl: list[CommunityTopicOut]


class ReplyOut(BaseModel):
    id: int
    discussion_id: int
    author: UserOut
    author_is_teacher: bool
    content: str
    created_at: datetime
    edited_at: datetime | None = None
    deleted: bool = False
    is_accepted: bool = False
    helpful_count: int = 0
    reacted_by_me: bool = False


class DiscussionSummaryOut(BaseModel):
    id: int
    title: str
    domain: str
    topic: str
    linked_module_id: str | None = None
    status: str
    author: UserOut
    reply_count: int = 0
    has_teacher_reply: bool = False
    is_saved: bool = False
    created_at: datetime
    updated_at: datetime


class DiscussionDetailOut(DiscussionSummaryOut):
    description: str
    accepted_reply_id: int | None = None
    replies: list[ReplyOut] = Field(default_factory=list)


class DiscussionListResponse(BaseModel):
    discussions: list[DiscussionSummaryOut]
    total: int


class CreateDiscussionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=6000)
    domain: str
    topic: str
    linked_module_id: str | None = None


class CreateReplyRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class AcceptReplyRequest(BaseModel):
    reply_id: int


class SaveToggleResponse(BaseModel):
    saved: bool


class NotificationOut(BaseModel):
    id: int
    notif_type: str
    reference_type: str
    reference_id: int
    content: str
    is_read: bool
    created_at: datetime
    actor: UserOut | None = None


class NotificationListResponse(BaseModel):
    notifications: list[NotificationOut]
    unread_count: int


class ReactionToggleResponse(BaseModel):
    reacted: bool
    helpful_count: int


class ReportRequest(BaseModel):
    target_type: str  # message | discussion | reply | user
    target_id: int
    reason: str = Field(..., min_length=1, max_length=1000)


class ReportResponse(BaseModel):
    id: int
    status: str


class BlockRequest(BaseModel):
    user_id: int


class BlockedUserOut(BaseModel):
    id: int
    username: str
