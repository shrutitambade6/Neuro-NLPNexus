"""
Pydantic schemas for the private 1:1 chat API. Participant/sender info
reuses the existing UserOut (app/schemas/auth.py) rather than a second,
slightly-different "user summary" shape — one definition of "what a user
looks like over the API" for the whole app.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import UserOut


class UserSearchResultOut(UserOut):
    # Layered onto UserOut rather than duplicating its fields — adds the
    # one piece of information a "search for a user to message" result
    # needs that a plain UserOut doesn't carry.
    is_online: bool = False


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime
    edited_at: datetime | None = None
    deleted: bool = False
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationSummaryOut(BaseModel):
    id: int
    other_user: UserOut
    is_online: bool = False
    last_message_preview: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummaryOut]


class StartConversationRequest(BaseModel):
    other_user_id: int


class MessageListResponse(BaseModel):
    conversation_id: int
    other_user: UserOut
    is_online: bool = False
    messages: list[MessageOut]
    has_more: bool = False


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class EditMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class UserSearchResponse(BaseModel):
    users: list[UserSearchResultOut]
