# Migration Append-Only Tracking Hardening Plan

## Goal
Make migration generation safer for App/Test multi-driver usage by preserving generated migration files (append-only) so migration tracking does not lose applied file references.

## Problem Summary
- `make:migration` replaced older `create_*`/`update_*` files.
- When replaced files had already been applied, migration tracker could not find them on disk.
- In multi-driver flows (`--all-connections`, app + test), this produced noisy orphan tracking and reduced clarity.

## Scope
- `src/cli/commands/makeMigration.ts`
- `src/lab_test/make.migration.fk.logic.test.ts`
- `src/lab_test/make.migration.append.only.logic.test.ts`
- `validation tasks/ORM-Real-Scenario-CLI-Validation-Plan.md`

## Work Plan

### Phase 1: Generator Behavior
- [x] Stop deleting existing `create_*`/`update_*` migrations for model tables.
- [x] Keep append-only generation and skip only when body is unchanged.
- [x] Apply same preservation rule to pivot migrations.

### Phase 2: Regression Coverage
- [x] Update FK migration expectations to keep baseline `create_*` files.
- [x] Add dedicated append-only regression test file.
- [x] Assert rerun behavior does not duplicate unchanged updates.

### Phase 3: Validation + Real Scenario Notes
- [x] Run targeted tests for make:migration behavior.
- [x] Document evidence and connect outcome to real-scenario Phase 4 readiness.

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Implemented append-only make:migration behavior for model and pivot files.
- `2026-03-06`: Updated FK migration tests and added append-only regression test file.
- `2026-03-06`: Targeted test run passed for migration generator + tracker validation paths.
- `2026-03-06`: Added guard to prevent CREATE regeneration when baseline `create_*` already exists, plus regression coverage.

## Evidence
- Command:
  - `npm.cmd test -- --runTestsByPath src/lab_test/make.migration.fk.logic.test.ts src/lab_test/make.migration.append.only.logic.test.ts src/lab_test/migration.tracker.logic.test.ts`
- Result:
  - `PASS src/lab_test/make.migration.fk.logic.test.ts`
  - `PASS src/lab_test/make.migration.append.only.logic.test.ts`
  - `PASS src/lab_test/migration.tracker.logic.test.ts`
- Verification points:
  - Existing `create_*` model migrations are preserved when `update_*` is generated.
  - Existing `update_*` history is preserved; new update appends when body differs.
  - Regeneration with unchanged SQL body does not create duplicate update files.
  - Migration tracker orphan-handling tests still pass.
