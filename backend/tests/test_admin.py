from fastapi.testclient import TestClient

from app.main import app
from app.models.orm_models import User
from tests.conftest import TestSessionLocal

client = TestClient(app)


def _register_and_token(email: str) -> str:
    r = client.post("/api/auth/register", json={"username": email.split("@")[0], "full_name": "Test User", "college_email": f"{email.split('@')[0]}@vit.edu.in", "password": "hunter22pass", "confirm_password": "hunter22pass"})
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _promote_to_admin(email: str) -> None:
    """Mirrors what scripts/seed_admin.py does, directly against the test
    db — there is no API endpoint for this on purpose."""
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.username == (email).split("@")[0]).first()
        user.role = "admin"
        db.commit()
    finally:
        db.close()


def test_admin_endpoints_reject_anonymous_requests():
    assert client.get("/api/admin/overview").status_code == 401
    assert client.get("/api/admin/students").status_code == 401
    assert client.get("/api/admin/students/1").status_code == 401


def test_admin_endpoints_reject_regular_students():
    token = _register_and_token("regularstudent")
    assert client.get("/api/admin/overview", headers=_auth(token)).status_code == 403
    assert client.get("/api/admin/students", headers=_auth(token)).status_code == 403


def test_admin_can_see_student_in_list_and_detail():
    student_token = _register_and_token("watched")
    client.post("/api/progress/complete", json={"domain": "dl", "module_id": "dl-foundations"}, headers=_auth(student_token))
    client.post(
        "/api/progress/quiz-result",
        json={"domain": "dl", "quiz_id": "dl-module-1-quiz", "total_questions": 2, "correct_answers": 2},
        headers=_auth(student_token),
    )

    admin_token = _register_and_token("teacher1")
    _promote_to_admin("teacher1")

    students = client.get("/api/admin/students", headers=_auth(admin_token)).json()
    emails = [s["username"] for s in students["students"]]
    assert "watched" in emails

    watched = next(s for s in students["students"] if s["username"] == "watched")
    assert watched["dl_progress"]["completed"] == 1
    assert watched["quiz_attempts"] == 1

    detail = client.get(f"/api/admin/students/{watched['id']}", headers=_auth(admin_token)).json()
    assert detail["student"]["username"] == "watched"
    assert len(detail["dl_entries"]) == 1
    assert len(detail["quiz_results"]) == 1


def test_admin_students_list_excludes_the_admin_account_itself():
    admin_token = _register_and_token("teacher2")
    _promote_to_admin("teacher2")
    students = client.get("/api/admin/students", headers=_auth(admin_token)).json()
    emails = [s["username"] for s in students["students"]]
    assert "teacher2" not in emails


def test_admin_search_filters_by_email_substring():
    _register_and_token("findmeunique")
    admin_token = _register_and_token("teacher3")
    _promote_to_admin("teacher3")

    results = client.get("/api/admin/students", params={"search": "findmeunique"}, headers=_auth(admin_token)).json()
    assert results["total"] == 1
    assert results["students"][0]["username"] == "findmeunique"


def test_admin_overview_reflects_real_totals():
    s_token = _register_and_token("overviewstudent")
    client.post("/api/progress/complete", json={"domain": "nlp", "module_id": "preprocessing"}, headers=_auth(s_token))

    admin_token = _register_and_token("teacher4")
    _promote_to_admin("teacher4")

    overview = client.get("/api/admin/overview", headers=_auth(admin_token)).json()
    assert overview["total_students"] >= 1
    assert overview["total_completed_modules"] >= 1


def test_admin_cannot_view_nonexistent_student():
    admin_token = _register_and_token("teacher5")
    _promote_to_admin("teacher5")
    response = client.get("/api/admin/students/999999", headers=_auth(admin_token))
    assert response.status_code == 404


# ---- Teacher Dashboard expansion: analytics / assessments / needs
# attention / heatmap ------------------------------------------------------

from datetime import datetime, timedelta, timezone  # noqa: E402

from app.models.orm_models import ActivityLog, LearningProgress  # noqa: E402


def _backdate_user_created_at(email: str, days: int) -> None:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.username == (email).split("@")[0]).first()
        user.created_at = datetime.now(timezone.utc) - timedelta(days=days)
        db.commit()
    finally:
        db.close()


def _backdate_progress_updated_at(user_email: str, module_id: str, days: int) -> None:
    db = TestSessionLocal()
    try:
        user = db.query(User).filter(User.username == (user_email).split("@")[0]).first()
        entry = db.query(LearningProgress).filter(
            LearningProgress.user_id == user.id, LearningProgress.module_id == module_id
        ).first()
        entry.updated_at = datetime.now(timezone.utc) - timedelta(days=days)
        db.commit()
    finally:
        db.close()


def test_new_teacher_endpoints_reject_anonymous_and_students():
    assert client.get("/api/admin/analytics/nlp").status_code == 401
    assert client.get("/api/admin/assessments").status_code == 401
    assert client.get("/api/admin/needs-attention").status_code == 401
    assert client.get("/api/admin/heatmap/nlp").status_code == 401

    student_token = _register_and_token("plainstudent")
    auth = _auth(student_token)
    assert client.get("/api/admin/analytics/nlp", headers=auth).status_code == 403
    assert client.get("/api/admin/assessments", headers=auth).status_code == 403
    assert client.get("/api/admin/needs-attention", headers=auth).status_code == 403
    assert client.get("/api/admin/heatmap/nlp", headers=auth).status_code == 403


def test_domain_analytics_reflects_real_module_completion():
    student_token = _register_and_token("analyticsstudent")
    client.post(
        "/api/progress/complete", json={"domain": "nlp", "module_id": "preprocessing"}, headers=_auth(student_token)
    )
    client.post(
        "/api/progress/quiz-result",
        json={"domain": "nlp", "quiz_id": "nlp-quiz-1", "total_questions": 4, "correct_answers": 3},
        headers=_auth(student_token),
    )

    admin_token = _register_and_token("analyticsteacher")
    _promote_to_admin("analyticsteacher")

    analytics = client.get("/api/admin/analytics/nlp", headers=_auth(admin_token)).json()
    assert analytics["domain"] == "nlp"
    assert analytics["total_students"] >= 1
    preprocessing = next(m for m in analytics["modules"] if m["module_id"] == "preprocessing")
    assert preprocessing["completed_count"] >= 1
    assert analytics["total_quiz_attempts"] >= 1
    assert sum(b["count"] for b in analytics["score_distribution"]) == analytics["total_quiz_attempts"]
    topic = next(t for t in analytics["quiz_topics"] if t["quiz_id"] == "nlp-quiz-1")
    assert topic["attempts"] == 1


def test_domain_analytics_rejects_invalid_domain():
    admin_token = _register_and_token("badanalyticsteacher")
    _promote_to_admin("badanalyticsteacher")
    response = client.get("/api/admin/analytics/not-a-domain", headers=_auth(admin_token))
    assert response.status_code == 400


def test_assessments_aggregates_across_both_domains():
    student_token = _register_and_token("assessmentstudent")
    client.post(
        "/api/progress/quiz-result",
        json={"domain": "nlp", "quiz_id": "nlp-quiz-2", "total_questions": 5, "correct_answers": 5},
        headers=_auth(student_token),
    )
    client.post(
        "/api/progress/quiz-result",
        json={"domain": "dl", "quiz_id": "dl-module-1-quiz", "total_questions": 4, "correct_answers": 1},
        headers=_auth(student_token),
    )

    admin_token = _register_and_token("assessmentteacher")
    _promote_to_admin("assessmentteacher")

    assessments = client.get("/api/admin/assessments", headers=_auth(admin_token)).json()
    assert assessments["total_attempts"] >= 2
    quiz_ids = {t["quiz_id"] for t in assessments["topic_performance"]}
    assert {"nlp-quiz-2", "dl-module-1-quiz"} <= quiz_ids


def test_needs_attention_excludes_brand_new_accounts():
    _register_and_token("brandnewstudent")  # zero progress, zero activity, just signed up
    admin_token = _register_and_token("attentionteacher1")
    _promote_to_admin("attentionteacher1")

    result = client.get("/api/admin/needs-attention", headers=_auth(admin_token)).json()
    emails = [item["student"]["username"] for item in result["students"]]
    assert "brandnewstudent" not in emails


def test_needs_attention_flags_old_inactive_low_progress_student():
    _register_and_token("staleattentionstudent")
    _backdate_user_created_at("staleattentionstudent", days=30)

    admin_token = _register_and_token("attentionteacher2")
    _promote_to_admin("attentionteacher2")

    result = client.get("/api/admin/needs-attention", headers=_auth(admin_token)).json()
    item = next(i for i in result["students"] if i["student"]["username"] == "staleattentionstudent")
    codes = {r["code"] for r in item["reasons"]}
    assert "low_progress" in codes
    assert "inactivity" in codes


def test_needs_attention_flags_repeated_failed_quizzes():
    student_token = _register_and_token("failingquizstudent")
    _backdate_user_created_at("failingquizstudent", days=30)
    for _ in range(2):
        client.post(
            "/api/progress/quiz-result",
            json={"domain": "nlp", "quiz_id": "nlp-quiz-3", "total_questions": 10, "correct_answers": 1},
            headers=_auth(student_token),
        )

    admin_token = _register_and_token("attentionteacher3")
    _promote_to_admin("attentionteacher3")

    result = client.get("/api/admin/needs-attention", headers=_auth(admin_token)).json()
    item = next(i for i in result["students"] if i["student"]["username"] == "failingquizstudent")
    codes = {r["code"] for r in item["reasons"]}
    assert "failed_quizzes" in codes


def test_heatmap_reflects_completed_and_not_started_cells():
    student_token = _register_and_token("heatmapstudent")
    client.post(
        "/api/progress/complete", json={"domain": "nlp", "module_id": "preprocessing"}, headers=_auth(student_token)
    )

    admin_token = _register_and_token("heatmapteacher1")
    _promote_to_admin("heatmapteacher1")

    heatmap = client.get("/api/admin/heatmap/nlp", headers=_auth(admin_token)).json()
    row = next(r for r in heatmap["rows"] if r["username"] == "heatmapstudent")
    cells_by_module = {c["module_id"]: c["state"] for c in row["cells"]}
    assert cells_by_module["preprocessing"] == "completed"
    assert cells_by_module["parsing"] == "not_started"


def test_heatmap_marks_stale_in_progress_entry_as_needs_attention():
    student_token = _register_and_token("staleheatmapstudent")
    client.post(
        "/api/progress/complete",
        json={"domain": "nlp", "module_id": "parsing", "status": "in_progress", "completion_percentage": 40},
        headers=_auth(student_token),
    )
    _backdate_progress_updated_at("staleheatmapstudent", "parsing", days=20)

    admin_token = _register_and_token("heatmapteacher2")
    _promote_to_admin("heatmapteacher2")

    heatmap = client.get("/api/admin/heatmap/nlp", headers=_auth(admin_token)).json()
    row = next(r for r in heatmap["rows"] if r["username"] == "staleheatmapstudent")
    cells_by_module = {c["module_id"]: c["state"] for c in row["cells"]}
    assert cells_by_module["parsing"] == "needs_attention"


def test_heatmap_rejects_invalid_domain():
    admin_token = _register_and_token("badheatmapteacher")
    _promote_to_admin("badheatmapteacher")
    response = client.get("/api/admin/heatmap/not-a-domain", headers=_auth(admin_token))
    assert response.status_code == 400
