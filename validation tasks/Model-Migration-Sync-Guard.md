# Model/Migration Sync Guard

Primary reference:
- https://alphaconsultings.mintlify.app

This guard locks the official ORM workflow into the package repo itself:

1. define models first
2. generate migrations with `eloquent make:migration`
3. apply migrations with `eloquent migrate:run`
4. rerun migration generation and expect no drift

Executable guard:
- `src/lab_test/model.migration.sync.logic.test.ts`

What the guard checks:
- the package fixture app models each expose a concrete `static tableName`
- SQLite app migration generation creates one matching create migration per model table
- generated migration files contain matching `CREATE TABLE IF NOT EXISTS` and `DROP TABLE IF EXISTS` statements for that table
- after the migrations are applied, rerunning `make:migration --all` does not create new files
- the rerun reports `No schema differences` for the fixture model tables
- the generic fallback helper name `create_pivot_table` is not accepted in the fixture app output

Why the guard uses SQLite:
- it is self-contained
- it is deterministic in CI
- it checks the model-first migration contract without requiring an external database server

Boundary:
- this guard is about model-to-migration sync for the package fixture app
- it does not replace the deeper schema diff, relational DDL, or connection-targeting suites that already cover PostgreSQL, MySQL, MongoDB, and helper migration behavior
