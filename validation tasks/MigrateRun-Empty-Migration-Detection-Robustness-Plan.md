# migrateRun Empty-Migration Detection Robustness Plan

## Goal
Prevent valid migrations from being skipped by brittle source-text checks in `migrateRun`, while still skipping true no-op migrations.

## Problem Summary
Current behavior detects "empty" migrations by scanning migration file text for a narrow `await db.query(\`...\`)` pattern. This can incorrectly skip valid migrations that execute SQL via variables or equivalent forms.

## Scope
- `src/cli/commands/migrateRun.ts`
- Dedicated regression tests for empty-detection behavior

## Work Plan

### Phase 1: Reproduce and Lock with Tests
- [x] Add dedicated tests for variable-SQL `db.query` usage.
- [x] Add dedicated tests for true no-op migrations.

### Phase 2: Runtime Detection Refactor
- [x] Remove brittle file-content regex empty checks.
- [x] Detect emptiness by tracking actual non-empty `db.query` calls during `up()`.
- [x] Keep existing no-op skip semantics for migrations that execute zero SQL statements.

### Phase 3: Validation
- [x] Run targeted migration-run tests.
- [x] Run `npm.cmd run typecheck`.
- [x] Run full `npm.cmd test`.

### Phase 4: Tracking and Notes
- [x] Update status board (`Assumptions.md`).
- [x] Add release note to `CHANGELOG.md`.

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Runtime detection implemented in `migrateRun` (query-execution tracking).
- `2026-03-06`: Dedicated regression test file added (`migrate.run.empty.detection.logic.test.ts`).
- `2026-03-06`: Targeted tests passed (`migrate.run.empty.detection.logic.test.ts`, `migrate.run.logic.test.ts`).
- `2026-03-06`: `npm.cmd run typecheck` passed.
- `2026-03-06`: Full suite passed (`27 passed`, `3 skipped` suites).

## Exit Criteria
- Valid migrations using variable SQL are not skipped.
- True no-op migrations are skipped.
- Typecheck and full test suite pass.
