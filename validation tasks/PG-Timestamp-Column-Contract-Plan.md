# PG Timestamp Column Contract Plan

## Goal

Stop forcing app projects to manually patch PostgreSQL create migrations just to get timezone-aware business timestamps and non-destructive nullable timestamp defaults.

## Clean contract

- keep `static schema` as the source of truth for timestamp columns
- keep existing `column("timestamp")` behavior compatible by default
- add explicit timestamp options instead of silently changing legacy semantics

## Public rule

- use `useTz: true` when PostgreSQL must emit `TIMESTAMPTZ`
- use `defaultNow: false` for business timestamps that must stay empty until app logic sets them
- `column("softDeletes")` must never default to the current time

## Examples

```ts
created_at: column("timestamp", undefined, { useTz: true })
updated_at: column("timestamp", undefined, { useTz: true })
read_at: column("timestamp", undefined, { useTz: true, defaultNow: false })
expires_at: column("timestamp", undefined, { useTz: true, defaultNow: false })
deleted_at: column("softDeletes", undefined, { useTz: true })
```

## Validation

- unit tests lock the SQL emitted for PostgreSQL, MySQL, and SQLite timestamp columns
- docs tests lock the official wording for `useTz`, `defaultNow`, and soft-delete timestamp behavior
