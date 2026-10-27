from pydantic import BaseModel, Field


class EditDistanceRequest(BaseModel):
    source: str = Field(..., min_length=1, max_length=60)
    target: str = Field(..., min_length=1, max_length=60)


class EditOperationOut(BaseModel):
    op: str
    source_char: str | None
    target_char: str | None
    source_index: int | None
    target_index: int | None


class EditDistanceResponse(BaseModel):
    source: str
    target: str
    distance: int
    matrix: list[list[int]]
    operations: list[EditOperationOut]
