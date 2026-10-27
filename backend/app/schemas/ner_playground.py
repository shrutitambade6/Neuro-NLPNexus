from typing import Literal

from pydantic import BaseModel, Field, field_validator

# NER Lab Code Playground -- request/response shapes for POST
# /api/applications/ner-playground/run. See
# app/sandbox/ner_lab_runner.py (what actually executes the student's
# code) and app/services/ner_playground_service.py (the process that
# launches it as an isolated subprocess) for the real implementation.

MAX_CODE_CHARS = 8_000
MAX_TEXT_CHARS = 2_000


class NerPlaygroundRunRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=MAX_CODE_CHARS)
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    engine: Literal["rule_based", "spacy"] = "rule_based"

    @field_validator("code")
    @classmethod
    def _code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Code cannot be empty or whitespace-only.")
        return v

    @field_validator("text")
    @classmethod
    def _text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Text cannot be empty or whitespace-only.")
        return v


class PlaygroundEntityOut(BaseModel):
    text: str
    label: str
    start: int
    end: int


class PlaygroundEventOut(BaseModel):
    # "started" | "nlp_called" | "nlp_result" | "print" | "completed" | "error"
    # -- real events recorded during the actual execution, not a scripted
    # timeline. "line" is the real source line in the student's own code
    # when known (every print/nlp() call and the line an exception was
    # raised on all report a genuine line number via sys._getframe /
    # traceback introspection); it's None for events that aren't tied to
    # one specific line (e.g. "started"/"completed").
    kind: str
    line: int | None = None
    detail: str | None = None


class PlaygroundErrorOut(BaseModel):
    type: str
    message: str
    line: int | None = None


class NerPlaygroundRunResponse(BaseModel):
    # "ok" | "error" | "timeout" | "memory_exceeded"
    status: str
    stdout: str
    stdout_truncated: bool = False
    entities: list[PlaygroundEntityOut]
    events: list[PlaygroundEventOut]
    error: PlaygroundErrorOut | None = None
    elapsed_ms: int
    engine: str
