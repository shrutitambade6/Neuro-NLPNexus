from sqlalchemy.orm import Session

from app.algorithms.challenges import DL_CHALLENGE_SPECS, check_answer, compute_dl_challenge_answer
from app.models.orm_models import Challenge, ChallengeAttempt, User
from app.schemas.challenges import AttemptResponse, ChallengeOut, MyProgressResponse

DL_MODULES = ("dl-foundations", "cnn", "rnn", "attention")


def seed_dl_challenges(db: Session) -> None:
    """Idempotent: only inserts the DL challenge set if none of its module
    tags are present yet, so restarting the backend doesn't duplicate rows.
    Every answer_json here is the real, freshly computed output of the
    actual algorithm the prompt describes (see compute_dl_challenge_answer)
    — nothing is a hand-typed guess at what the answer should be."""
    already_seeded = db.query(Challenge).filter(Challenge.module.in_(DL_MODULES)).first()
    if already_seeded:
        return
    for spec in DL_CHALLENGE_SPECS:
        answer = compute_dl_challenge_answer(spec["prompt"])
        db.add(
            Challenge(
                module=spec["module"],
                difficulty=spec["difficulty"],
                prompt_json=spec["prompt"],
                answer_json=answer,
                xp_value=spec["xp_value"],
            )
        )
    db.commit()


def list_dl_challenges(db: Session) -> list[ChallengeOut]:
    rows = db.query(Challenge).filter(Challenge.module.in_(DL_MODULES)).order_by(Challenge.id).all()
    return [
        ChallengeOut(id=r.id, module=r.module, difficulty=r.difficulty, prompt=r.prompt_json, xp_value=r.xp_value)
        for r in rows
    ]


def attempt_dl_challenge(db: Session, user: User, challenge_id: int, submitted_answer) -> AttemptResponse:
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id, Challenge.module.in_(DL_MODULES)).first()
    if not challenge:
        raise ValueError("Challenge not found.")

    correct = check_answer(submitted_answer, challenge.answer_json)
    xp_awarded = challenge.xp_value if correct else 0
    score = xp_awarded

    db.add(
        ChallengeAttempt(
            user_id=user.id,
            challenge_id=challenge.id,
            correct=correct,
            score=score,
            xp_awarded=xp_awarded,
        )
    )
    db.commit()

    return AttemptResponse(correct=correct, correct_answer=challenge.answer_json, xp_awarded=xp_awarded, score=score)


def get_my_dl_progress(db: Session, user: User) -> MyProgressResponse:
    """A real, computed-on-request summary of this user's DL Challenge
    attempts — queried live from the ChallengeAttempt rows attempt_dl_challenge
    actually wrote, never a cached or estimated figure. 'solved' counts each
    challenge at most once (a challenge re-solved after an earlier wrong
    attempt only counts once), matching how a student would expect their
    progress to read."""
    attempts = (
        db.query(ChallengeAttempt)
        .join(Challenge, Challenge.id == ChallengeAttempt.challenge_id)
        .filter(ChallengeAttempt.user_id == user.id, Challenge.module.in_(DL_MODULES))
        .all()
    )
    solved_challenge_ids = {a.challenge_id for a in attempts if a.correct}
    total_xp = 0
    for challenge_id in solved_challenge_ids:
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if challenge:
            total_xp += challenge.xp_value
    total_challenges = db.query(Challenge).filter(Challenge.module.in_(DL_MODULES)).count()

    return MyProgressResponse(
        attempted=len({a.challenge_id for a in attempts}),
        solved=len(solved_challenge_ids),
        total_xp=total_xp,
        total_challenges=total_challenges,
    )
