# Phase 2 — New UI/UX + animation system

## What changed

The visual layer got a real upgrade. Nothing about the working backend or
the Preprocessing Lab's logic changed — this phase only touches presentation
and adds one new page.

1. **New homepage (`/`)** — hero "Where language becomes data," a live
   sentence analyzer, and the signature text→tokens→...→insight pipeline
   animation. The "Tokens" stage is real (calls the actual `/api/tokenize`
   endpoint). Every stage past that (Features, Semantics, Intent, Insight)
   is shown locked with the phase it ships in — no fake output.
2. **Neural background** — a quiet, slow-moving canvas node graph behind
   the whole app. Respects `prefers-reduced-motion` (renders one static
   frame instead of animating if the user has that OS setting on).
3. **Interactive pipeline nodes** — Raw text → Tokenizer → Morphology →
   Syntax → Semantics → Discourse → Application, each clickable, routing to
   its lab. Locked stages show a lock icon rather than pretending to work.
4. **Dashboard moved to `/dashboard`** — the original dashboard (stat cards
   + knowledge map) is untouched, just relocated so `/` can be the new
   marketing-style homepage. It's still reachable from the sidebar and
   from a link at the bottom of the homepage.

## Files created

- `frontend/src/components/NeuralBackground.tsx`
- `frontend/src/components/TextToIntelligence.tsx`
- `frontend/src/components/PipelineNodes.tsx`
- `frontend/src/pages/Home.tsx`
- `docs/PHASE_2_CHANGELOG.md` (this file)

## Files modified

- `frontend/src/App.tsx` — added `/` → Home route, moved Dashboard to
  `/dashboard`, mounted `NeuralBackground` behind the layout.
- `frontend/src/components/Sidebar.tsx` — added `z-10` so it stays above
  the new background canvas.
- `frontend/src/utils/navigation.ts` — added a "Home" nav entry, changed
  "Dashboard"'s path to `/dashboard`.

## Why these changes

The brief asked for a homepage that demonstrates the product with a live
sentence analysis animation, and a persistent visual identity (neural
network motif) instead of scattered fade-ins. Both were buildable now
without touching backend logic, so they came first, per the phase order in
the brief (Phase 2 = UI/UX + animation system, before any new lab).

Everything past the "Tokens" stage in the animation is honestly locked
rather than simulated, per the project's own technical-honesty rule —
POS tagging, semantics, and intent detection don't exist yet, so nothing
claims to compute them.

## How to run

Same as before — nothing changed in setup:

```bash
# backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev
```

Visit `http://localhost:5173` — you'll land on the new homepage. The old
dashboard is now at `http://localhost:5173/dashboard` or via the sidebar.

## How to test

Backend tests are unaffected by this phase (no backend files changed):
```bash
cd backend && pytest -v   # still 13 passed
```

Frontend has no test runner wired up yet (vitest is in `package.json` but
no test files exist) — that's an honest gap, not a broken feature. Manual
verification done for this phase: `tsc -b` (type-check) and `vite build`
(production bundle) both succeed with zero errors.

## Known limitations

- The homepage animation only computes tokenization for real; every later
  stage is a locked placeholder, matching what's actually implemented.
- No automated frontend tests yet — flagged for Phase 15 (Testing) in the
  brief's own ordering, not silently skipped.
- `NeuralBackground` is decorative canvas only; it doesn't yet visualize
  actual token/word/sentence/context nodes from real data (the brief's
  fuller "Neural Flow" concept) — that requires real backend data to wire
  meaningfully and is deferred rather than faked with arbitrary node labels.

## What's next

Phase 3 (Parsing Lab) is the next item in the brief's own ordering. Given
its size (constituency parsing, CYK, CYK numerical mode, PCFG, shift-reduce,
top-down/Earley), I'd recommend building it in its own focused pass rather
than folding it into this one, consistent with the brief's "do not
implement everything simultaneously" instruction.
