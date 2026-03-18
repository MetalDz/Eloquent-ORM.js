# Release Summary

Date: 2026-03-06

## Scope
This release consolidates hardening work across ORM hooks, factory concurrency, migration safety, migration execution robustness, connection initialization races, schema SQL default escaping, and production dependency security remediation.

## What Changed

### Hook access control and model registration
- Added guarded internal hook infrastructure (`ModelRegistry`, `HookStore`).
- Refactored hook flow to enforce registry checks with strict and lazy registration modes.
- Added public registration APIs (`registerModels`, strict mode controls) and exported them from package root.
- Added deprecation warnings for legacy hook APIs and migration documentation.

### Factory createMany concurrency behavior
- `Factory.createMany(count, callback, concurrency > 1)` now fails fast on first worker/callback error.
- Prevented partial/sparse success resolution after failures.
- Preserved deterministic result ordering on successful runs.

### makeModel update rollback safety
- `make:model --with-migration` now generates non-destructive `down()` for `update_*` migrations.
- Uses inverse rollback SQL from schema diff where available.
- Falls back to explicit no-op rollback comment when rollback SQL is unavailable.

### migrateRun empty migration detection
- Replaced brittle source-text "empty migration" heuristic with runtime detection.
- Migration is considered non-empty only when `up()` executes at least one non-empty `db.query(...)` call.
- Prevents false skips for variable-SQL migration implementations.

### ConnectionFactory cold-start race protection
- Added in-flight promise deduplication for `getConnection()` and `getAdapter()`.
- Prevented duplicate initializations during concurrent cold starts.
- Added retry-safe cleanup path after initialization failures.
- Ensured `closeAllConnections()` also waits in-flight adapter initialization before closing/clearing caches.

### SchemaBuilder default-string escaping
- Hardened SQL default rendering to safely escape string literals.
- Single quotes in defaults are now escaped correctly for generated SQL.

### SQLite dependency audit remediation
- Replaced the runtime SQLite driver with `better-sqlite3@12.2.0`.
- Removed `sqlite3` and `sqlite` from production dependencies.
- Added a compatibility wrapper so the ORM keeps the same SQLite adapter contract.
- Updated tarball smoke coverage and readiness tracking for the new driver.

## Test Evidence (Current)
- `npm.cmd run typecheck` -> passed.
- `npm.cmd run build` -> passed.
- `npm.cmd audit --omit=dev --audit-level=high` -> passed (`found 0 vulnerabilities`).
- `npm.cmd test -- --runTestsByPath src/lab_test/sqlite.driver.replacement.logic.test.ts src/lab_test/dependency.audit.tracking.logic.test.ts src/lab_test/production.readiness.gates.logic.test.ts` -> passed (`3/3` suites, `7/7` tests).
- `npm run test:pack-smoke` -> passed.
- `npm run test:critical` -> passed (`7/7` suites, `66/66` tests).
- `npm.cmd test` -> passed (`29` passed suites, `3` skipped suites; `123` passed tests, `72` skipped tests in latest run).
- CLI command checks passed:
  - `npm.cmd run cli -- --help`
  - `npm.cmd run cli -- make:model --help`
  - `npm.cmd run cli -- migrate:run --help`
- CLI-focused tests passed:
  - `npm.cmd test -- --runTestsByPath src/lab_test/cli.commands.help.test.ts src/lab_test/cli.remaining.todo.test.ts` (`1` passed, `1` skipped)
- Connection race regression tests passed:
  - `npm.cmd test -- --runTestsByPath src/lab_test/connection.factory.race.logic.test.ts src/lab_test/connection.factory.alias.lifecycle.logic.test.ts src/lab_test/mongo.connection.lifecycle.logic.test.ts` (`3` passed)
- Added dedicated regression test files:
  - `src/lab_test/factory.createMany.concurrency.logic.test.ts`
  - `src/lab_test/make.model.rollback.logic.test.ts`
  - `src/lab_test/migrate.run.empty.detection.logic.test.ts`
  - `src/lab_test/connection.factory.race.logic.test.ts`
  - `src/lab_test/schema.default.string.escape.logic.test.ts`
  - `src/lab_test/sqlite.driver.replacement.logic.test.ts`

## Review Result
- Focused code review pass completed on the hardening changes.
- One race edge was identified in `ConnectionFactory.closeAllConnections()` (in-flight adapter init wait) and fixed.
- No remaining blocking findings in the reviewed scope.

## Tracking
- All task trackers under `validation tasks/` are marked complete.
- `validation tasks/Assumptions.md` reports no locked items.
