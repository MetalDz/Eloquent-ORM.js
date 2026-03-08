# United-tasks.md **allDons**
Updated: 2026-03-07/15:31

## Done

- [x] Seed/CLI shutdown stability (core behavior)
  - `db:seed` now closes connections in finalizer only (no in-loop double close).
  - CLI process exit remains CLI-only (`ELOQUENT_CLI === "true"`).
- [x] Schema-driven migration generation
  - `belongsTo` relation emits FK-aware schema changes.
  - `morphTo` emits `<morphName>_id` + `<morphName>_type`.
  - `belongsToMany` emits pivot table migrations.
- [x] CLI runtime correctness (main path)
  - TS runtime loading/fallback is implemented.
  - Explicit runtime enabled log now appears when ts-node runtime is activated.
- [x] Safety checks
  - `db:seed:fresh` supports `--force` and keeps interactive prompt behavior when not forced.
- [x] Consistency
  - `demo:scenario` supports manual (`--user <id>`) and random (`--random`) selection.
- [x] Scenario automation
  - `make:scenario ... --test` auto-generates models, migrations, factories, and seeds.
- [x] Attr inference
  - `make:model <Name> --attrs-from-schema` is implemented.
- [x] Test option strategy (mostly unified)
  - `--test` is standardized across generator/migration/seed commands.
- [x] SQLite driver migration
  - Runtime moved from `sqlite3` to `better-sqlite3` and connection path is updated.
- [x] Seed command noise/hook controls
  - `db:seed` now supports `--silent` and `--no-hooks`.
  - `db:seed:fresh` now supports `--silent` and `--no-hooks`.
  - Hook-disable path is wired through runtime via `ELOQUENT_DISABLE_MODEL_HOOKS`.
- [x] Template cleanup standardization
  - Defined clean-template contract (ASCII-only, tab-free, no trailing spaces, newline-terminated).
  - Cleaned template files under `src/cli/templates`.
  - Added enforcement test: `src/lab_test/template.cleanliness.logic.test.ts`.

## Partial / Decision Needed

- [x] Test option naming final decision
  - Decision: standardize on `migrate:run --test` only.
  - Legacy alias command `migrate:run:test` removed from CLI surface.

## Left

- [x] No open implementation tasks in this file.

## Useful scenario commands

- `eloquent make:scenario blog --test`
- `eloquent make:scenario anything --test --preset media`
- `eloquent make:scenario run1 --test --run`
- `eloquent make:scenario blog --test --controllers --services`
