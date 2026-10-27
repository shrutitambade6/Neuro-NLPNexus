# NLP Nexus — Interactive NLP Laboratory

> Explore Language. Break Down Meaning. Build Intelligence.

An interactive NLP laboratory covering the full NLP syllabus — tokenization,
morphology, n-gram language models, parsing (CYK/PCFG), semantics, discourse,
regional (Indian) language NLP, real-world applications, and gamified
challenges — built incrementally, phase by phase.

**Status: Phase 1 of 12.** See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's
real vs. scaffolded right now.

## What's actually working in Phase 1

- FastAPI backend with a real `/api/health` and `/api/tokenize` endpoint
- Four tokenization algorithms implemented from scratch (whitespace,
  rule-based, regex, sentence) with a full pytest suite (13 tests, all passing)
- React + TypeScript + Tailwind frontend with sidebar nav, dashboard shell,
  an interactive knowledge map, and a Text Preprocessing Lab page that calls
  the real backend and renders real results — no mock data
- Every unbuilt module shows an honest "scheduled for Phase N" placeholder
  instead of fake results

## Architecture

```
frontend (React/TS/Tailwind) → FastAPI REST API → services → algorithms → SQLite
```

See the full architecture writeup, DB schema, and phase-by-phase plan in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Running the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload     # serves on http://localhost:8000
```

API docs: http://localhost:8000/docs

## Running the frontend

```bash
cd frontend
npm install
npm run dev                       # serves on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so run the
backend first.

## Running tests

```bash
cd backend
pytest -v
```

All 13 tests currently pass, covering: health check, tokenize endpoint
(success, validation, long input), and each tokenizer's behavior on normal
text, empty input, and Devanagari Unicode text.

## API implemented so far

| Method | Path            | Description                                  |
|--------|-----------------|-----------------------------------------------|
| GET    | `/api/health`   | Backend liveness check                        |
| POST   | `/api/tokenize` | Runs 4 tokenizers, returns side-by-side result |

More endpoints are added each phase — see `docs/ROADMAP.md`.

## Limitations (Phase 1)

- Only tokenization is implemented; every other lab is a labeled placeholder
- No auth/multi-user support yet — single local `guest` user
- No persistence of experiments yet (DB models exist, not yet wired to endpoints)
- Regex tokenizer's word pattern is ASCII-only; full Unicode tokenization for
  Hindi/Marathi ships in the Regional NLP phase — this is called out in
  `test_unicode_devanagari_input_does_not_crash`, not hidden

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide
React, Recharts, Axios, Zustand, React Router
**Backend:** Python, FastAPI, Pydantic, SQLAlchemy, pytest
**NLP (later phases):** NLTK, spaCy, scikit-learn, sentence-transformers,
Transformers (CPU models), NetworkX
**Database:** SQLite (schema designed to move to PostgreSQL via `DATABASE_URL`)
