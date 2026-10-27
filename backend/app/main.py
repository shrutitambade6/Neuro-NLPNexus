"""
NeuroNLP Nexus — FastAPI application entrypoint.

Keeps this file thin on purpose: it wires up middleware, routers, and
startup/shutdown hooks. All actual logic lives in app.services / app.algorithms.
"""
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import (
    activation_functions,
    admin,
    assistant,
    attention,
    auth,
    autoencoder_concepts,
    birthday,
    book_progress,
    chat,
    chatbot,
    challenges,
    classification,
    cnn,
    community,
    concept_dna,
    discourse,
    dl_foundations,
    document_analysis,
    edit_distance,
    health,
    information_retrieval,
    language_modeling,
    morphology,
    ner,
    ner_playground,
    neural_network,
    nn_module2_examples,
    perceptron_foundations,
    pipeline,
    planner,
    preprocessing,
    parsing,
    pos_tagging,
    progress,
    question_answering,
    rnn,
    semantics,
    sentiment,
    spam_detection,
    summarization,
    superadmin,
    translation,
    ws,
)
from app.database import Base, SessionLocal, engine, ensure_additive_columns, ensure_email_nullable
from app.models import orm_models  # noqa: F401 — import registers models on Base before create_all
from app.services.challenges_service import seed_dl_challenges


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Additive, idempotent column migration FIRST (adds `role`/`last_login`
    # to an existing `users` table if they're missing) — see
    # app/database.py. Must run before create_all touches this engine so a
    # pre-existing users table on disk never gets left without them.
    ensure_additive_columns(engine)
    # Username/Password Authentication milestone (2026-10-07) -- relaxes
    # users.email from NOT NULL to nullable on an existing on-disk
    # database. Must run AFTER ensure_additive_columns() (so full_name
    # and every other additive column already exist to carry over) and
    # BEFORE create_all (same reasoning as that call: a migration that
    # touches a pre-existing table must run before create_all, which
    # never alters an existing table). See app/database.py's own comment
    # on ensure_email_nullable for why this needs a real table rebuild
    # rather than a plain ALTER TABLE.
    ensure_email_nullable(engine)
    # No migration tool is set up in this project yet — create_all only
    # creates tables that don't already exist, it never alters an existing
    # table's columns. Brand new tables (learning_progress, quiz_results,
    # activity_log) need no migration — this creates them outright.
    Base.metadata.create_all(bind=engine)
    # Seeds the fixed DL Challenges set (idempotent — see seed_dl_challenges)
    # so /api/dl/challenges has real, already-computed-correctly data to
    # serve from a fresh database with zero manual setup.
    db = SessionLocal()
    try:
        seed_dl_challenges(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="NeuroNLP Nexus API",
    description="Backend for the NeuroNLP Nexus interactive NLP & Deep Learning laboratory.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: allow the local Vite dev server. Tighten this list before any
# real deployment — do not use "*" with credentials in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers are registered here; each router owns one domain of the syllabus
# and delegates to a service module — no NLP logic should live in api/.
app.include_router(health.router, tags=["health"])
app.include_router(preprocessing.router, prefix="/api", tags=["preprocessing"])
app.include_router(parsing.router, prefix="/api", tags=["parsing"])
app.include_router(pos_tagging.router, prefix="/api", tags=["pos-tagging"])
app.include_router(semantics.router, prefix="/api", tags=["semantics"])
app.include_router(language_modeling.router, prefix="/api", tags=["language-modeling"])
app.include_router(discourse.router, prefix="/api", tags=["discourse"])
app.include_router(morphology.router, prefix="/api", tags=["morphology"])
app.include_router(edit_distance.router, prefix="/api", tags=["edit-distance"])
app.include_router(pipeline.router, prefix="/api", tags=["playground"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(planner.router, prefix="/api", tags=["planner"])
# Birthday Experience milestone — reuses the chat/notification systems
# (see app/services/birthday_service.py); registered right after auth
# since it extends the same "who is this user" surface.
app.include_router(birthday.router, prefix="/api", tags=["birthday"])
app.include_router(sentiment.router, prefix="/api", tags=["applications"])
app.include_router(ner.router, prefix="/api", tags=["applications"])
# NER Lab Code Playground -- a separate router from the plain NER
# endpoint above: this one runs student-submitted code through an
# isolated subprocess (see app/services/ner_playground_service.py),
# never the main server process itself.
app.include_router(ner_playground.router, prefix="/api", tags=["applications"])
app.include_router(summarization.router, prefix="/api", tags=["applications"])
app.include_router(information_retrieval.router, prefix="/api", tags=["applications"])
app.include_router(spam_detection.router, prefix="/api", tags=["applications"])
app.include_router(question_answering.router, prefix="/api", tags=["applications"])
app.include_router(classification.router, prefix="/api", tags=["applications"])
app.include_router(chatbot.router, prefix="/api", tags=["applications"])
app.include_router(assistant.router, prefix="/api", tags=["applications"])
app.include_router(translation.router, prefix="/api", tags=["applications"])
app.include_router(document_analysis.router, prefix="/api", tags=["applications"])
app.include_router(dl_foundations.router, prefix="/api", tags=["deep-learning"])
app.include_router(activation_functions.router, prefix="/api", tags=["deep-learning"])
app.include_router(neural_network.router, prefix="/api", tags=["deep-learning"])
app.include_router(perceptron_foundations.router, prefix="/api", tags=["deep-learning"])
app.include_router(nn_module2_examples.router, prefix="/api", tags=["deep-learning"])
app.include_router(autoencoder_concepts.router, prefix="/api", tags=["deep-learning"])
app.include_router(cnn.router, prefix="/api", tags=["deep-learning"])
app.include_router(rnn.router, prefix="/api", tags=["deep-learning"])
app.include_router(attention.router, prefix="/api", tags=["deep-learning"])
app.include_router(challenges.router, prefix="/api", tags=["deep-learning"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
# Concept DNA milestone — reuses the exact same progress/quiz/challenge
# tables progress.py and challenges.py already read; see
# app/services/concept_dna_service.py.
app.include_router(concept_dna.router, prefix="/api", tags=["concept-dna"])
# Digital Books milestone (theory migration) — reading progress +
# bookmarks for the two Interactive Learning Books, its own small
# table (see models/orm_models.py's BookProgress docstring for why
# it isn't folded into the existing progress.router above).
app.include_router(book_progress.router, prefix="/api", tags=["book-progress"])
app.include_router(admin.router, prefix="/api", tags=["admin"])

# Community / Chat milestone — private 1:1 messaging (chat.py), subject-
# focused discussions and doubt-solving (community.py), and the one
# WebSocket push/presence channel both of them push through (ws.py).
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(community.router, prefix="/api", tags=["community"])
app.include_router(ws.router, prefix="/api", tags=["websocket"])

# Super Admin Portal milestone — a third role (role="super_admin"), fully
# separate from the Teacher/Admin role, protected end-to-end by
# app.api.deps.require_super_admin. See backend/scripts/seed_super_admin.py
# for how the one Super Admin account is created.
app.include_router(superadmin.router, prefix="/api", tags=["superadmin"])


# --- Serve the built frontend in production (e.g. Render) -------------
# In local dev, the frontend runs separately via `npm run dev` (Vite on
# :5173, proxying /api to this server) and frontend/dist won't exist —
# this block is skipped and the plain JSON root route below is used
# instead, unchanged from before. In production, the build step runs
# `npm run build` first, producing frontend/dist, and this same server
# then serves that build directly from the same origin as /api — no
# CORS and no separate static host needed, and the frontend's own
# `baseURL: "/api"` (see frontend/src/services/api.ts) just works
# unchanged.
_FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if _FRONTEND_DIST.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=_FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Registered after every app.include_router(...) call above, so
        # FastAPI only ever reaches this for a path none of the /api/...
        # routers (or the auto-generated /docs, /openapi.json, /redoc)
        # already claimed. A real built file (e.g. favicon.ico) is served
        # as-is; anything else falls back to index.html so React Router
        # can handle client-side routes like /dashboard or /ner-lab.
        candidate = _FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "name": "NeuroNLP Nexus API",
            "status": "running",
            "docs": "/docs",
        }
