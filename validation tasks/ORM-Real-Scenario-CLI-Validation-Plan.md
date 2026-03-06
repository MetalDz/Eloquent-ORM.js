# ORM Real Scenario CLI Validation Plan

## Goal
Validate the ORM in real workflow conditions using CLI commands across all SQL drivers:
- MySQL
- PostgreSQL
- SQLite

Coverage target:
- Migration generation and execution
- Seeding and seed:fresh flows
- Rollback, fresh, reset safety
- Single-driver flags and `--all-connections`
- Test mode and app mode variants

## Scope
- `src/lab_test/orm.real.scenario.cli.phases.test.ts`
- CLI commands under `src/cli/`

## Phase Execution Model
This suite is phase-gated so you can validate stage-by-stage.

Run one phase:
```powershell
$env:ELOQUENT_VALIDATION_PHASE="1"
npm.cmd test -- --runTestsByPath src/lab_test/orm.real.scenario.cli.phases.test.ts
```

Run all phases:
```powershell
Remove-Item Env:ELOQUENT_VALIDATION_PHASE -ErrorAction SilentlyContinue
npm.cmd test -- --runTestsByPath src/lab_test/orm.real.scenario.cli.phases.test.ts
```

Required once before running phases:
```powershell
npm.cmd run build
```

## Work Plan

### Phase 1: Scenario Scaffolding + Migration Generation
- [x] `make:scenario` app mode fails closed without `--test` (expected security behavior).
- [x] `make:scenario` test mode with: `--test --preset --controllers --services --force`
- [x] Build app baseline fixtures: `make:model User --attrs-from-schema --force`, `make:factory UserFactory --model User --force`, `make:seed User --count 10`
- [x] `make:migration all --all --all-connections --pivot-separate`
- [x] `make:migration all --test --all --all-connections --pivot-separate`

### Phase 2: App Driver Lifecycle
- [x] MySQL: `migrate:run -> db:seed -> migrate:status` with `--mysql`
- [x] PostgreSQL: `migrate:run -> db:seed -> migrate:status` with `--pg`
- [x] SQLite: `migrate:run -> db:seed -> migrate:status` with `--sqlite`

### Phase 3: Test Driver Lifecycle
- [x] MySQL test flow via `--test --mysql`
- [x] PostgreSQL test flow via `migrate:run:test --pg`
- [x] SQLite test flow via `migrate:run:test --sqlite`
- [x] Seed verification with `db:seed --test --class BlogScenarioSeeder`

### Phase 4: Rollback + Re-apply
- [x] App mode: each driver rollback with `--step 1` then rerun migrations
- [x] Test mode: each driver rollback with `--test --step 1` then rerun migrations

### Phase 5: Fresh / Reset / All-Connections
- [x] App all-connections: `migrate:run`, `db:seed`, `db:seed:fresh`, `migrate:reset`
- [x] Test all-connections: `migrate:run:test`, `db:seed`, `db:seed:fresh`, `migrate:reset`
- [x] SQLite safety path: `migrate:fresh --force`, `db:seed:fresh --force`, `migrate:reset` in app and test modes

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Added phased validation test file `src/lab_test/orm.real.scenario.cli.phases.test.ts`.
- `2026-03-06`: Phase gating implemented with `ELOQUENT_VALIDATION_PHASE` (`1..5` or `all`).
- `2026-03-06`: Phase 1 executed from CLI in task order.
- `2026-03-06`: Observed and locked expected fail-closed behavior: `make:scenario` requires `--test`.
- `2026-03-06`: Phase 1 checklist completed with app baseline fixtures + app/test all-connections migration generation.
- `2026-03-06`: Phase 2 executed.
- `2026-03-06`: SQLite app lifecycle passed (`migrate:run`, `db:seed --class UserSeeder`, `migrate:status`).
- `2026-03-06`: PostgreSQL app lifecycle passed (`migrate:run`, `db:seed --class UserSeeder`, `migrate:status`).
- `2026-03-06`: Initial MySQL run failed due missing database (`Unknown database 'eloquentjs'`).
- `2026-03-06`: Created MySQL databases from `.env` (`eloquentjs`, `db_test`) and reran Phase 2 MySQL lifecycle successfully.
- `2026-03-06`: Ran `migrate:fresh --all-connections --all-migrations --force` and `migrate:fresh --test --all-connections --all-migrations --force`.
- `2026-03-06`: Re-executed Phase 2 with current app seeder (`BlogScenarioSeeder`) and all drivers passed.
- `2026-03-06`: Phase 3 executed successfully across `mysql_test`, `pg_test`, and `sqlite_test`.
- `2026-03-06`: Added append-only migration generation hardening (no auto-delete of generated model/pivot migrations) to keep App/Test migration tracking stable across multi-driver runs.
- `2026-03-06`: Phase 4 executed via direct CLI command sequence (app + test across mysql/pg/sqlite); all rollback/rerun steps passed.
- `2026-03-06`: Phase 5 initial run exposed legacy migration fixture gap (`update_posts` without baseline `create_posts`) in mysql/mysql_test and non-existing `UserSeeder` usage.
- `2026-03-06`: Recovered missing mysql/mysql_test baseline create migrations and added migration-tree integrity regression test.
- `2026-03-06`: Phase 5 commands validated end-to-end with `BlogScenarioSeeder`; all required flows now pass (with clean bootstrap where needed).

## Phase 1 Evidence
- `make:scenario app fails closed` -> exit `1` (expected), message matched `test-only`.
- `make:scenario test` -> exit `0`.
- `make:model app baseline` -> exit `0`.
- `make:factory app baseline` -> exit `0`.
- `make:seed app baseline` -> exit `0`.
- `make:migration app all-connections` -> exit `0`.
- `make:migration test all-connections` -> exit `0`.

## Phase 2 Evidence
- `mysql migrate:run --mysql --all-migrations --pivot-separate` -> exit `0`.
- `mysql db:seed --mysql --class BlogScenarioSeeder` -> exit `0`.
- `mysql migrate:status --mysql --all-migrations` -> exit `0`.
- `pg migrate:run --pg --all-migrations --pivot-separate` -> exit `0`.
- `pg db:seed --pg --class BlogScenarioSeeder` -> exit `0`.
- `pg migrate:status --pg --all-migrations` -> exit `0`.
- `sqlite migrate:run --sqlite --all-migrations --pivot-separate` -> exit `0`.
- `sqlite db:seed --sqlite --class BlogScenarioSeeder` -> exit `0`.
- `sqlite migrate:status --sqlite --all-migrations` -> exit `0`.

## Phase 3 Evidence
- `mysql_test migrate:run --test --mysql --all-migrations --pivot-separate` -> exit `0`.
- `mysql_test db:seed --test --mysql --class BlogScenarioSeeder` -> exit `0`.
- `mysql_test migrate:status --test --mysql --all-migrations` -> exit `0`.
- `pg_test migrate:run:test --pg --all-migrations --pivot-separate` -> exit `0`.
- `pg_test db:seed --test --pg --class BlogScenarioSeeder` -> exit `0`.
- `pg_test migrate:status --test --pg --all-migrations` -> exit `0`.
- `sqlite_test migrate:run:test --sqlite --all-migrations --pivot-separate` -> exit `0`.
- `sqlite_test db:seed --test --sqlite --class BlogScenarioSeeder` -> exit `0`.
- `sqlite_test migrate:status --test --sqlite --all-migrations` -> exit `0`.

## Phase 4 Evidence
- `app mysql`: `migrate:rollback --mysql --step 1` -> exit `0`; `migrate:run --mysql --all-migrations` -> exit `0`.
- `app pg`: `migrate:rollback --pg --step 1` -> exit `0`; `migrate:run --pg --all-migrations` -> exit `0`.
- `app sqlite`: `migrate:rollback --sqlite --step 1` -> exit `0`; `migrate:run --sqlite --all-migrations` -> exit `0`.
- `test mysql`: `migrate:rollback --test --mysql --step 1` -> exit `0`; `migrate:run --test --mysql --all-migrations` -> exit `0`.
- `test pg`: `migrate:rollback --test --pg --step 1` -> exit `0`; `migrate:run:test --pg --all-migrations` -> exit `0`.
- `test sqlite`: `migrate:rollback --test --sqlite --step 1` -> exit `0`; `migrate:run:test --sqlite --all-migrations` -> exit `0`.
- Notes:
  - Legacy orphan warnings still appear for old already-deleted generated files from pre-hardening runs.
  - New append-only behavior prevents creating additional orphaned rows going forward.

## Phase 5 Evidence
- `app all-connections`:
  - `migrate:run --all-connections --all-migrations --pivot-separate` -> exit `0`
  - `db:seed --all-connections --class BlogScenarioSeeder` -> exit `0` (validated after clean bootstrap)
  - `db:seed:fresh --all-connections --class BlogScenarioSeeder --force` -> exit `0`
  - `migrate:reset --all-connections` -> exit `0`
- `test all-connections`:
  - `migrate:run:test --all-connections --all-migrations --pivot-separate` -> exit `0`
  - `db:seed --test --all-connections --class BlogScenarioSeeder` -> exit `0` (validated after clean bootstrap)
  - `db:seed:fresh --test --all-connections --class BlogScenarioSeeder --force` -> exit `0`
  - `migrate:reset --test --all-connections` -> exit `0`
- `sqlite safety path`:
  - `migrate:fresh --sqlite --all-migrations --force` -> exit `0`
  - `db:seed:fresh --sqlite --class BlogScenarioSeeder --force` -> exit `0`
  - `migrate:reset --sqlite` -> exit `0`
  - `migrate:fresh --test --sqlite --all-migrations --force` -> exit `0`
  - `db:seed:fresh --test --sqlite --class BlogScenarioSeeder --force` -> exit `0`
  - `migrate:reset --test --sqlite` -> exit `0`

## Notes
- Driver-specific tests are conditionally skipped when required DB env variables are missing.
- The suite requires built CLI output (`dist/cli/eloquent.js`).
- In restricted sandboxes where child process spawning is blocked, execution is skipped by design.
