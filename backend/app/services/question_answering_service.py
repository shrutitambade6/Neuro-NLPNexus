from app.algorithms.question_answering import answer_question
from app.schemas.question_answering import QaResponse


def run_qa(context: str, question: str) -> QaResponse:
    return QaResponse(**answer_question(context, question))
