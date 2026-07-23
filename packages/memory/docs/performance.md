# Performance

The package aims to stay fast by keeping the hot path simple and predictable.

## Fast Path Principles

- metadata first
- small candidate sets
- optional semantic boost, not semantic-first everything
- no generated summaries on read
- no package-owned cross-table orchestration

## Candidate Narrowing

`context()` always narrows with metadata before ranking.

Current query shape:

- structural candidates: `max(limit * 8, 25)` capped at `100`
- semantic candidates: `max(limit * 6, 25)` capped at `100`

That keeps the TypeScript-side scoring pass small instead of pulling large
candidate sets into memory.

## Read Path Decisions

### Structural retrieval first

Structural candidates are always loaded from the metadata scope.

This matters because:

- many lookups are naturally scoped by `userId`, `conversationId`, `appId`, or `topic`
- metadata narrowing is cheaper than global vector search
- the result set stays understandable

### Semantic retrieval is optional

Semantic retrieval only runs when both of these are true:

- `context({ text })` receives non-empty `text`
- `models.embed` is configured

Without both inputs, the package falls back to metadata + priority + freshness.

### No generated summaries on read

`context({ includeSummary: true })` only looks up a stored summary row.

It does not:

- call the summarize model
- generate a new summary
- mutate memory during reads

This keeps the read path cheap and avoids surprise latency spikes.

## Current Scoring

With semantic similarity:

```txt
semantic * 0.45 + priority * 0.30 + freshness * 0.25
```

Without semantic similarity:

```txt
priority * 0.55 + freshness * 0.45
```

Normalization:

- priority: `1 - 1 / (1 + priority)`
- freshness: `1 / (1 + ageHours / 720)`

This gives a few useful properties:

- very recent noise does not automatically beat clearly more important memory
- recent notes still get a real lift
- semantic matches can jump ahead when the current situation is close to an older note

## Index Expectations

The package assumes these indexes exist:

- `created_at`
- `priority`
- GIN index on `metadata`
- HNSW index on `embedding` with `vector_cosine_ops`

If these indexes are missing, `context()` quality may stay acceptable but the
query path will not stay fast as the table grows.

## Current Non-Goals

The runtime currently does not try to optimize:

- background consolidation
- automatic summary refresh
- retention or expiry
- cross-backend portability
