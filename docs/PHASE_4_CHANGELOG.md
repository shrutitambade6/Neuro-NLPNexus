# Phase 4 — Semantic Lab (real implementations, assembled)

## Audit finding (important)

Before building anything, I inspected the codebase and found that the
backend (algorithms + schemas + services + API endpoints for Jaccard,
Cosine, TF-IDF, and a simplified Lesk WSD algorithm) and several frontend
building-block components (`JaccardCalculator`, `CosineCalculator`,
`TfidfLab`, `WsdLab`, `WordNetExplorer`, `RelationQuiz`) **already
existed and were fully tested** (45 backend tests, all passing) — but
none of it was assembled into a page or wired into routing. This phase's
actual work was: assemble those pieces into the tabbed lab the brief
asked for, fill the genuine gaps (relations visualizer, try-your-own
analyzer, knowledge graph, ambiguity explorer, BabelNet/ontology
sections), fix one real bug found along the way, and wire the route.

```
Existing Semantic Lab:       Partial (backend + components existed, unassembled)
Reusable components:          JaccardCalculator, CosineCalculator, TfidfLab,
                               WsdLab, WordNetExplorer, RelationQuiz, ConceptTooltip
Existing APIs:                 /api/semantics/{jaccard,cosine,tfidf,wsd} — all real
Existing database:              unchanged (no new tables needed this phase)
New components required:       SemanticPipeline, AmbiguityExplorer,
                                TryYourOwnRelation, KnowledgeGraphLab
```

## What changed

### New: assembled Semantic Lab page (`/semantics`)
Six tabs, matching the Parsing Lab's visual language (cards, ConceptTooltip,
presets, loading/error states):
- **Lexical Semantics** — crisp theory (Definition/Simple/Example/Why it
  matters/Common mistake/Viva point structure) + ambiguity explorer
- **Semantic Relations** — theory, the real 10-question classification
  exercise (already built, now surfaced), and a new "Try your own" analyzer
- **WSD** — the real simplified-Lesk algorithm lab
- **WordNet / BabelNet** — WordNet explorer (honestly labeled "Educational
  Demo Data"), and BabelNet handled honestly ("requires API configuration,"
  not faked), plus the WordNet-vs-BabelNet comparison table
- **Similarity & TF-IDF** — real Jaccard, Cosine, and TF-IDF calculators,
  plus static content on similarity-vs-relatedness and an honestly-labeled
  embeddings concept overview (no fake vectors)
- **Knowledge Graph** — a new client-side triple-store builder (add/delete
  facts, search-highlight nodes), explicit that it's session-only for now

### Bug fixed
`frontend/src/data/concepts.ts` had a duplicate `lexeme` key, which is a
TypeScript compile error (`TS1117`). Found via `tsc -b`, not by inspection —
another reminder to always type-check before shipping.

## Files created

- `frontend/src/pages/SemanticLab.tsx`
- `frontend/src/components/SemanticPipeline.tsx`
- `frontend/src/components/AmbiguityExplorer.tsx`
- `frontend/src/components/TryYourOwnRelation.tsx`
- `frontend/src/components/KnowledgeGraphLab.tsx`
- `frontend/src/data/relationPairs.ts`

## Files modified

- `frontend/src/App.tsx` — routed `/semantics` to the real page
- `frontend/src/utils/navigation.ts` — marked Semantic Lab `ready`
- `frontend/src/data/concepts.ts` — removed duplicate `lexeme` key

No backend files were modified — the existing algorithms/API were already
correct and fully tested.

## How to run

Unchanged:
```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

## How to test

```bash
cd backend && pytest -v   # 45 passed (unchanged — no backend edits this phase)
```
Frontend: `npx tsc -b` and `npx vite build` both succeed with zero errors.

## Verified not broken

- `/foundations` — unaffected
- `/preprocessing` — unaffected
- `/parsing` — unaffected, all 25 parsing-related backend tests still pass
- `/` and `/dashboard` — unaffected

## Known limitations (deliberately deferred, not faked)

- **No Numerical Practice engine** with tolerance-checked answers and
  difficulty tiers yet — the calculators compute real results, but there's
  no "check your answer before revealing" quiz flow around them yet.
- **No dedicated Semantic Question Bank** (30+ categorized MCQ/numerical/viva
  questions) — only the 10-question relation exercise exists.
- **No Viva Mode** reuse — not built in either lab yet.
- **No Practical Code Editor** — deferred; needs a real sandboxing decision
  (subprocess/container/timeout) before it's safe to build, per the
  project's own security rules.
- **Knowledge graph is session-only** — no backend persistence yet.
- **"Try your own" relation analyzer** only covers ~14 curated pairs —
  honestly reports "Unable to determine automatically" outside that set,
  rather than guessing.
- **Embeddings** section is conceptual only — no real embedding model is
  loaded, and this is stated directly in the UI.

## What's next

Per the brief's own priority list and the overall project roadmap: Discourse
Lab (Hobbs algorithm) is next in sequence. The Numerical Practice engine
would also pay off across multiple labs at once (Parsing, Language
Modeling, Semantics) if you'd rather prioritize that as shared
infrastructure before adding more individual labs — happy to go either way.
