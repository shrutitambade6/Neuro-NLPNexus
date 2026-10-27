# Architecture

## Layers

```
React/TS/Tailwind SPA
      │  axios (src/services/api.ts)
      ▼
FastAPI routers (app/api/*)        — validation only, no NLP logic
      │
      ▼
Services (app/services/*)          — orchestration, caching, persistence
      │
      ▼
Algorithms (app/algorithms/*)      — pure functions, framework-free, unit-tested
      │
      ▼
SQLAlchemy models → SQLite (DATABASE_URL swappable to Postgres)
```

Rationale: algorithms with zero FastAPI/Pydantic imports can be tested,
reused from a notebook, or ported to a CLI tool without touching the web layer.

## Database schema

- `users` — id, username, created_at
- `experiments` — user_id, module, algorithm, input_json, output_json, params_json, duration_ms, created_at
- `challenges` — module, difficulty, prompt_json, answer_json, xp_value
- `challenge_attempts` — user_id, challenge_id, correct, score, xp_awarded, created_at
- `progress` — user_id, module, concept, status, last_practiced_at
- `corpora` — name, language, content, is_builtin
- `lexicon_entries` — word, language, definitions_json, synonyms_json, hypernyms_json, hyponyms_json

All defined in `backend/app/models/orm_models.py`. Only `users` and
`experiments` are exercised by an endpoint so far — the rest exist now so
later phases don't require schema migrations mid-build.

## Algorithms: from-scratch vs. library

**From scratch** (the point is to show the mechanism): tokenization variants,
Porter Stemmer, n-gram models + Laplace/Good-Turing smoothing, perplexity,
Levenshtein/Hamming edit distance, noisy-channel spell correction, CYK
parser, shift-reduce parser, PCFG parsing, Jaccard similarity, Hobbs
algorithm, a from-scratch Naive Bayes sentiment baseline, TF-IDF/cosine, a
mini BM25 search engine.

**Library-backed** (reimplementing adds no educational value): spaCy for
POS/NER baselines, NLTK WordNet + a supplementary local JSON lexicon for
Hindi/Marathi, `sentence-transformers/all-MiniLM-L6-v2` for embeddings,
`distilbert-base-uncased-finetuned-sst-2-english` for a sentiment baseline
comparison, `sshleifer/distilbart-cnn-12-6` for abstractive summarization,
`Helsinki-NLP/opus-mt-en-hi` for EN→HI translation, `indic-nlp-library` for
Devanagari normalization.

All of the above are CPU-runnable; none require a GPU. Model loads are lazy
(only on first request to that endpoint) and the UI states plainly when a
model is loading.

## What's honest about limitations right now

- Marathi NLP coverage will be weaker than Hindi/English across the board —
  the UI will say so rather than imply parity.
- Toy CYK/PCFG grammars only parse sentences within their defined grammar —
  users can enter sentences that fail, and the failure is shown, not hidden.
- No feature is marked "AI-powered" unless a model is actually invoked to
  produce it.
