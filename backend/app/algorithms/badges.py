"""
Badge computation — pure function, no database or ORM imports, matching
this project's algorithms (pure) -> services (I/O) convention.

Badges are NOT a stored table. The user's own spec says to keep the
database minimal, and every badge here is fully determined by rows that
already exist in `learning_progress` and `quiz_results` — persisting a
fourth "badges earned" table would just be a cache of something this
function can recompute exactly, every time, for free. The one piece that
IS persisted is an `activity_log` row of type "badge_earned", written by
app/services/progress_service.py the moment a call to this function
reports a badge that wasn't present before — that's what lets "recently
earned a badge" show up in the real activity feed without needing a
badges table of its own.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Badge:
    key: str
    label: str
    description: str


# A deliberately small, fixed set — each one checkable from exactly the
# rows this project already stores, nothing invented or aspirational.
def compute_badges(
    *,
    completed_module_ids_by_domain: dict[str, set[str]],
    total_lessons_by_domain: dict[str, int],
    quiz_scores: list[int],
) -> list[Badge]:
    badges: list[Badge] = []
    nlp_done = len(completed_module_ids_by_domain.get("nlp", set()))
    dl_done = len(completed_module_ids_by_domain.get("dl", set()))
    total_done = nlp_done + dl_done

    if total_done >= 1:
        badges.append(Badge("first_steps", "First Steps", "Completed your first lesson or lab."))

    if nlp_done >= 5:
        badges.append(Badge("nlp_explorer", "NLP Explorer", "Completed 5 or more NLP lessons/labs."))
    if dl_done >= 5:
        badges.append(Badge("dl_explorer", "DL Explorer", "Completed 5 or more Deep Learning lessons/labs."))

    if total_lessons_by_domain.get("nlp", 0) > 0 and nlp_done >= total_lessons_by_domain["nlp"]:
        badges.append(Badge("nlp_complete", "NLP Graduate", "Completed every NLP lesson and lab."))
    if total_lessons_by_domain.get("dl", 0) > 0 and dl_done >= total_lessons_by_domain["dl"]:
        badges.append(Badge("dl_complete", "DL Graduate", "Completed every Deep Learning lesson and lab."))

    if quiz_scores:
        badges.append(Badge("quiz_taker", "Quiz Taker", "Attempted your first quiz."))
    if any(score == 100 for score in quiz_scores):
        badges.append(Badge("quiz_ace", "Quiz Ace", "Scored a perfect 100% on a quiz."))

    if total_done >= 10:
        badges.append(Badge("dedicated_learner", "Dedicated Learner", "Completed 10 or more lessons and labs."))

    return badges
