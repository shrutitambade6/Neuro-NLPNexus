"""
Tests for the Digital Books' reading-progress + bookmark endpoints
(the "Theory -> Books" migration milestone). Exercises the real API, a
real BookProgress row, and the real algorithms/book_catalog.py validation
— never a mocked service.
"""
from fastapi.testclient import TestClient

from app.algorithms.book_catalog import DL_BOOK_CHAPTERS, NLP_BOOK_CHAPTERS
from app.main import app

client = TestClient(app)


def test_unknown_chapter_id_is_rejected(auth_headers):
    r = client.post(
        "/api/books/progress",
        json={"book_id": "nlp", "chapter_id": "not-a-real-chapter", "completed": False, "last_page_in_chapter": 0},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_unknown_book_id_is_rejected(auth_headers):
    r = client.post(
        "/api/books/progress",
        json={"book_id": "physics", "chapter_id": NLP_BOOK_CHAPTERS[0].chapter_id, "completed": False, "last_page_in_chapter": 0},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_record_progress_then_read_it_back(auth_headers):
    chapter = NLP_BOOK_CHAPTERS[2]
    r = client.post(
        "/api/books/progress",
        json={"book_id": "nlp", "chapter_id": chapter.chapter_id, "completed": False, "last_page_in_chapter": 3},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["chapter_id"] == chapter.chapter_id
    assert body["completed"] is False
    assert body["last_page_in_chapter"] == 3

    summary = client.get("/api/books/nlp/progress", headers=auth_headers)
    assert summary.status_code == 200
    s = summary.json()
    assert s["book_id"] == "nlp"
    assert s["total_chapters"] == len(NLP_BOOK_CHAPTERS)
    assert s["completed_chapters"] == 0
    assert s["resume_chapter_id"] == chapter.chapter_id
    assert s["resume_page_in_chapter"] == 3


def test_a_completed_chapter_stays_completed_even_after_revisiting_an_earlier_page(auth_headers):
    chapter = DL_BOOK_CHAPTERS[0]
    client.post(
        "/api/books/progress",
        json={"book_id": "dl", "chapter_id": chapter.chapter_id, "completed": True, "last_page_in_chapter": 5},
        headers=auth_headers,
    )
    r = client.post(
        "/api/books/progress",
        json={"book_id": "dl", "chapter_id": chapter.chapter_id, "completed": False, "last_page_in_chapter": 1},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["completed"] is True


def test_percentage_reflects_real_completed_chapters(auth_headers):
    total = len(DL_BOOK_CHAPTERS)
    for chapter in DL_BOOK_CHAPTERS[:2]:
        client.post(
            "/api/books/progress",
            json={"book_id": "dl", "chapter_id": chapter.chapter_id, "completed": True, "last_page_in_chapter": 1},
            headers=auth_headers,
        )
    summary = client.get("/api/books/dl/progress", headers=auth_headers).json()
    assert summary["completed_chapters"] == 2
    assert summary["percentage"] == round((2 / total) * 100)


def test_toggle_bookmark(auth_headers):
    chapter = NLP_BOOK_CHAPTERS[0]
    r1 = client.post("/api/books/bookmark", json={"book_id": "nlp", "chapter_id": chapter.chapter_id}, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json()["bookmarked"] is True

    r2 = client.post("/api/books/bookmark", json={"book_id": "nlp", "chapter_id": chapter.chapter_id}, headers=auth_headers)
    assert r2.json()["bookmarked"] is False


def test_progress_is_scoped_to_the_authenticated_user(auth_headers):
    chapter = NLP_BOOK_CHAPTERS[0]
    client.post(
        "/api/books/progress",
        json={"book_id": "nlp", "chapter_id": chapter.chapter_id, "completed": True, "last_page_in_chapter": 1},
        headers=auth_headers,
    )

    r = client.post(
        "/api/books/progress",
        json={"book_id": "nlp", "chapter_id": chapter.chapter_id, "completed": False, "last_page_in_chapter": 0},
    )
    assert r.status_code in (401, 403)


def test_requires_auth(auth_headers):
    r = client.get("/api/books/nlp/progress")
    assert r.status_code in (401, 403)
