from pydantic import BaseModel, Field


class SpamRequest(BaseModel):
    subject: str = Field(..., max_length=300)
    message: str = Field(..., min_length=1, max_length=4000)
    sender: str = Field(default="", max_length=200)


class SpamResponse(BaseModel):
    subject: str
    sender: str
    message: str
    classification: str
    score: int
    signals: list[str]
    method_note: str
