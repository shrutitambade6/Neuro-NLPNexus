"""Health-check endpoint used by the frontend to confirm backend availability
and by tests/CI to verify the app boots.

Extended for the "Couldn't reach the backend" debugging pass: a 200 from
this endpoint only proves the HTTP layer is up — it says nothing about
whether the database is actually reachable. The frontend's dev-only API
diagnostics panel (see frontend/src/components/ApiDiagnosticsPanel.tsx)
reads `database` from here so "frontend -> backend" vs "backend -> database"
failures are visibly distinct instead of both just looking like a dead
backend.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter()


@router.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception as exc:  # pragma: no cover - defensive, surfaced to the dev panel
        database_status = f"error: {exc}"

    return {
        "status": "ok",
        "service": "nlp-nexus-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": database_status,
    }
