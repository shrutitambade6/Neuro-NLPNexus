"""
Database engine/session setup.

Defaults to a local SQLite file. To move to PostgreSQL later, set the
DATABASE_URL environment variable (e.g. postgresql://user:pass@host/db)
— no other code changes are required because all queries go through
SQLAlchemy's ORM, not raw SQLite-specific SQL.
"""
import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nlp_nexus.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# No migration tool (Alembic etc.) is set up in this project. That's fine
# for a brand new table (create_all() below handles those), but it's not
# enough for a column added to a table that may already exist on disk with
# real rows in it — create_all() never alters an existing table. Rather
# than the old "just delete nlp_nexus.db" escape hatch (which would also
# delete every real student's account), this runs a tiny, additive,
# idempotent migration: for each (table, column) pair that should exist,
# add it with ALTER TABLE if it's missing. It only ever adds columns, never
# drops or renames anything, so it's safe to run on every startup.
#
# This intentionally stays SQLite-specific (ALTER TABLE ... ADD COLUMN with
# a constant default is supported there); a real Postgres deployment would
# use a proper migration tool instead of DATABASE_URL alone, which is out
# of scope for this project.
_ADDITIVE_COLUMNS: list[tuple[str, str, str]] = [
    # (table, column, DDL fragment after the column name)
    #
    # `is_verified` was added to the User ORM model back in the "Account
    # Creation & Email Verification" milestone, BEFORE this additive-
    # migration helper existed (that milestone's own notes said to delete
    # the dev db file instead — fine for a throwaway dev db, but this
    # project now has a real on-disk db with real accounts that was never
    # deleted). It was missing from this list by oversight, which meant any
    # real pre-existing `users` table never actually got the column:
    # every register/login touching that table raised
    # `sqlite3.OperationalError: no such column: is_verified` as an
    # unhandled 500, surfaced to the frontend as the generic
    # "Couldn't reach the backend." text. Listed here now so this is
    # self-healing on the next backend restart, with no data loss.
    ("users", "is_verified", "BOOLEAN NOT NULL DEFAULT 0"),
    ("users", "role", "VARCHAR(16) NOT NULL DEFAULT 'student'"),
    ("users", "last_login", "DATETIME"),
    # Super Admin Portal milestone.
    ("users", "account_status", "VARCHAR(16) NOT NULL DEFAULT 'active'"),
    ("users", "assigned_domain", "VARCHAR(8)"),
    # Birthday Experience milestone — see the User model's own comment.
    ("users", "birthday", "DATE"),
    ("users", "timezone", "VARCHAR(64) NOT NULL DEFAULT 'UTC'"),
    # Student/Teacher self-serve signup follow-up — see User.
    # teacher_request_pending's own comment in orm_models.py.
    ("users", "teacher_request_pending", "BOOLEAN NOT NULL DEFAULT 0"),
    # Study Planner milestone — see User.planner_week_start's own comment.
    ("users", "planner_week_start", "INTEGER NOT NULL DEFAULT 1"),
    ("users", "planner_heatmap_measure", "VARCHAR(8) NOT NULL DEFAULT 'hours'"),
    # Username/Password Authentication milestone (2026-10-07) -- see
    # orm_models.User.full_name's own comment. Purely additive (nullable,
    # no default needed), unlike the email change below.
    ("users", "full_name", "VARCHAR(120)"),
]


def ensure_additive_columns(target_engine=None) -> None:
    target_engine = target_engine or engine
    if not str(target_engine.url).startswith("sqlite"):
        return  # Postgres/other backends: handled by a real migration tool, not this helper.

    inspector = inspect(target_engine)
    existing_tables = set(inspector.get_table_names())

    with target_engine.begin() as conn:
        for table, column, ddl in _ADDITIVE_COLUMNS:
            if table not in existing_tables:
                continue  # create_all() will create the table (with the column) from scratch.
            existing_columns = {c["name"] for c in inspector.get_columns(table)}
            if column in existing_columns:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def ensure_email_nullable(target_engine=None) -> None:
    """One-time migration: relax users.email from NOT NULL to nullable.

    Username/Password Authentication milestone (2026-10-07) -- see
    student-teacher-username-auth.md. Unlike every entry in
    _ADDITIVE_COLUMNS above, this isn't a missing column, it's an
    EXISTING column's constraint, which SQLite's ALTER TABLE cannot
    relax directly (no ALTER COLUMN support). This rebuilds the table:
    rename the live `users` table out of the way, recreate `users` fresh
    from today's ORM metadata (User.__table__, which now declares email
    nullable -- see orm_models.py, so this can never drift from the real
    model), copy every row across by its exact existing columns (ids and
    every other value preserved untouched -- nothing else in the database
    references users by anything but id, and this never changes an id),
    then drop the renamed-aside old table. Guarded by checking whether
    email is already nullable, so it's a no-op on every later startup
    once it has run once -- same "safe to run every startup" contract
    ensure_additive_columns already follows.

    Must run AFTER ensure_additive_columns(), so that full_name and every
    other additive column already exist on the OLD table and get carried
    over in the copy (nothing is lost if a fresh column was added this
    same startup, just before this runs).
    """
    target_engine = target_engine or engine
    if not str(target_engine.url).startswith("sqlite"):
        return  # Postgres/other backends: a real migration tool's job, not this helper.

    inspector = inspect(target_engine)
    if "users" not in inspector.get_table_names():
        return  # Fresh DB: create_all() will make email nullable from the start.

    columns = inspector.get_columns("users")
    email_col = next((c for c in columns if c["name"] == "email"), None)
    if email_col is None or email_col["nullable"]:
        return  # No email column at all (shouldn't happen), or already migrated.

    # Local import to avoid a circular import at module load time (this
    # module is imported by orm_models indirectly via Base; importing the
    # User model here, inside the function, sidesteps that entirely).
    from app.models.orm_models import User

    col_names = ", ".join(c["name"] for c in columns)
    with target_engine.begin() as conn:
        conn.execute(text("ALTER TABLE users RENAME TO users_pre_email_migration"))
        User.__table__.create(bind=conn)
        conn.execute(
            text(f"INSERT INTO users ({col_names}) SELECT {col_names} FROM users_pre_email_migration")
        )
        conn.execute(text("DROP TABLE users_pre_email_migration"))
