"""
Birthday Experience schemas. Deliberately split into an owner-only shape
(BirthdayMeOut, with the real date) and everyone-else-facing shapes
(RelatedBirthdayOut, BirthdayStatusOut) that only ever carry a derived
`is_birthday_today: bool` — never the raw birthday/year (spec point 2/24:
"NEVER publicly display full date of birth").
"""
from datetime import date, datetime

from pydantic import BaseModel, Field


class BirthdayMeOut(BaseModel):
    """GET/PATCH /api/users/me/birthday response — owner-only. The one
    place in this API the real `birthday` date is ever returned."""
    birthday: date | None = None
    timezone: str = "UTC"
    is_birthday_today: bool = False


class BirthdayUpdateRequest(BaseModel):
    # `birthday: None` is a valid, meaningful value here — it's how
    # Settings removes a previously-set birthday (point 22), so this
    # field must stay optional-but-present rather than "omit to clear."
    birthday: date | None = None
    timezone: str | None = Field(None, max_length=64)


class RelatedBirthdayOut(BaseModel):
    """One person, related to the viewer, whose birthday is today. Used
    for the friend/teacher notification surface and the chat banner —
    `relationship` is "chat" | "teacher" | "student", purely so the UI can
    phrase things like "your teacher" vs "a friend" without a second call."""
    user_id: int
    username: str
    relationship: str


class BirthdayStatusOut(BaseModel):
    """GET /api/birthday/today — "is it my birthday, and who I know is
    celebrating today."""
    is_my_birthday: bool
    related_birthdays_today: list[RelatedBirthdayOut] = []


class BirthdayWishOut(BaseModel):
    from_username: str
    from_role: str  # "friend" | "teacher"
    message: str
    created_at: datetime


class BirthdayWishesResponse(BaseModel):
    wishes: list[BirthdayWishOut]


class SendBirthdayWishRequest(BaseModel):
    to_user_id: int
    message: str = Field(..., min_length=1, max_length=300)
