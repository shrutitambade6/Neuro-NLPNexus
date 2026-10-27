from app.algorithms.spam_detection import analyze_email
from app.schemas.spam_detection import SpamResponse


def run_spam_check(subject: str, message: str, sender: str) -> SpamResponse:
    return SpamResponse(**analyze_email(subject, message, sender))
