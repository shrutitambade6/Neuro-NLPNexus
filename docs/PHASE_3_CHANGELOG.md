# Phase 3 — Foundations + Parsing Lab (real implementations)

## What changed

The two labs that previously showed "Phase X / not implemented" are now
real, working laboratories. Nothing about tokenization, the homepage, or
the dashboard changed.

### NLP Foundations (`/foundations`)
- Real content on language/knowledge/grammar, the 6 stages of NLP
  (interactive, clickable pipeline), and all 5 ambiguity types with
  English + Hindi + Marathi examples (data-driven, in `data/ambiguity.ts`).
- A reusable `<ConceptTooltip term="..." />` component backed by a
  data-driven glossary (`data/concepts.ts`) — hover/focus/click any
  underlined technical term for a definition, simple version, and example.

### Parsing Lab (`/parsing`)
- A **real CYK (Cocke-Younger-Kasami) parser**, implemented from scratch
  in Python with backpointers, not a wrapper around a library.
- Full triangular CYK chart, revealed progressively with Play / Step /
  Reset controls.
- A **parse tree reconstructed from the actual CYK backpointers** — not a
  separately hand-drawn diagram, so what you see in the tree is provably
  consistent with what the chart computed.
- Honest failure handling: sentences with words outside the small grammar
  vocabulary are reported as "unknown words," not silently guessed at.
- The grammar is currently one fixed educational CNF grammar (simple
  Det-N-V sentences) — free-form grammar entry is flagged as a future
  phase in the UI itself, not implied to work.

## Files created

Backend:
- `backend/app/algorithms/cyk.py` — the CYK algorithm + tree reconstruction
- `backend/app/schemas/parsing.py`
- `backend/app/services/parsing_service.py`
- `backend/app/api/parsing.py`
- `backend/tests/test_cyk.py` (8 tests)
- `backend/tests/test_parsing_api.py` (4 tests)

Frontend:
- `frontend/src/pages/Foundations.tsx`
- `frontend/src/pages/ParsingLab.tsx`
- `frontend/src/components/ConceptTooltip.tsx`
- `frontend/src/components/StagesPipeline.tsx`
- `frontend/src/components/CYKChart.tsx`
- `frontend/src/components/ParseTree.tsx`
- `frontend/src/data/concepts.ts`
- `frontend/src/data/ambiguity.ts`

## Files modified

- `backend/app/main.py` — registered the parsing router
- `frontend/src/App.tsx` — routed `/foundations` and `/parsing` to the
  real pages instead of the placeholder
- `frontend/src/utils/navigation.ts` — marked both as `ready`
- `frontend/src/services/api.ts` — added `parseCYK()` + CYK response types

## Why CYK first (not a general parser)

The brief lists 10 parsing sub-features (constituency, top-down, Earley,
shift-reduce, PCFG, numerical practice...). CYK was the right first pick
because it's the one where "show the algorithm actually running" has the
clearest visual payoff (the chart), and because building a parse tree from
real backpointers — rather than a canned diagram — is what makes it
trustworthy instead of decorative. The rest of the parsing sub-features
(shift-reduce, PCFG, top-down/Earley, numerical question bank) are still
open; see "What's next."

## How to run

Unchanged:
```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

## How to test

```bash
cd backend && pytest -v   # now 25 passed (was 13)
```
Frontend: `npx tsc -b` and `npx vite build` both succeed with zero errors
(no frontend test runner is wired up yet — still an open gap, not hidden).

## Known limitations

- CYK grammar is fixed, not user-editable yet (brief's "Practice Numerical"
  / grammar-entry features are not built this pass).
- Only the *first* valid parse tree is reconstructed when a sentence is
  ambiguous under the grammar (real CYK charts can contain multiple valid
  derivations per cell) — this is noted in code comments, not hidden.
- ConceptTooltip glossary currently covers the terms actually used on the
  Foundations page; it'll grow as later labs add their own vocabulary.
- Foundations' "Regional NLP" honesty note is text-only for now; the actual
  Regional NLP lab (Hindi/Marathi processing) is still a placeholder.

## What's next

Per the brief's own phase order: Semantic Lab, then Discourse Lab, then
HMM POS tagging + language modeling numericals. Given how large Phase 3
already was, I'd suggest Semantic Lab as its own focused pass next —
happy to start there, or reprioritize if you'd rather see something else
first (e.g. the numerical question engine, since it's reused across many
labs).
