# Mixed Seeder Filtering Plan

## Goal
Prevent `db:seed --mongo` and `db:seed --sql` from executing seeders that mix SQL and Mongo factories/models.

## Scope
- Add explicit `mixed` artifact classification.
- Keep `unknown` as a permissive fallback for legacy/no-import seeders.
- Ensure mixed seeders are skipped for targeted storage runs.

## Acceptance
- A seeder importing both SQL and Mongo factories resolves to `mixed`.
- `matchesTargetStorageKind("mixed", "mongo")` and `matchesTargetStorageKind("mixed", "sql")` both return `false`.
- `db:seed --mongo` prints that no compatible seeders were found instead of executing a mixed seeder.
