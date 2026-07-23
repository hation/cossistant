# Data Flow

This document follows the current runtime behavior from public input to return
value.

## `remember()`

```mermaid
flowchart TD
	A["Caller input"] --> B["Validate and normalize input"]
	B --> C{"Embed model configured?"}
	C -- Yes --> D["Generate embedding with AI SDK"]
	C -- No --> E["Skip embedding"]
	D --> F["Insert into memory_records"]
	E --> F
	F --> G["Return id + createdAt"]
```

Detailed flow:

1. reject malformed input early
2. default `metadata` to `{}`
3. default `priority` to `1`
4. default `source` to `"system"`
5. default `createdAt` to `now()`
6. set `updatedAt` to the same timestamp for the initial write
7. optionally embed `content`
8. insert into `memory_records`
9. return the inserted `id` and `createdAt`

## `context()`

```mermaid
flowchart TD
	A["Caller input"] --> B["Validate and normalize input"]
	B --> C["Compile MemoryWhere into SQL"]
	C --> D{"Text + embed model?"}
	D -- Yes --> E["Generate query embedding"]
	D -- No --> F["Skip semantic query embedding"]
	E --> G["Fetch semantic candidates"]
	F --> H["Fetch structural candidates"]
	C --> H
	G --> I["Merge candidates by id"]
	H --> I
	I --> J["Score, dedupe, and sort"]
	J --> K{"includeSummary?"}
	K -- Yes --> L["Fetch stored summary row"]
	K -- No --> M["Return ranked items"]
	L --> M
```

Detailed flow:

1. validate `where`, `text`, `limit`, and `includeSummary`
2. compile the metadata filter into deterministic JSONB SQL
3. fetch structural candidates from the metadata scope
4. if semantic retrieval is available, fetch semantic candidates from the same scope
5. merge both result sets by `id`
6. compute a final score per candidate
7. dedupe near-identical content conservatively
8. sort by score, then priority, then recency
9. apply `limit`
10. if requested, fetch one stored summary row from the same scope
11. return `{ items, summary? }`

## `forget()`

```mermaid
flowchart TD
	A["Caller input"] --> B["Validate id xor where"]
	B --> C{"Delete by id?"}
	C -- Yes --> D["Delete one row by opaque string id"]
	C -- No --> E["Compile where filter"]
	E --> F["Delete matching rows"]
	D --> G["Return deletedCount"]
	F --> G
```

Detailed flow:

1. reject malformed inputs early
2. enforce that exactly one of `id` or `where` is present
3. if `id` is provided, delete by opaque string id
4. if `where` is provided, compile the filter and delete the matching set
5. return `{ deletedCount }`
